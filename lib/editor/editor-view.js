'use babel';

/** @jsx etch.dom */

import {xml2js} from 'xml-js';
import Output from "./output";
import Toolbar from "./toolbar";
import {executeCli, getProjectPath, isVaultInitialized, warnNotInitialized, writeFile} from "../util";
import path from 'path';
import ImportModal from "./import-modal";
import ExportModal from "./export-modal";

export default class EditorView {
  blockly_injected = false;
  workspace = undefined;

  constructor(serialized, tag) {
    this.serialized = serialized;

    this.element = document.createElement('div');
    this.element.setAttribute('id', 'odf-editor');

    this.toolbar = new Toolbar(
      () => this.doImport(),
      () => this.doExport(),
      () => this.doRun()
    );
    if (tag)
      this.toolbar.setTag(tag);
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

  doExport() {
    const modal = new ExportModal();
    this.element.appendChild(modal.element);
  }

  doRun() {
    if (!isVaultInitialized()) {
      warnNotInitialized();
    } else {
      const tag = this.toolbar.getTag();
      if (!tag) {
        atom.notifications.addWarning('Output tag missing!', {
          description: 'Please specify an output tag before executing the filters!'
        });
        return;
      }
      const file = path.join(getProjectPath(), 'Process.java');
      writeFile(file, this.output.code)
        .then(() => {
          const compile = atom.config.get('open-diabetes-filter.cli-precompile');
          if (compile) {
            // if compile, return promise for compilation command and change file name to .class
            return executeCli('compile', {
              file: file
            }).then(() => Promise.resolve(path.join(getProjectPath(), 'Process.class')))
            // else return .java file name
          } else return Promise.resolve(file);
        })
        .then(file => {
          return executeCli('process', {
            file: file,
            tag: tag
          }, false);
        })
        .then(result => {
          atom.notifications.addSuccess('Process finished.', {
            detail: result
          })
        })
        .catch(err => {
          console.error(err);
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
      workspace: workspace,
      tag: this.toolbar.getTag()
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
