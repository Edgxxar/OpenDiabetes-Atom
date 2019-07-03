'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import util from '../util';
import TagInput from '../tag-input';

export default class Toolbar {
  inProgress = false;
  progressMessage = '';
  tag = null;

  constructor(editor, tag) {
    this.editor = editor;
    this.tag = tag;
    etch.initialize(this);
  }

  render() {
    return (
      <div className="odf-toolbar block">
        <div className="btn-group inline-block">
          <button className="btn btn-warning" on={{click: this.import}} title="Import data">
            <span className="icon-left icon-move-down"/>Import
          </button>
          <button className="btn btn-warning" on={{click: this.export}} title="Export data">
            <span className="icon-left icon-move-up"/>Export
          </button>
        </div>
        <button className="btn btn-success inline-block" on={{click: this.execute}} disabled={this.inProgress} title="Execute filters">
          <span className="icon-left icon-playback-play"/>Run
        </button>
        <div className="inline-block" style={this.inProgress ? 'display: none' : 'display: inline'}>
          <TagInput ref="tag" title="Output Tag" value={this.tag}/>
        </div>
        <div className="inline-block" style={this.inProgress ? 'display: inline' : 'display: none'}>
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
