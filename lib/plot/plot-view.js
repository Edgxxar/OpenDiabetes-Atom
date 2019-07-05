'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import Plot from './plot';
import path from "path";
import util from "../util";

const pdf = require('pdfjs-dist');

export default class PlotView {
  plot1 = null;
  plot2 = null;

  tagCache = {};

  constructor(serialized) {
    if (serialized) {
      this.plot1 = serialized.plot1;
      this.plot2 = serialized.plot2;
      this.tagCache = serialized.cache;
    }

    pdf.GlobalWorkerOptions.workerSrc = path.join(util.getModulePath(), '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.js').normalize();

    etch.initialize(this);
  }

  render() {
    return (
      <div className="odf-plot-container">
        <Plot serialized={this.plot1} view={this} ref="plot1"/>
        <Plot serialized={this.plot2} view={this} ref="plot2"/>
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
    const data = {
      deserializer: 'open-diabetes-filter/PlotView',
      plot1: this.refs.plot1.serialize(),
      plot2: this.refs.plot2.serialize(),
      cache: this.tagCache
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
    return 'atom://open-diabetes-plot';
  }
}
