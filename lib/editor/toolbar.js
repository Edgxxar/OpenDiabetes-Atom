'use babel';

/** @jsx etch.dom */

import etch from 'etch';

export default class Toolbar {
  /**
   * @param run callback for "run" button
   */
  constructor(run) {
    this.run = run;
    etch.initialize(this);
  }

  render() {
    return (
      <div id="odf-toolbar" className="block">
        <button className="btn btn-success icon icon-playback-play inline-block" on={{click: this.run}}>Run</button>
        <button className="btn btn-warning icon icon-file inline-block">Export</button>
        <button className="btn btn-info icon icon-eye inline-block">Show Input Data</button>
        <button className="btn btn-info icon icon-eye inline-block">Show Output Data</button>
      </div>
    );
  }

  update() {
    etch.update(this);
  }
}
