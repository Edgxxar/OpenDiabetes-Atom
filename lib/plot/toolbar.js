'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import fs from 'fs';
import path from 'path';

export default class Toolbar {
  constructor(properties) {
    this.view = properties.view;
    this.dir = this.view.directory ? path.basename(this.view.directory) : 'Choose directory';
    this.pdfs = [];
    this.currentPage = 0;
    etch.initialize(this);
    if (this.view.directory)
      this.updatePdfs(this.view.directory);
  }

  render() {
    return (
      <div className="odf-toolbar block">
        <input type="file" className="input-file" id="plotDirectory" on={{change: this.setDir}} webkitdirectory/>
        <label htmlFor="plotDirectory"><span className="icon icon-file-directory"/>{this.dir}</label>
        <button className="btn btn-info inline-block" on={{click: this.prev}}><span className="icon-left icon-jump-left"/>Prev</button>
        <div className="inline-block">{this.currentPage} / {this.pdfs.length}</div>
        <button className="btn btn-info inline-block" on={{click: this.next}}>Next<span className="icon-right icon-jump-right"/></button>
        <div className="btn-group inline-block">
          <button className="btn icon icon-plus" on={{click: this.zoomIn}}/>
          <button className="btn icon icon-dash" on={{click: this.zoomOut}}/>
        </div>
      </div>
    );
  }

  setDir(event) {
    if (event.target.files.length === 0) {
      this.dir = 'Choose directory';
      this.updatePdfs(null);
      etch.update(this);
    } else {
      const dir = event.target.files[0];
      this.dir = dir.name + path.sep;
      this.updatePdfs(dir.path);
    }
  }

  updatePdfs(dir) {
    if (dir) {
      this.view.directory = dir;
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
      this.view.directory = null;
    }
  }

  renderCurrentPdf() {
    this.view.setCanvas(path.join(this.view.directory, this.pdfs[this.currentPage - 1]));
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
    this.view.refs.canvas.scale += 0.1;
    this.renderCurrentPdf();
  }

  zoomOut() {
    this.view.refs.canvas.scale -= 0.1;
    this.renderCurrentPdf();
  }

  destroy() {
    etch.destroy(this);
  }

  update() {
    etch.update(this);
  }
}
