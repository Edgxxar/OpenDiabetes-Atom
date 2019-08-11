'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import path from 'path';

const pdf = require('pdfjs-dist');

const cache = {};

/**
 * Loads the pdf with the given path and puts the loading promise in the cache
 * @param path url of pdf
 */
function loadPdf(path) {
  if (!cache.hasOwnProperty(path)) {
    cache[path] = pdf.getDocument(path).then(doc => {
      // doc.getPage() returns a promise that resolves when the page is loaded.
      return doc.getPage(1);
    });
  }
  return cache[path];
}

export default class Canvas {
  constructor(properties) {
    this.scale = properties.scale;
    this.url = properties.url;
    etch.initialize(this);
    this.renderPdf();
  }

  render() {
    const url = this.url ? path.basename(this.url) : '';
    return (
      <div className="plot-canvas">
        <canvas ref="canvas" width={0} height={0}/>
        <div>{url}</div>
      </div>
    );
  }

  /**
   * Renders the pdf. Loads the pdf if necessary
   */
  renderPdf() {
    if (this.url) {
      loadPdf(this.url).then(page => {
        const viewport = page.getViewport(this.scale);   // method signature does not match documentation, documented use would be `getViewport({scale: 1.0})`
        const canvas = this.refs.canvas;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const ctx = canvas.getContext('2d');
        page.render({
          canvasContext: ctx,
          viewport: viewport
        });
      }).catch(err => {
        console.error(err);
        atom.notifications.addError(err.name, {
          detail: err.message
        });
        // remove from cache on error, to try loading it again later
        delete cache[path];
      });
    } else {
      const canvas = this.refs.canvas;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  update(properties) {
    const update = this.url !== properties.url || this.scale !== properties.scale;
    this.scale = properties.scale;
    this.url = properties.url;
    etch.update(this).then(() => {
      if (update)
        this.renderPdf();
    });
  }

  destroy() {
    etch.destroy(this);
  }
}
