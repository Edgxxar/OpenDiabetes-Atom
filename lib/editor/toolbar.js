'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import util from '../util';
import TagInput from '../tag-input';

export default class Toolbar {
  inProgress = false;
  progressMessage = '';

  constructor(editor, tag) {
    this.editor = editor;
    etch.initialize(this);
    if (tag)
      this.refs.tag.setTag();
  }

  render() {
    return (
      <div className="odf-toolbar block">
        <button className="btn btn-warning inline-block" on={{click: this.import}}><span className="icon-left icon-move-down"/>
          Import Data
        </button>
        <button className="btn btn-warning inline-block" on={{click: this.export}}><span className="icon-left icon-move-up"/>
          Export Data
        </button>
        <div className="inline-block" style={this.inProgress ? 'display: none' : 'display: inline'}>
          <button className="btn btn-success inline-block" on={{click: this.execute}}><span className="icon-left icon-playback-play"/>
            Execute Filters
          </button>
          <TagInput ref="tag">Output tag:</TagInput>
        </div>
        <div className="inline-block" style={this.inProgress ? 'display: inline' : 'display: none'}>
          <button className="btn btn-success inline-block" disabled><span className="icon-left icon-playback-play"/>
            Execute Filters
          </button>
          <progress className=""/>
          <span className="">{this.progressMessage}</span>
        </div>
        <label className="input-label inline-block"><input className="input-checkbox" type="checkbox"/> Update plots on execution</label>
      </div>
    );
  }

  import() {
    this.editor.import();
  }

  export() {
    this.editor.export()
  }

  execute() {
    if (!util.isVaultInitialized()) {
      util.warnNotInitialized();
      return;
    }
    const tag = this.getTag();
    if (!tag) {
      atom.notifications.addWarning('Output tag missing!', {
        description: 'Please specify an output tag before executing the filters!'
      });
      return;
    }
    this.inProgress = true;
    etch.update(this);

    this.editor.execute(tag);
  }

  setProgress(message) {
    this.progressMessage = message;
    etch.update(this);
  }

  stopProgress() {
    this.inProgress = false;
    etch.update(this);
  }

  getTag() {
    return this.refs.tag.getTag();
  }

  update() {
    etch.update(this);
  }
}
