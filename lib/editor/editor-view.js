'use babel';

/** @jsx etch.dom */

import {xml2js} from 'xml-js';
import {File} from 'atom';
import Output from "./output";
import Toolbar from "./toolbar";
import {executeCli, getProjectPath, writeFile} from "../util";
import path from 'path';
import ImportModal from "./import-modal";
import ExportModal from "./export-modal";
import SaveModal from "./save-modal";

export default class EditorView {
  blockly_injected = false;
  workspace = undefined;

  constructor(serialized, file, tagIn, tagOut) {
    this.serialized = serialized;
    if (file)
      this.file = new File(file);
    else this.file = null;

    this.element = document.createElement('div');
    this.element.setAttribute('id', 'odf-editor');

    this.toolbar = new Toolbar(this, tagIn, tagOut);
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

  import() {
    const modal = new ImportModal();
    this.element.appendChild(modal.element);
  }

  export() {
    const modal = new ExportModal();
    this.element.appendChild(modal.element);
  }

  save() {
    const modal = new SaveModal(this);
    this.element.appendChild(modal.element);
  }

  execute(tagIn, tagOut) {
    const file = path.join(getProjectPath(), 'Process.java');
    this.toolbar.setProgress('Writing file...');
    writeFile(file, this.output.code)
      .then(() => {
        const compile = atom.config.get('open-diabetes-filter.cli-precompile');
        if (compile) {
          this.toolbar.setProgress('Compiling filters...');
          // if compile, return promise for compilation command and change file name to .class
          return executeCli('compile', {
            file: file
          }).then(() => Promise.resolve(path.join(getProjectPath(), 'Process.class')))
          // else return .java file name
        } else return Promise.resolve(file);
      })
      .then(file => {
        this.toolbar.setProgress('Processing filters...');
        if (tagIn) {
          return executeCli('processtagged', {
            file: file,
            in: tagIn,
            out: tagOut
          }, false);
        } else {
          return executeCli('process', {
            file: file,
            out: tagOut
          }, false);
        }
      })
      .then(result => {
        this.toolbar.stopProgress();
        atom.notifications.addSuccess('Process finished.', {
          detail: result
        })
      })
      .catch(err => {
        this.toolbar.stopProgress();
        console.error(err);
        atom.notifications.addError('Process failed!', {
          detail: err
        })
      });
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
      file: this.file ? this.file.path : null,
      tagIn: this.toolbar.getTagIn(),
      tagOut: this.toolbar.getTagOut()
    }
  }

  // Tear down any state and detach
  async destroy() {
    await this.element.remove();
  }

  getElement() {
    return this.element;
  }

  onWorkspaceChange(event) {
    this.output.update(Blockly.ODF.workspaceToCode(this.workspace));
    if (event.recordUndo) {
      this.toolbar.setSaved(false);
    }
    if (event.type === 'finished_loading') {
      this.toolbar.setSaved(true);
    }
  }

  getTitle() {
    // Used by Atom for tab text
    return this.file ? path.basename(this.file.path) + ' ODF Editor' : 'ODF Editor';
  }

  getURI() {
    // Used by Atom to identify the view when toggling.
    return 'atom://open-diabetes-filter';
  }
}
