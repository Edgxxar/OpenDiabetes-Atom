'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import TagInput from '../tag-input';

export default class Toolbar {
  /**
   * @param imp callback for "import" button
   * @param run callback for "run" button
   */
  constructor(imp, exp, run) {
    this.imp = imp;
    this.exp = exp;
    this.run = run;
    etch.initialize(this);
  }

  render() {
    return (
      <div className="odf-toolbar block">
        <button className="btn btn-warning inline-block" on={{click: this.imp}}><span className="icon-left icon-move-down"/>
          Import Data
        </button>
        <button className="btn btn-warning inline-block" on={{click: this.exp}}><span className="icon-left icon-move-up"/>
          Export Data
        </button>
        <button className="btn btn-success inline-block" on={{click: this.run}}><span className="icon-left icon-playback-play"/>
          Execute Filters
        </button>
        <TagInput ref="tag">Output tag:</TagInput>
        <label className="input-label inline-block"><input className="input-checkbox" type="checkbox"/> Update plots on execution</label>
      </div>
    );
  }

  setTag(tag) {
    this.refs.tag.setTag(tag);
  }

  getTag() {
    return this.refs.tag.getTag();
  }

  update() {
    etch.update(this);
  }
}
