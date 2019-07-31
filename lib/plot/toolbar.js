'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import fs from 'fs-extra';
import path from 'path';
import uuidv4 from 'uuid/v4';
import {watchPath} from 'atom';
import util from '../util';
import cache from '../tag-cache';
import LabelModal from './label-modal';
import TagInput from "../tag-input";

export default class Toolbar {
  inProgress = false;
  progress = -1;
  progressMessage = '';
  currentPage = 0;
  view = 'daily';

  pageInput = false;

  pdfs = [];
  allPdfs = [];
  watcher = null;

  constructor(properties) {
    this.id = uuidv4(); // unique id for html attributes, multiple plots are in the DOM at the same time
    this.plot = properties.plot;
    if (properties.serialized != null) {
      this.tag = properties.serialized.tag;
      this.dir = properties.serialized.dir;
      this.currentPage = properties.serialized.currentPage;
      this.view = properties.serialized.view;
    }

    etch.initialize(this);
    if (this.dir != null)
      this.updatePdfs();
    else this.clearCurrentPdfs();

    this.refs.tag.onupdate = (tag) => {
      if (cache.hasTagCached(tag)) {
        this.setDir(path.join(util.getProjectPath(), 'plots', cache.getTagCache(tag)));
        this.watchFiles();
      } else this.clearCurrentPdfs();
    };
  }

  render() {
    return (
      <div className="odf-toolbar block">
        <TagInput ref="tag" value={this.tag} title="Choose tag for export, leave empty for all data" disabled={this.inProgress}/>
        <div className="btn-group inline-block">
          <button className="btn btn-info" on={{click: this.prev}} title="Previous plot"><span className="icon-jump-left"/></button>
          {
            this.pageInput ?
              <div className="btn btn-info btn-dummy native-key-bindings">
                <input className="input-number input-page" type="number" min={1} max={this.pdfs.length} value={this.currentPage}
                       on={{keyup: this.closePageInput, blur: this.tryClosePageInput}} ref="pageInput"/> / {this.pdfs.length}
              </div> :
              <button className="btn btn-info" on={{click: this.openPageInput}}>{this.currentPage} / {this.pdfs.length}</button>
          }
          <button className="btn btn-info" on={{click: this.next}} title="Next plot"><span className="icon-jump-right"/></button>
        </div>
        <div className="btn-group inline-block">
          <button className="btn icon icon-plus" on={{click: this.zoomIn}} title="Zoom In"/>
          <button className="btn icon icon-dash" on={{click: this.zoomOut}} title="Zoom Out"/>
        </div>
        <div className="btn-group inline-block">
          <button className={'btn icon icon-versions' + (this.view === 'daily' ? ' selected' : '')}
                  on={{click: this.setViewAll}} title="Daily Plots"/>
          <button className={'btn icon-xs icon-text-size' + (this.view === 'tiny' ? ' selected' : '')}
                  on={{click: this.setViewTiny}} title="Tiny Slices"/>
          <button className={'btn icon-s icon-text-size' + (this.view === 'normal' ? ' selected' : '')}
                  on={{click: this.setViewNormal}} title="Normal Slices"/>
          <button className={'btn icon-m icon-text-size' + (this.view === 'big' ? ' selected' : '')}
                  on={{click: this.setViewBig}} title="Big Slices"/>
        </div>
        <button className="btn btn-warning icon icon-checklist inline-block" on={{click: this.label}} title="Label Current Slice"
                disabled={this.view === 'daily' || this.pdfs.length === 0}/>
        <div className="btn-group inline-block">
          <button className="btn btn-success icon icon-repo-sync" on={{click: this.updateBtn}} disabled={this.inProgress}
                  title="Generate plots for the currently selected tag"/>
          <button className="btn btn-error icon icon-primitive-square" on={{click: this.cancelBtn}} disabled={!this.inProgress}
                  title="Cancel plot generation"/>
          <button className="btn btn-error icon icon-trashcan" on={{click: this.deleteBtn}}
                  disabled={this.inProgress || this.dir == null || this.pdfs.length === 0} title="Delete all generated plots for this tag"/>
        </div>
        <div style={this.inProgress ? 'display: inline' : 'display: none'}>
          {
            this.progress < 0 ?
              <progress className="inline-block"/> :
              <progress className="inline-block" max="100" value={this.progress}/>
          }
          <span className="inline-block">{this.progressMessage}</span>
        </div>
      </div>
    );
  }

  updateProgress(progress, message) {
    this.progress = progress;
    this.progressMessage = message;
    etch.update(this);
  }

  next() {
    if (this.currentPage < this.pdfs.length) {
      this.currentPage++;
      this.renderCurrentPdf();
      etch.update(this);
    }
  }

  prev() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderCurrentPdf();
      etch.update(this);
    }
  }

  openPageInput() {
    this.pageInput = true;
    etch.update(this).then(() => this.refs.pageInput.focus());
  }

  closePageInput(event) {
    if (!this.pageInput)
      return;
    if (event.key !== 'Enter')
      return;

    let number = event.target.value;
    if (isNaN(number))
      return;

    number = parseInt(number);
    if (number >= 1 && number <= this.pdfs.length) {
      this.pageInput = false;
      this.currentPage = number;
      this.renderCurrentPdf();
      etch.update(this);
    }
  }

  tryClosePageInput(event) {
    if (!this.pageInput)
      return;
    let number = event.target.value;
    if (isNaN(number))
      return;

    number = parseInt(number);
    if (number >= 1 && number <= this.pdfs.length) {
      this.pageInput = false;
      this.currentPage = number;
      this.renderCurrentPdf();
      etch.update(this);
    } else {
      this.pageInput = false;
      etch.update(this);
    }
  }

  zoomIn() {
    this.plot.refs.canvas.scale += 0.1;
    this.renderCurrentPdf();
  }

  zoomOut() {
    this.plot.refs.canvas.scale -= 0.1;
    this.renderCurrentPdf();
  }

  setViewAll() {
    this.setViewSize('daily');
  }

  setViewTiny() {
    this.setViewSize('tiny');
  }

  setViewNormal() {
    this.setViewSize('normal');
  }

  setViewBig() {
    this.setViewSize('big');
  }

  setViewSize(size) {
    const update = this.view !== size;
    this.view = size;
    if (update)
      this.updatePdfs(true);
    etch.update(this);
  }

  getViewSize() {
    return this.view;
  }

  label() {
    new LabelModal(this.plot, this.pdfs[this.currentPage - 1]);
  }

  updateBtn() {
    if (this.inProgress)
      return;

    this.inProgress = true;
    this.refs.tag.setDisabled(true);
    etch.update(this);

    new Promise(resolve => {
      this.plot.checkDataExists()
        .then(exists => resolve(exists))
        .catch(() => resolve(false))
    }).then(exists => {
      // if data does not exist, export it first
      if (!exists)
        return this.plot.exportData();
      else return Promise.resolve();
    }).then(() => {
      // generate plots
      this.plot.generatePlots();
    });
  }

  cancelBtn() {
    if (!this.inProgress)
      return;

    this.inProgress = false;
    this.refs.tag.setDisabled(false);
    etch.update(this);
    this.plot.cancelPlots();
    this.stopWatchFiles();
  }

  deleteBtn() {
    if (this.inProgress)
      return;

    atom.confirm({
      message: 'Delete plots?',
      buttons: [
        'Delete Current View (' + this.pdfs.length + ')',
        'Delete All Plots (' + this.allPdfs.length + ')',
        'Delete All Plots And Exported Data',
        'Cancel',
      ],
      defaultId: 3,
      type: 'warning',
    }, response => {
      if (response === 3)
        return;
      new Promise(resolve => {
        switch (response) {
          case 0:
            this.pdfs.reduce((promise, pdf) => {
              promise.then(() => {
                return fs.remove(path.join(this.dir, pdf));
              });
              return promise;
            }, Promise.resolve()).then(() => {
              this.clearCurrentPdfs();
              resolve();
            });
            break;
          case 1:
            this.clearCurrentPdfs();
            this.allPdfs.reduce((promise, pdf) => {
              promise.then(() => {
                return fs.remove(path.join(this.dir, pdf));
              });
              return promise;
            }, Promise.resolve()).then(() => {
              this.allPdfs = [];
              resolve();
            });
            break;
          case 2:
            this.clearCurrentPdfs();
            this.allPdfs.reduce((promise, pdf) => {
              return promise.then(() => {
                return fs.remove(path.join(this.dir, pdf));
              });
            }, Promise.all([
              fs.remove(this.plot.getDataPath()),
              fs.remove(this.plot.getSlicePath())
            ])).then(() => {
              this.allPdfs = [];
              resolve();
            });
            break;
        }
      }).then(() => {
        atom.notifications.addInfo('All plots deleted.');
      });
    });
  }

  stopProgress() {
    if (!this.inProgress)
      return;

    this.inProgress = false;
    this.refs.tag.setDisabled(false);
    etch.update(this);
    this.stopWatchFiles();
  }

  setDir(dir) {
    this.dir = dir;
  }

  /**
   * Starts watching the current directory for plots
   */
  watchFiles() {
    this.stopWatchFiles().then(() => {
      this.updatePdfs(true);
      // https://flight-manual.atom.io/api/v1.39.1/PathWatcher/
      this.watcher = watchPath(this.dir, {}, events => {
        for (const event of events)
          console.log(`${event.action} ${event.path}`);
        this.updatePdfs();
      });
    });
  }

  stopWatchFiles() {
    return new Promise(resolve => {
      if (this.watcher == null) {
        resolve();
        return;
      }
      this.watcher.then(watcher => {
        watcher.dispose();
        resolve();
      });
      this.watcher = null;
    });
  }

  /**
   * Updates the pdfs in the current directory
   */
  updatePdfs(renderAnyways = false) {
    fs.readdir(this.dir, (err, files) => {
      if (err || !files) {
        this.clearCurrentPdfs();
        return;
      }

      this.allPdfs = [];
      this.pdfs = files.filter(f => {
        if (path.extname(f).toLowerCase() !== '.pdf' || !path.basename(f).startsWith('plot_'))
          return false;

        this.allPdfs.push(f);
        switch (this.getViewSize()) {
          case 'daily':
            return path.basename(f).startsWith('plot_daily_');
          case 'tiny':
            return path.basename(f).startsWith('plot_tinyslice_');
          case 'normal':
            return path.basename(f).startsWith('plot_normalslice_');
          case 'big':
            return path.basename(f).startsWith('plot_bigslice_');
        }
        return false;
      }).sort((a, b) => {
        // file names are always plot_<view>_<date> and may have _<number> suffix
        a = path.basename(a).match(/plot_[a-z]+_([0-9]{6})(?:_([0-9]+))?/);
        b = path.basename(b).match(/plot_[a-z]+_([0-9]{6})(?:_([0-9]+))?/);
        // compare by date and then by number
        return a[1].localeCompare(b[1]) || parseInt(a[2] || 0) - parseInt(b[2] || 0);
      });
      if (this.pdfs.length > 0) {
        if (this.currentPage === 0 || this.currentPage > this.pdfs.length) {
          this.currentPage = 1;
          this.renderCurrentPdf();
        } else if (renderAnyways) {
          this.renderCurrentPdf();
        }
      } else {
        this.clearCurrentPdfs();
      }
      etch.update(this);
    });
  }

  renderCurrentPdf() {
    if (this.pdfs.length === 0)
      return;
    this.plot.setCanvas(path.join(this.dir, this.pdfs[this.currentPage - 1]));
  }

  clearCurrentPdfs() {
    this.pdfs = [];
    this.currentPage = 0;
    this.plot.setCanvas(null);
    etch.update(this);
  }

  getTag() {
    return this.refs.tag.getTag();
  }

  setTag(tag) {
    this.refs.tag.setTag(tag);
  }

  serialize() {
    return {
      dir: this.dir,
      tag: this.getTag(),
      currentPage: this.currentPage,
      view: this.view
    }
  }

  destroy() {
    etch.destroy(this);
  }

  update() {
    etch.update(this);
  }
}
