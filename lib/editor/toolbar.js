'use babel';

/** @jsx etch.dom */

import etch from 'etch';

export default class Toolbar {
  /**
   * @param imp callback for "import" button
   * @param run callback for "run" button
   */
  constructor(imp, run) {
    this.imp = imp;
    this.run = run;
    etch.initialize(this);
  }

  render() {
    return (
      <div id="odf-toolbar" className="block">
        <button className="btn btn-warning icon icon-jump-down inline-block" on={{click: this.imp}}>Import Data</button>
        <button className="btn btn-warning icon icon-jump-up inline-block">Export Data</button>
        <button className="btn btn-success icon icon-playback-play inline-block" on={{click: this.run}}>Execute Filters</button>
        <button className="btn btn-info icon icon-eye inline-block">Show Input Data</button>
        <button className="btn btn-info icon icon-eye inline-block">Show Output Data</button>
      </div>
    );
  }

  update() {
    etch.update(this);
  }
}
