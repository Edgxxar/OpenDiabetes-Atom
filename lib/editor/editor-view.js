'use babel';

/** @jsx etch.dom */

import {xml2js} from 'xml-js';
import Output from "./output";
import Toolbar from "./toolbar";
import {executeCli, getProjectPath, isVaultInitialized, warnNotInitialized, writeFile} from "../util";
import path from 'path';
import ImportModal from "./import-modal";

export default class EditorView {
  blockly_injected = false;
  workspace = undefined;

  constructor(serialized) {
    this.serialized = serialized;

    this.element = document.createElement('div');
    this.element.setAttribute('id', 'odf-editor');

    this.toolbar = new Toolbar(
      () => this.doImport(),
      () => this.doRun()
    );
    this.element.appendChild(this.toolbar.element);

    this.area = document.createElement('div');
    this.area.setAttribute('id', 'blockly-area');
    this.div = document.createElement('div');
    this.div.setAttribute('id', 'blockly-div');
    this.area.appendChild(this.div);
    this.element.appendChild(this.area);

    this.output = new Output();
    this.element.appendChild(this.output.element);
  }

  doImport() {
    const modal = new ImportModal();
    this.element.appendChild(modal.element);
  }

  doRun() {
    if (!isVaultInitialized()) {
      warnNotInitialized();
    } else {
      const file = path.join(getProjectPath(), 'Process.java');
      const tag = 'OUT';  //TODO: configurable
      writeFile(file, this.output.code)
        .then(() => {
          return executeCli('process', {
            file: file,
            tag: tag
          });
        })
        .then(result => {
          atom.notifications.addSuccess('Process finished.', {
            detail: result
          })
        })
        .catch(err => {
          atom.notifications.addError('Process failed!', {
            detail: err
          })
        });
    }
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    let workspace;
    if (this.workspace instanceof Blockly.Workspace) {
      workspace = xml2js(Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(this.workspace)));
    }
    return {
      deserializer: 'open-diabetes-filter/EditorView',
      workspace: workspace
    }
  }

  // Tear down any state and detach
  async destroy() {
    await this.element.remove();
  }

  getElement() {
    return this.element;
  }

  getTitle() {
    // Used by Atom for tab text
    return 'Blockly Editor';
  }

  getURI() {
    // Used by Atom to identify the view when toggling.
    return 'atom://open-diabetes-filter';
  }
}
