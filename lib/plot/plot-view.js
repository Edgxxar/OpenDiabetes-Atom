'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import Plot from './plot';
import path from "path";
import util from "../util";

const pdf = require('pdfjs-dist');

export default class PlotView {
  tag1 = null;
  tag2 = null;

  tagCache = {};

  constructor(serialized) {
    if (serialized) {
      this.tag1 = serialized.tag1;
      this.tag2 = serialized.tag2;
      this.tagCache = serialized.cache;
    }

    pdf.GlobalWorkerOptions.workerSrc = path.join(util.getModulePath(), '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.js').normalize();

    etch.initialize(this);
  }

  render() {
    return (
      <div className="odf-plot-container">
        <Plot tag={this.tag1} view={this} ref="plot1"/>
        <Plot tag={this.tag2} view={this} ref="plot2"/>
      </div>
    );
  }

  update() {
    etch.update(this);
  }

  getElement() {
    return this.element;
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: 'open-diabetes-filter/PlotView',
      tag1: this.refs.plot1.getTag(),
      tag2: this.refs.plot2.getTag(),
      cache: this.tagCache
    };
  }

  getTitle() {
    // Used by Atom for tab text
    return 'Plot View';
  }

  getURI() {
    // Used by Atom to identify the view when toggling.
    return 'atom://open-diabetes-plot';
  }
}
