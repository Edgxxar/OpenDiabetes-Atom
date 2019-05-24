'use babel';

import OdfEditorView from './odf-editor-view';
import {CompositeDisposable, Disposable} from 'atom';

import {js2xml} from "xml-js";
import path from "path";
import etch from 'etch';

export default {

  subscriptions: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable(
      // Add an opener for our view.
      atom.workspace.addOpener(uri => {
        if (uri === 'atom://open-diabetes-filter') {
          return new OdfEditorView();
        }
      }),

      // Register command that toggles this view
      atom.commands.add('atom-workspace', {
        'open-diabetes-filter:toggle': () => this.toggle()
      }),

      // Destroy any ActiveEditorInfoViews when the package is deactivated.
      new Disposable(() => {
        atom.workspace.getPaneItems().forEach(item => {
          if (item instanceof OdfEditorView) {
            item.destroy();
          }
        });
      })
    );

    // coordinate etch's DOM interactions with atom
    etch.setScheduler(atom.views);

    this.loadBlockly()
  },

  /**
   * Loads Blockly scripts and injects Blockly into existing editors
   */
  loadBlockly() {
    const modulePath = path.dirname(atom.packages.loadedPackages['open-diabetes-filter']['mainModulePath']);
    const blocklyPath = path.join(modulePath, 'google-blockly');
    Promise.all([
      // Load Blockly in sequence
      [
        path.join(blocklyPath, 'blockly_compressed.js'),
        path.join(blocklyPath, 'msg', 'js', 'en.js'),
        path.join(blocklyPath, 'blocks_compressed.js'),
        path.join(blocklyPath, 'generators', 'odf.js')
      ].reduce((sequence, url) => {
        return sequence.then(() => {
          return this.loadScript(url);
        });
      }, Promise.resolve()),
      // Load toolbox
      this.getResource(path.join(blocklyPath, 'toolbox.xml')),
      this.getResource(path.join(blocklyPath, 'startblocks.xml')),
      // Load blocks
      this.getResource(path.join(blocklyPath, 'blocks', 'main.json')),
      this.getResource(path.join(blocklyPath, 'blocks', 'importers.json')),
      this.getResource(path.join(blocklyPath, 'blocks', 'exporters.json')),
      this.getResource(path.join(blocklyPath, 'blocks', 'values.json')),
      this.getResource(path.join(blocklyPath, 'blocks', 'filters.json'))
    ]).then((results) => {
      // After all resources are loaded initialize Blockly
      // Blockly
      results.shift();
      // Toolbox
      const toolbox = results.shift();
      const startblocks = results.shift();
      // blocks
      let block;
      while ((block = results.shift()) !== undefined) {
        block = JSON.parse(block);
        if (Array.isArray(block)) {
          block.forEach(loadBlock);
        } else loadBlock(block);
      }

      function loadBlock(block) {
        Blockly.Blocks[block.type] = {
          init: function () {
            this.jsonInit(block);
          }
        }
      }

      this.overwritePromts();
      console.log('Successfully loaded Blockly.');

      // inject into current editor if open
      if (atom.workspace.getCenter().getActivePaneItem() instanceof OdfEditorView) {
        const item = atom.workspace.getCenter().getActivePaneItem();
        if (!item.blockly_injected)
          this.injectBlockly(item, toolbox, startblocks);
        this.resizeBlockly(item);
      }

      // listen for future editors
      this.subscriptions.add(atom.workspace.getCenter().onDidStopChangingActivePaneItem(item => {
        if (item instanceof OdfEditorView) {
          if (!item.blockly_injected)
            this.injectBlockly(item, toolbox, startblocks);
          this.resizeBlockly(item);
        }
      }));
    }).catch((error) => {
      // Log any errors that occurred
      console.error(error)
    });
  },

  /**
   * Injects blockly into an editor
   * @param editor {OdfEditorView} the editor view
   * @param toolbox Toolbox XML
   * @param startblocks Starting blocks XML
   */
  injectBlockly(editor, toolbox, startblocks) {
    editor.workspace = Blockly.inject(editor.div, {
      toolbox: toolbox
    });
    //window.addEventListener('resize', onresize, false);

    //if (serialized !== undefined)
    //  Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(serialized), this.workspace);
    Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(startblocks), editor.workspace);
    editor.workspace.registerButtonCallback('createVariable', () => {
      Blockly.Variables.createVariableButtonHandler(editor.workspace)
    });
    editor.workspace.addChangeListener(() => {
      editor.output.update(Blockly.ODF.workspaceToCode(editor.workspace));
    });
    editor.blockly_injected = true;
  },

  /**
   * Resizes the editor
   * @param editor {OdfEditorView} the editor view
   */
  resizeBlockly(editor) {
    editor.div.style.width = editor.area.offsetWidth + 'px';
    editor.div.style.height = editor.area.offsetHeight + 'px';
    Blockly.svgResize(editor.workspace);
  },

  loadScript(url) {
    return new Promise((resolve, reject) => {
      console.log(`Loading script from ${url}...`);
      const script = document.createElement('script');
      script.classList.add('blocklyScript');
      script.src = url;
      script.onload = () => {
        resolve(script);
      };
      script.onerror = () => {
        reject(Error('System error'));
      };
      document.body.appendChild(script);
    });
  },

  getResource(url) {
    return new Promise((resolve, reject) => {
      console.log(`Loading resource from ${url}...`);
      const req = new XMLHttpRequest();
      req.open('GET', url);
      req.onload = () => {
        if (req.status === 200)
          resolve(req.responseText);
        else reject(Error(req.statusText));
      };
      req.onerror = () => {
        reject(Error('System error'));
      };
      req.send();
    });
  },

  overwritePromts() {
    const editor = this.element;
    Blockly.prompt = function (message, def, callback) {
      const outerDiv = document.createElement('div');
      outerDiv.classList.add('modal-outer');
      const modal = document.createElement('atom-panel');
      modal.classList.add('modal', 'modal-inner');
      const label = document.createElement('label');
      label.innerText = message;
      modal.appendChild(label);
      const input = document.createElement('input');
      input.classList.add('input-text');
      input.setAttribute('type', 'text');
      input.setAttribute('placeholder', def);
      modal.appendChild(input);
      const submit = document.createElement('button');
      submit.classList.add('btn', 'btn-primary', 'inline-block-tight', 'btn-modal');
      submit.innerText = 'Ok';
      submit.addEventListener('click', () => {
        outerDiv.remove();
        callback(input.value || def);
      });
      modal.appendChild(submit);
      const cancel = document.createElement('button');
      cancel.classList.add('btn', 'btn-error', 'inline-block-tight', 'btn-modal');
      cancel.innerText = 'Cancel';
      cancel.addEventListener('click', () => {
        outerDiv.remove();
        callback(null);
      });
      modal.appendChild(cancel);
      outerDiv.appendChild(modal);
      editor.appendChild(outerDiv);
      // focus on input after adding to dom
      input.focus();
    }
  },

  deserialize(state) {
    let workspace;
    if (state.workspace !== undefined)
      workspace = js2xml(state.workspace);
    return new OdfEditorView(workspace);
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  toggle() {
    atom.workspace.toggle('atom://open-diabetes-filter')
  }

};
