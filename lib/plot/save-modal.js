'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import Modal from '../modal'
import TagInput from "../tag-input";

export default class SaveModal {
  constructor(plot, tag) {
    this.plot = plot;
    this.tag = tag;
    etch.initialize(this);

    this.refs.tag.onupdate = tag => this.plot.setSliceTag(tag);
  }

  render() {
    return (
      <Modal ref="modal">
        <h2 className="modal-title">Data Import</h2>
        <div>Please choose how you want to import data in the current repository:</div>
        <TagInput ref="tag" value={this.tag} title="Choose tag for import"/>
        <div ref="error" className="text-error"/>
        <button ref="save" className="btn inline-block-tight btn-modal btn-warning" on={{click: this.save}}>Save</button>
        <button className="btn inline-block-tight btn-modal" on={{click: this.close}}>Cancel</button>
      </Modal>
    );
  }

  save() {
    const tag = this.refs.tag.getTag();
    if (!tag) {
      this.refs.error.innerText = 'Please choose a tag!';
      etch.update(this);
      return;
    }
    this.refs.error.innerText = '';
    this.refs.save.setAttribute('disabled', true);
    etch.update(this);

    this.plot.saveSlices().then(() => this.close());
  }

  close() {
    this.refs.modal.destroy()
  }

  update() {
    etch.update(this);
  }
}
