'use babel';

/** @jsx etch.dom */

import etch from 'etch';

const pdf = require('pdfjs-dist');

export default class Canvas {
  constructor() {
    this.cache = {};
    this.url = '';
    this.scale = 1.0;
    etch.initialize(this);
  }

  render() {
    return (
      <div>
        <canvas ref="canvas"/>
        <div>{this.url}</div>
      </div>
    );
  }

  /**
   * Loads the pdf with the given path and puts the loading promise in the cache
   * @param path url of pdf
   */
  loadPdf(path) {
    if (!this.cache.hasOwnProperty(path)) {
      this.cache[path] = pdf.getDocument(path).promise.then(doc => {
        // doc.getPage() returns a promise that resolves when the page is loaded.
        return doc.getPage(1);
      });
    }
    return this.cache[path];
  }

  /**
   * Renders the pdf with the given path. Loads the pdf if necessary
   * @param path url of pdf
   */
  renderPdf(path) {
    this.loadPdf(path).then(page => {
      const viewport = page.getViewport(this.scale);   // method signature does not match documentation, documented use would be `getViewport({scale: 1.0})`
      const canvas = this.refs.canvas;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const ctx = canvas.getContext('2d');
      page.render({
        canvasContext: ctx,
        viewport: viewport
      }).then(() => {
        this.url = path;
        etch.update(this);
      });
    });
  }

  destroy() {
    etch.destroy(this);
  }

  update() {
    etch.update(this);
  }
}
