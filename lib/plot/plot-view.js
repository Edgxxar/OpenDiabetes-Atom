'use babel';

/** @jsx etch.dom */

import cp from 'child_process';
import etch from 'etch';
import fs from 'fs-extra';
import md5 from 'md5-file/promise';
import path from 'path';
import slash from 'slash';
import uuid from 'uuid/v4';
import util from '../util';
import cache from '../tag-cache';
import Toolbar from './toolbar';
import Canvas from './canvas';
import SliceLabel from "./slice-label";

const pdf = require('pdfjs-dist');

export default class PlotView {
  /**
   * Current status of this plot. Either idle, export or generate
   */
  status = 'idle';
  /**
   * The process currently generating plots, if in status generate
   */
  process = null;

  toolbar = null;
  canvas = null;
  slices = null;

  constructor(serialized) {
    if (serialized != null && typeof (serialized) == 'object') {
      this.id = serialized.id;
      this.toolbar = serialized.toolbar;
      this.canvas = serialized.canvas;
      this.slices = serialized.slices;
    } else if (serialized != null && typeof (serialized) == 'string') {
      this.id = id;
    } else {
      // create random id for this view
      this.id = uuid();
    }

    pdf.GlobalWorkerOptions.workerSrc = path.resolve(util.getModulePath(), '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.js');

    etch.initialize(this);
    this.checkSliceExists().then(exists => {
      if (exists)
        this.refs.slices.loadCurrentSlice();
    });
  }

  render() {
    return (
      <div>
        <Toolbar ref="toolbar" serialized={this.toolbar} plot={this}/>
        <Canvas ref="canvas" serialized={this.canvas}/>
        <SliceLabel ref="slices" serialized={this.slices} plot={this}/>
      </div>
    );
  }

  setCanvas(url) {
    if (!this.refs.canvas)
      return;
    if (url) {
      this.refs.canvas.renderPdf(url);
    } else {
      this.refs.canvas.clearPdf();
    }
    this.refs.slices.loadCurrentSlice();
  }

  /**
   * Exports data for the given tag
   * @returns {Promise<string>}
   */
  exportData() {
    if (this.status !== 'idle') {
      throw new Error(`Cannot export tag while in status ${this.status}!`);
    }
    const toolbar = this.refs.toolbar;
    this.status = 'export';
    toolbar.updateProgress(-1, 'Exporting data...');

    const tag = this.getTag();

    // export
    let xprt;
    if (tag) {
      xprt = util.executeCli('exporttagged', {
        type: 'ODV_CSV',
        tag: tag
      });
    } else {
      xprt = util.executeCli('export', {
        type: 'ODV_CSV'
      });
    }
    return xprt.then(result => {
      let file = result.match(/Export data to file: (.+\.csv)/);
      if (!Array.isArray(file) || file.length < 2 || !file[1]) {
        atom.notifications.addError('Export unsuccessful!', {
          detail: result
        });
        toolbar.stopProgress();
        this.status = 'idle';
        return Promise.reject('SIGTERM');
      }
      file = path.join(util.getProjectPath(), 'export', file[1]);

      let slice = result.match(/Export slice information to file: (.+\.csv)/);
      if (!Array.isArray(slice) || slice.length < 2 || !file[1]) {
        slice = null;
      } else slice = path.join(util.getProjectPath(), 'export', slice[1]);

      // generate hash for file
      return md5(file).then(hash => {
        cache.setTagCache(tag, hash);
        if (this.status !== 'export')
          return Promise.reject('SIGTERM');

        // generate directory
        const dir = path.join(util.getProjectPath(), 'plots', hash);
        return fs.mkdirs(dir).then(() => {
          // move data
          const newFile = path.join(dir, 'data.csv');
          return fs.move(file, newFile, {overwrite: true}).then(() => {
            this.refs.toolbar.setDir(dir);

            // move slices
            if (slice != null) {
              const newSlice = path.join(dir, 'slices.csv');
              return fs.move(slice, newSlice, {overwrite: true}).then(() => {
                return this.refs.slices.loadSlices();
              });
            } else return Promise.resolve();
          });
        });
      });
    }).catch(result => {
      atom.notifications.addError('Exception while trying to export!', {
        detail: result,
        dismissable: true
      });
      toolbar.stopProgress();
      this.status = 'idle';
    });
  }

  /**
   * Generates plot for the exported file.
   */
  generatePlots() {
    if (this.status !== 'export' && this.status !== 'idle') {
      throw new Error(`Cannot export tag while in status ${this.status}!`);
    }
    const toolbar = this.refs.toolbar;

    this.checkDataExists().then(exists => {
      // check that data exists
      if (!exists) {
        atom.notifications.addError('No data file found!', {
          detail: this.getDataPath(),
          dismissable: true
        });
        return;
      }
      const dir = this.getDir();
      const file = this.getDataPath();

      // generate plots
      this.status = 'generate';
      toolbar.updateProgress(-1, 'Generating plots...');

      new Promise((resolve, reject) => {
        this.checkSliceExists().then(exists => {
          const slice = exists ? this.getSlicePath() : null;
          if (slice == null && this.refs.toolbar.getViewSize() !== 'daily') {
            reject('No slice file for view size ' + this.refs.toolbar.getViewSize() + ' found.');
            return;
          }

          if (atom.config.get('open-diabetes-filter.docker')) {
            // execute with docker

            const cmd = util.buildCommand('plot-' + this.refs.toolbar.getViewSize(), {
              python: 'python',
              plot: '/tmp/plotteria/plot.py',
              config: '/tmp/plotteria/config.ini',
              // construct container path to file
              file: path.posix.join('/mnt/project', slash(util.getRelativeProjectPath(file))),
              // construct container path to slice
              slice: slice ? path.posix.join('/mnt/project', slash(util.getRelativeProjectPath(slice))) : '',
              // construct container path to output directory
              out: path.posix.join('/mnt/project', slash(util.getRelativeProjectPath(dir)))
            });

            console.debug(`Executing command on docker: ${cmd}`);
            const docker = util.getDocker();
            docker.run('plotteria', util.splitCommandArgs(cmd), process.stdout, {
              HostConfig: {
                Binds: [
                  util.getProjectPath() + ':/mnt/project'
                ],
                AutoRemove: atom.config.get('open-diabetes-filter.docker-cleanup')
              }
            }, {}, (err, data, container) => {
              if (this.status === 'generate') {
                // if status is still generate this was a crash, otherwise the process was cancelled
                if (data && data.StatusCode === 0)
                  resolve();
                else reject(data ? data.StatusCode : err);
              } else reject('SIGTERM');
            }).on('container', container => {
              if (this.status === 'generate') {
                this.process = container;
              } else {
                container.kill().then(() => reject('SIGTERM'))
              }
            });
            toolbar.watchFiles();

          } else {
            // execute on system
            let config;
            if (atom.config.get('open-diabetes-filter.plot-config-native'))
              config = path.resolve(util.getModulePath(), '..', 'bin', 'plotteria', 'config.ini');
            else config = atom.config.get('open-diabetes-filter.plot-config');
            const cmd = util.buildCommand('plot-' + this.refs.toolbar.getViewSize(), {
              python: atom.config.get('open-diabetes-filter.paths.python'),
              plot: util.getPlot(),
              config: config,
              file: file,
              slice: slice ? slice : '',
              out: dir
            });

            console.debug(`Spawning child process: ${cmd}`);
            let args = util.splitCommandArgs(cmd);
            const exec = args.shift();
            args = Object.freeze(args);
            const process = cp.spawn(exec, args, {
              cwd: util.getProjectPath(),
              windowsHide: true
            });
            this.process = process;
            let stderr = '';
            process.stderr.on('data', data => stderr += data.toString());
            process.on('close', (code, signal) => {
              if (this.status === 'generate') {
                // if status is still generate this was a crash, otherwise the process was cancelled
                if (code === 0)
                  resolve();
                else reject(stderr);
              } else reject('SIGTERM');
            });
            toolbar.watchFiles();
          }
        });
        // Generation process promise end
      }).then(() => {
        toolbar.stopProgress();
        this.status = 'idle';
        this.process = null;
      }).catch(err => {
        if (err !== 'SIGTERM') {  // if not cancelled
          console.error(err);
          atom.notifications.addError('Error while generating plots!', {
            detail: err,
            dismissable: true
          });
        }
        toolbar.stopProgress();
        this.status = 'idle';
        this.process = null;
      });
    });
  }

  checkDirExists() {
    if (!this.getDir())
      return Promise.resolve(false);
    return fs.exists(this.getDir());
  }

  getDir() {
    return this.refs.toolbar.dir;
  }

  checkDataExists() {
    if (!this.getDir())
      return Promise.resolve(false);
    return fs.exists(this.getDataPath());
  }

  getDataPath() {
    return path.join(this.getDir(), 'data.csv');
  }

  checkSliceExists() {
    if (!this.getDir())
      return Promise.resolve(false);
    return fs.exists(this.getSlicePath());
  }

  getSlicePath() {
    return path.join(this.getDir(), 'slices.csv');
  }

  cancelPlots() {
    if (this.status === 'idle')
      throw new Error(`Cannot cancel plot generation while in status ${this.status}!`);

    if (this.process !== null && typeof this.process === 'object')
      this.process.kill();
    this.status = 'idle';
    this.process = null;
  }

  getTag() {
    return this.refs.toolbar.getTag();
  }

  update() {
    etch.update(this);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    const data = {
      deserializer: 'open-diabetes-filter/PlotView',
      id: this.id,
      toolbar: this.refs.toolbar.serialize(),
      canvas: this.refs.canvas.serialize(),
      slices: this.refs.slices.serialize()
    };
    //console.log(data);
    return data;
  }

  getTitle() {
    // Used by Atom for tab text
    return 'Plot View';
  }

  getURI() {
    // Used by Atom to identify the view when toggling.
    return 'atom://open-diabetes-plot/' + this.id;
  }
}
