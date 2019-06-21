'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import Toolbar from "./toolbar";
import Canvas from "./canvas";

export default class Plot {
  constructor(properties) {
    this.tag = properties.tag;
    this.view = properties.view;

    etch.initialize(this);
  }

  render() {
    return (
      <div className="odf-plot">
        <Toolbar plot={this}/>
        <Canvas ref="canvas"/>
      </div>
    );
  }

  setCanvas(url) {
    this.refs.canvas.renderPdf(url);
  }

  destroy() {
    etch.destroy(this);
  }

  update() {
    etch.update(this);
  }
}
