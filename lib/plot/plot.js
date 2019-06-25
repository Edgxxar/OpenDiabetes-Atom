'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import path from 'path';
import cp from 'child_process';
import util from '../util';
import Toolbar from "./toolbar";
import Canvas from "./canvas";

export default class Plot {
  status = 'idle';
  process = null;

  constructor(properties) {
    this.tag = properties.tag;
    this.view = properties.view;

    etch.initialize(this);
  }

  render() {
    return (
      <div className="odf-plot">
        <Toolbar ref="toolbar" plot={this}/>
        <Canvas ref="canvas"/>
      </div>
    );
  }

  setCanvas(url) {
    this.refs.canvas.renderPdf(url);
  }

  updatePlots() {
    console.log("UPDATE");
    if (this.status === 'idle') {
      this.status = 'export';
      const toolbar = this.refs.toolbar;
      toolbar.updateProgress(-1, 'Exporting data...');

      const directory = path.join(util.getProjectPath(), 'plots', this.tag || 'ALL');

      // export data and prepare plot output dir
      Promise.all([
        util.executeCli('export', {   //TODO: export tagged
          'type': 'ODV_CSV'
        }, false),
        util.mkdir(directory)
      ])
      // generate plots
        .then(result => {
          this.status = 'generate';
          toolbar.updateProgress(-1, 'Generating plots...');

          let file = result[0].match(/Export to file: (.+_export\.csv)/);
          if (!Array.isArray(file) || file.length < 2) {
            //TODO: fail
            return;
          }
          file = path.join(util.getProjectPath(), 'export', file[1]);

          const plot = atom.config.get('open-diabetes-filter.plot');
          const cmd = atom.config.get('open-diabetes-filter.commands.plot')
            .replace('%plot%', plot)
            .replace('%file%', file)
            .replace('%out%', directory);
          const args = util.splitCommandArgs(cmd);
          const exec = args.shift();
          const process = cp.spawn(exec, Object.freeze(args), {
            cwd: util.getProjectPath(),
            windowsHide: true
          });
          process.stdout.on('data', chunk => console.log(chunk.toString('utf8')));
          process.stderr.on('data', chunk => console.error(chunk.toString('utf8')));
          process.on('close', (code, signal) => {
            console.log(`process finished with code ${code} and signal ${signal}`);
            toolbar.stopProgress();
          });
          this.process = process;
        });
    }
  }

  getTag() {
    return this.refs.toolbar.getTag();
  }

  destroy() {
    etch.destroy(this);
  }

  update() {
    etch.update(this);
  }
}
