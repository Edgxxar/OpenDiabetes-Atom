'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import util from '../util';
import TagInput from '../tag-input';

export default class Toolbar {
  inProgress = false;
  progressMessage = '';
  tagIn = null;
  tagOut = null;

  saved = true;

  constructor(editor, tagIn, tagOut) {
    this.editor = editor;
    this.tagIn = tagIn;
    this.tagOut = tagOut;
    etch.initialize(this);
  }

  render() {
    return (
      <div className="odf-toolbar block">
        <div className="btn-group inline-block">
          <button className="btn btn-warning icon icon-cloud-upload" on={{click: this.import}} title="Import data"/>
          <button className="btn btn-warning icon icon-cloud-download" on={{click: this.export}} title="Export data"/>
        </div>
        <div className="btn-group inline-block">
          <button className="btn btn-info icon icon-desktop-download" disabled={this.saved}
                  title={this.saved ? "All changes saved" : "Save"} on={{click: this.save}}/>
          <button className="btn btn-info icon icon-chevron-down" title="Save as..." on={{click: this.saveAs}}/>
        </div>
        <button className="btn btn-success inline-block" on={{click: this.execute}} disabled={this.inProgress} title="Execute filters">
          <span className="icon-left icon-playback-play"/>Run
        </button>
        <div className="inline-block" style={this.inProgress ? 'display: none' : 'display: inline'}>
          <TagInput ref="tagIn" title="Input Tag" name="-in" value={this.tagIn}/>
          <TagInput ref="tagOut" title="Output Tag" name="-out" value={this.tagOut}/>
        </div>
        <div className="inline-block" style={this.inProgress ? 'display: inline' : 'display: none'}>
          <progress className=""/>
          <span className="">{this.progressMessage}</span>
        </div>
      </div>
    );
  }

  import() {
    if (!util.isVaultInitialized()) {
      util.warnNotInitialized();
      return;
    }
    this.editor.import();
  }

  export() {
    if (!util.isVaultInitialized()) {
      util.warnNotInitialized();
      return;
    }
    this.editor.export()
  }

  save() {
    this.editor.save();
  }

  saveAs() {
    this.editor.saveAs();
  }

  execute() {
    if (!util.isVaultInitialized()) {
      util.warnNotInitialized();
      return;
    }
    const tagOut = this.getTagOut();
    if (!tagOut) {
      atom.notifications.addWarning('Output tag missing!', {
        description: 'Please specify an output tag before executing the filters!'
      });
      return;
    }
    this.inProgress = true;
    etch.update(this);

    this.editor.save().then(() => this.editor.execute(this.getTagIn(), tagOut));
  }

  setProgress(message) {
    this.progressMessage = message;
    etch.update(this);
  }

  stopProgress() {
    this.inProgress = false;
    etch.update(this);
  }

  setSaved(saved) {
    this.saved = saved;
    etch.update(this);
  }

  getTagIn() {
    return this.refs.tagIn.getTag();
  }

  getTagOut() {
    return this.refs.tagOut.getTag();
  }

  update() {
    etch.update(this);
  }
}
