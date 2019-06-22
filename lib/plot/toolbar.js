'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import fs from 'fs';
import path from 'path';
import TagInput from "../tag-input";

export default class Toolbar {
  constructor(properties) {
    this.plot = properties.plot;
    this.pdfs = [];
    this.currentPage = 0;
    etch.initialize(this);
    if (this.plot.directory)
      this.updatePdfs(this.plot.directory);
  }

  render() {
    return (
      <div className="odf-toolbar block">
        <TagInput value={this.plot.tag}>Use tag:</TagInput>
        <button className="btn btn-info inline-block-tight" on={{click: this.prev}}><span className="icon-left icon-jump-left"/>Prev</button>
        <div className="inline-block-tight">{this.currentPage} / {this.pdfs.length}</div>
        <button className="btn btn-info inline-block" on={{click: this.next}}>Next<span className="icon-right icon-jump-right"/></button>
        <div className="btn-group inline-block">
          <button className="btn icon icon-plus" on={{click: this.zoomIn}}/>
          <button className="btn icon icon-dash" on={{click: this.zoomOut}}/>
        </div>
        <button className="btn btn-success inline-block icon icon-repo-sync" on={{click: this.updatePlots}}>Update</button>
        <progress className="inline-block" max="100" value="25"/>
        <span className="inline-block">25%</span>
      </div>
    );
  }

  updatePdfs(dir) {
    if (dir) {
      this.plot.directory = dir;
      fs.readdir(dir, (err, files) => {
        this.pdfs = files.filter(f => {
          return path.extname(f).toLowerCase() === '.pdf' && path.basename(f).startsWith('plot_');
        });
        if (this.pdfs.length > 0) {
          this.currentPage = 1;
          this.renderCurrentPdf();
        } else {
          this.currentPage = 0;
        }
        etch.update(this);
      });
    } else {
      this.plot.directory = null;
    }
  }

  renderCurrentPdf() {
    this.plot.setCanvas(path.join(this.plot.directory, this.pdfs[this.currentPage - 1]));
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
    this.plot.updatePlots();
  }

  destroy() {
    etch.destroy(this);
  }

  update() {
    etch.update(this);
  }
}
