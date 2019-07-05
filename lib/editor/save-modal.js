'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import path from 'path';
import {File} from 'atom';
import util from '../util';
import Modal from '../modal'

export default class SaveModal {
  constructor(editor) {
    this.editor = editor;
    this.dir = util.getProjectPath();
    etch.initialize(this);
  }

  render() {

    const dirs = [];
    for (const dir of atom.project.getDirectories()) {
      dirs.push(<DirItem dir={dir} modal={this}/>)
    }

    return (
      <Modal ref="modal">
        <h2 className="modal-title">Save Workspace</h2>
        <div>Choose directory:</div>
        {dirs}
        <div style="margin-top: .5em; margin-bottom: .25em">Choose filename:</div>
        <div className="native-key-bindings">
          <input className="input-text" type="text" on={{input: this.input}}
                 value={this.editor.file ? this.editor.file.getBaseName() : '.odf'} ref="input"/>
        </div>
        <button className="btn inline-block-tight btn-modal btn-info" on={{click: this.save}}>Save</button>
        <button className="btn inline-block-tight btn-modal" on={{click: this.close}}>Cancel</button>
      </Modal>
    );
  }

  close() {
    this.refs.modal.destroy()
  }

  input(event) {
  }

  save() {
    let filename = this.refs.input.value;
    if (!filename.endsWith('.odf')) {
      filename = filename + '.odf';
    }
    const file = new File(path.join(this.dir.getPath(), filename));
    file.write(Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(this.editor.workspace))).then(() => {
      atom.notifications.addSuccess('Workspace saved.', {
        description: 'Saved to `' + file.getPath() + '`'
      })
    });
    this.editor.file = file;
    this.editor.toolbar.setSaved(true);
    this.refs.modal.destroy();
  }

  update() {
    etch.update(this);
  }
}

class DirItem {
  expanded = false;
  children = [];
  selected = false;

  constructor(properties) {
    this.dir = properties.dir;
    this.parent = properties.parent;
    this.modal = properties.modal;

    const old = this.modal.editor.file;
    if (old != null && this.dir.contains(old.getPath())) {
      this.expanded = true;
      this.findChildren(false);
      if (path.dirname(old.getPath()) === this.dir.getPath()) {
        this.selected = true;
        this.modal.dir = this.dir;
      }
    }

    etch.initialize(this);
  }

  render() {
    const children = [];
    for (let i = 0; i < this.children.length; i++)
      children.push(<DirItem dir={this.children[i]} parent={this} modal={this.modal} ref={'child' + i}/>);
    return (
      <div className="dir-item">
        <div className={this.selected ? 'dir-item-selected' : ''} on={{click: this.click}}>
          <span className={this.expanded ? 'icon icon-chevron-down' : 'icon icon-chevron-right'}/>
          <span className="icon icon-file-directory">{this.dir.getBaseName()}</span>
        </div>
        {children}
      </div>
    )
  }

  click() {
    this.selected = true;
    this.modal.dir = this.dir;
    this.deselectParent();

    if (this.expanded) {
      this.expanded = false;
      this.children = [];
    } else {
      this.expanded = true;
      this.findChildren();
    }
    etch.update(this);
  }

  findChildren(deselect = true) {
    this.dir.getEntries((err, entries) => {
      if (err)
        return;
      this.children = entries.filter(e => e.isDirectory());
      const update = etch.update(this);
      if (deselect)
        update.then(() => this.deselectChildren());
    })
  }

  deselectParent() {
    if (this.parent != null)
      this.parent.deselect(this);
  }

  deselectChildren(from = null) {
    for (const i in this.refs) {
      const child = this.refs[i];
      if (child !== from)
        child.deselect();
    }
  }

  deselect(from = null) {
    this.selected = false;
    if (from !== null)
      this.deselectParent();
    this.deselectChildren(from);
    etch.update(this);
  }

  update() {
    etch.update(this);
  }
}
