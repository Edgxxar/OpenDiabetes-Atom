'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import fs from 'fs-extra';
import path from 'path';
import uuidv4 from 'uuid/v4';
import util from '../util';
import TagInput from "../tag-input";

export default class Toolbar {
  inProgress = false;
  progress = -1;
  progressMessage = '';
  currentPage = 0;

  pdfs = [];
  watcher = null;

  constructor(properties) {
    this.id = uuidv4(); // unique id for html attributes, multiple plots are in the DOM at the same time
    this.plot = properties.plot;
    if (properties.serialized != null) {
      this.tag = properties.serialized.tag;
      this.dir = properties.serialized.dir;
      this.currentPage = properties.serialized.currentPage;
    }

    etch.initialize(this);
    if (this.dir != null)
      this.updatePdfs();

    this.refs.tag.onupdate = (tag) => {
      if (this.plot.hasTagCached(tag)) {
        this.watchFiles(path.join(util.getProjectPath(), 'plots', this.plot.getTagCache(tag)));
      } else this.clearCurrentPdfs();
    };
  }

  render() {
    return (
      <div className="odf-toolbar block">
        <TagInput ref="tag" value={this.tag} title="Choose tag for export, leave empty for all data" disabled={this.inProgress}/>
        <div className="btn-group inline-block">
          <button className="btn btn-info" on={{click: this.prev}} title="Previous plot"><span className="icon-jump-left"/></button>
          <div className="btn btn-info btn-dummy">{this.currentPage} / {this.pdfs.length}</div>
          <button className="btn btn-info" on={{click: this.next}} title="Next plot"><span className="icon-jump-right"/></button>
        </div>
        <div className="btn-group inline-block">
          <button className="btn icon icon-plus" on={{click: this.zoomIn}} title="Zoom In"/>
          <button className="btn icon icon-dash" on={{click: this.zoomOut}} title="Zoom Out"/>
        </div>
        <div className="btn-group inline-block">
          <button className="btn btn-success icon icon-repo-sync" on={{click: this.updateBtn}} disabled={this.inProgress}
                  title="Generate plots for the currently selected tag or file"/>
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

  zoomIn() {
    this.plot.refs.canvas.scale += 0.1;
    this.renderCurrentPdf();
  }

  zoomOut() {
    this.plot.refs.canvas.scale -= 0.1;
    this.renderCurrentPdf();
  }

  updateBtn() {
    if (this.inProgress)
      return;

    this.inProgress = true;
    this.refs.tag.setDisabled(true);
    etch.update(this);
    this.plot.generatePlots(this.refs.tag.getTag());
  }

  cancelBtn() {
    if (!this.inProgress)
      return;

    this.inProgress = false;
    this.refs.tag.setDisabled(false);
    etch.update(this);
    this.plot.cancelPlots();
  }

  deleteBtn() {
    if (this.inProgress)
      return;

    atom.confirm({
      message: 'Delete all ' + this.pdfs.length + ' plots for tag ' + this.getTag() + '?',
      buttons: ['Cancel', 'Ok'],
      type: 'warning'
    }, response => {
      if (response !== 1)
        return;
      if (this.watcher != null) {
        this.watcher.close();
        this.watcher = null;
      }
      fs.remove(this.dir).then(() => {
        atom.notifications.addInfo('All plots deleted.');
        this.updatePdfs();
      })
    });
  }

  stopProgress() {
    if (!this.inProgress)
      return;

    this.inProgress = false;
    this.refs.tag.setDisabled(false);
    etch.update(this);
    if (this.watcher != null)
      this.watcher.close();
  }

  /**
   * Starts watching a directory for plots, sets the current directory to the new directory
   * @param directory full path
   */
  watchFiles(directory) {
    if (this.watcher != null) {
      this.watcher.close();
      this.watcher = null;
    }
    if (directory !== this.dir) {
      this.dir = directory;
      this.updatePdfs(true);
    }
    util.exists(directory).then(exists => {
      if (exists) {
        this.watcher = fs.watch(directory, {}, (eventType, filename) => {
          console.log(eventType + ' ' + filename);
          if (eventType === 'rename')
            this.updatePdfs();
        })
      }
    })
  }

  /**
   * Updates the pdfs in the current directory
   */
  updatePdfs(renderAnyways = false) {
    console.log("UPDATE PDFS");
    fs.readdir(this.dir, (err, files) => {
      if (err || !files) {
        this.clearCurrentPdfs();
        return;
      }

      this.pdfs = files.filter(f => {
        return path.extname(f).toLowerCase() === '.pdf' && path.basename(f).startsWith('plot_');
      });
      if (this.pdfs.length > 0) {
        if (this.currentPage === 0 || this.currentPage > this.pdfs.length) {
          this.currentPage = 1;
          this.renderCurrentPdf();
        } else if (renderAnyways) {
          this.renderCurrentPdf();
        }
      } else {
        this.currentPage = 0;
      }
      etch.update(this);
    });
  }

  renderCurrentPdf() {
    this.plot.setCanvas(path.join(this.dir, this.pdfs[this.currentPage - 1]));
  }

  clearCurrentPdfs() {
    if (this.watcher != null) {
      this.watcher.close();
      this.watcher = null;
    }
    this.dir = null;
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
      currentPage: this.currentPage
    }
  }

  destroy() {
    etch.destroy(this);
  }

  update() {
    etch.update(this);
  }
}
