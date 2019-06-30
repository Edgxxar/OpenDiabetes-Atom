'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import fs from 'fs';
import path from 'path';
import uuidv4 from 'uuid/v4';
import TagInput from "../tag-input";

export default class Toolbar {
  inProgress = false;
  progress = -1;
  progressMessage = '';
  file = null;
  watcher = null;

  constructor(properties) {
    this.id = uuidv4(); // unique id for html attributes, multiple plots are in the DOM at the same time
    this.plot = properties.plot;
    this.pdfs = [];
    this.currentPage = 0;
    etch.initialize(this);

    if (this.plot.uuid != null)
      this.updatePdfs(this.plot.getCurrentDirectory());

    this.refs.tag.onupdate = (tag) => {
      if (tag != null) {
        this.file = null;
        etch.update(this);

        this.plot.setTagUUID(tag);
        this.updatePdfs(this.plot.getCurrentDirectory());
      }
    }
  }

  render() {
    return (
      <div className="odf-toolbar block">
        <TagInput ref="tag" value={this.plot.tag}>Use tag:</TagInput>
        <div className="inline-block"><i>or</i></div>
        <input className="input-file" type="file" id={this.id + '-input-file'} on={{change: this.choosefile}}/>
        <label htmlFor={this.id + '-input-file'}><span
          className="icon-left icon-file"/>{this.file != null ? this.file.name : 'Choose file...'}</label>
        <button className="btn btn-info inline-block-tight" on={{click: this.prev}}><span className="icon-left icon-jump-left"/>Prev
        </button>
        <div className="inline-block-tight">{this.currentPage} / {this.pdfs.length}</div>
        <button className="btn btn-info inline-block" on={{click: this.next}}>Next<span className="icon-right icon-jump-right"/></button>
        <div className="btn-group inline-block">
          <button className="btn icon icon-plus" on={{click: this.zoomIn}}/>
          <button className="btn icon icon-dash" on={{click: this.zoomOut}}/>
        </div>
        {
          this.inProgress ?
            <button className="btn btn-error inline-block icon icon-primitive-square" on={{click: this.cancelPlots}}>Cancel</button> :
            <button className="btn btn-success inline-block icon icon-repo-sync" on={{click: this.updatePlots}}>Update</button>
        }
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

  stopProgress() {
    this.inProgress = false;
    etch.update(this);
  }

  updatePdfs(dir) {
    fs.readdir(dir, (err, files) => {
      if (err)
        return;

      this.pdfs = files.filter(f => {
        return path.extname(f).toLowerCase() === '.pdf' && path.basename(f).startsWith('plot_');
      });
      if (this.pdfs.length > 0) {
        if (this.currentPage === 0 || this.currentPage > this.pdfs.length) {
          this.currentPage = 1;
          this.renderCurrentPdf();
        }
      } else {
        this.currentPage = 0;
      }
      etch.update(this);
    });
  }

  renderCurrentPdf() {
    this.plot.setCanvas(path.join(this.plot.getCurrentDirectory(), this.pdfs[this.currentPage - 1]));
  }

  choosefile(event) {
    const files = event.target.files;
    if (files.length !== 1)
      return;

    this.file = files[0];
    this.refs.tag.setTag(null);
    etch.update(this);

    this.plot.setFileUUID(this.file.path);
    this.updatePdfs(this.plot.getCurrentDirectory());
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

  updatePlots() {
    if (this.plot.status !== 'idle')
      return;

    this.inProgress = true;
    etch.update(this);

    if (this.file != null) {
      this.plot.generateByFile(this.file.path);
    } else {
      this.plot.generateByTag(this.refs.tag.getTag());
    }
  }

  cancelPlots() {
    if (this.plot.status === 'idle')
      return;

    this.inProgress = false;
    etch.update(this);
    this.plot.cancelPlots();
  }

  watchFiles(directory) {
    if (this.watcher != null)
      this.watcher.close();
    this.updatePdfs(directory);
    this.watcher = fs.watch(directory, {}, (eventType, filename) => {
      console.log(eventType + ' ' + filename);
      if (eventType === 'rename')
        this.updatePdfs(directory);
    })
  }

  getTag() {
    return this.refs.tag.getTag();
  }

  destroy() {
    etch.destroy(this);
  }

  update() {
    etch.update(this);
  }
}
