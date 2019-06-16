'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import Toolbar from "./toolbar";
import Canvas from "./canvas";

export default class PlotView {
  constructor(serialized) {
    if (serialized !== null)
      this.directory = serialized;
    else this.directory = null;

    etch.initialize(this);
  }

  render() {
    return (
      <div>
        <Toolbar view={this}/>
        <Canvas ref="canvas"/>
      </div>
    );
  }

  setCanvas(url) {
    this.refs.canvas.renderPdf(url);
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
      directory: this.directory
    }
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
