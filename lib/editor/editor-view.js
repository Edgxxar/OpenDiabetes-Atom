'use babel';

/** @jsx etch.dom */

import {xml2js} from 'xml-js';
import {File} from 'atom';
import Output from "./output";
import Toolbar from "./toolbar";
import util from '../util';
import path from 'path';
import ImportModal from "./import-modal";
import ExportModal from "./export-modal";

export default class EditorView {
  blockly_injected = false;
  blockly_resolve;
  blockly_promise = new Promise(resolve => {
    this.blockly_resolve = resolve;
  });
  workspace = undefined;

  constructor(serialized, file, tagIn, tagOut) {
    this.serialized = serialized;
    if (file) {
      this.file = new File(file);
      this.blockly_promise.then(() => this.loadFromFile(file))
    } else this.file = null;

    this.element = document.createElement('div');
    this.element.classList.add('odf-editor');

    this.toolbar = new Toolbar(this, tagIn, tagOut);
    this.element.appendChild(this.toolbar.element);

    this.area = document.createElement('div');
    this.area.classList.add('blockly-area');
    this.div = document.createElement('div');
    this.div.classList.add('blockly-div');
    // prevent right click to propagate outside of blockly context
    this.div.oncontextmenu = e => {
      e.stopPropagation();
    };
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

  loadFromFile(file) {
    this.file = new File(file);
    this.file.read(true).then(content => {
      if (content == null)
        return;
      this.workspace.clear();
      Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(content), this.workspace);
    });
  }

  save() {
    if (this.file == null) {
      return this.showSaveDialog();
    } else return this.saveToFile();
  }

  saveAs() {
    return this.showSaveDialog().catch(err => {
      atom.notifications.addError('Could not save workspace!', {
        detail: err,
        dismissable: true
      })
    });
  }

  showSaveDialog() {
    return new Promise((resolve, reject) => {
      atom.applicationDelegate.showSaveDialog({
        title: 'Save workspace as...',
        defaultPath: this.file ? this.file.getPath() : path.join(util.getProjectPath(), 'Workspace.odf'),
        filters: [
          {name: 'Open Diabetes Filter', extensions: ['odf']},
          {name: 'All Files', extensions: ['*']}
        ]
      }, filename => {
        if (filename) {
          this.file = new File(filename);
          this.saveToFile().then(() => resolve()).catch(err => reject(err));
        } else resolve();
      });
    });
  }

  saveToFile() {
    return new Promise((resolve, reject) => {
      this.file.write(Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(this.workspace))).then(() => {
        atom.notifications.addInfo('Workspace saved', {
          description: 'Saved to `' + this.file.getBaseName() + '`.'
        });
        this.toolbar.setSaved(true);
        resolve();
      }).catch(err => reject(err));
    });
  }

  execute(tagIn, tagOut) {
    const file = new File(path.join(util.getProjectPath(), 'Process.java'));
    this.toolbar.setProgress('Writing file...');
    file.write(this.output.code)
      .then(() => {
        const compile = atom.config.get('open-diabetes-filter.cli-precompile');
        if (compile) {
          this.toolbar.setProgress('Compiling filters...');
          // if compile, return promise for compilation command and change file name to .class
          return util.executeCli('compile', {
            file: util.getRelativeProjectPath(file.getPath())
          }).then(() => Promise.resolve(path.join(util.getProjectPath(), 'Process.class')))
          // else return .java file name
        } else return Promise.resolve(file.getPath());
      })
      .then(file => {
        this.toolbar.setProgress('Processing filters...');
        if (tagIn) {
          return util.executeCli('processtagged', {
            file: util.getRelativeProjectPath(file),
            in: tagIn,
            out: tagOut
          }, false);
        } else {
          return util.executeCli('process', {
            file: util.getRelativeProjectPath(file),
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
          detail: err,
          dismissable: true
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
    return this.file ? path.basename(this.file.path) : 'New ODF Editor';
  }

  getURI() {
    // Used by Atom to identify the view when toggling.
    return this.file ? this.file.path : 'atom://open-diabetes-filter';
  }
}
