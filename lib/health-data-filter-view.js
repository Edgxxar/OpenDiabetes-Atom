'use babel';

import path from 'path';

export default class HealthDataFilterView {

  constructor(serializedState) {
    this.element = document.createElement('div');
    this.element.setAttribute('id', 'blockly-workspace');

    const modulePath = path.dirname(atom.packages.loadedPackages['health-data-filter']['mainModulePath']);
    const blocklyPath = path.join(modulePath, 'google-blockly');

    // Load the following
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
      // Load editor html
      this.getResource(path.join(modulePath, 'blockly-editor.html')),
      // Load blocks
      this.getResource(path.join(blocklyPath, 'blocks', 'main.json')),
      this.getResource(path.join(blocklyPath, 'blocks', 'importers.json')),
      this.getResource(path.join(blocklyPath, 'blocks', 'exporters.json')),
      this.getResource(path.join(blocklyPath, 'blocks', 'values.json')),
      this.getResource(path.join(blocklyPath, 'blocks', 'filters.json'))
    ]).then((results) => {
      // After all resources are loaded initialize Blockly
      console.log('Done, initializing workspace...');
      // Blockly
      results.shift();
      // editor
      this.element.innerHTML = results.shift();
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

      // initialize Blockly
      const div = document.getElementById('blockly-div');
      const area = document.getElementById('blockly-area');
      const workspace = Blockly.inject(div, {
        toolbox: document.getElementById('blockly-toolbox')
      });
      const onresize = () => {
        if (atom.workspace.getCenter().getActivePaneItem() instanceof HealthDataFilterView) {
          div.style.width = area.offsetWidth + 'px';
          div.style.height = area.offsetHeight + 'px';
          Blockly.svgResize(workspace);
        }
      };
      atom.workspace.onDidStopChangingActivePaneItem(onresize);
      window.addEventListener('resize', onresize, false);
      onresize();
      console.log('Done!');

      this.overwritePromts();
      Blockly.Xml.domToWorkspace(document.getElementById('startBlocks'), workspace);
      workspace.registerButtonCallback('createVariable', () => {
        Blockly.Variables.createVariableButtonHandler(workspace)
      });
      workspace.addChangeListener(() => {
        document.getElementById('blockly-code').value = Blockly.ODF.workspaceToCode(workspace);
      });
    }).catch((error) => {
      // Log any errors that occurred
      console.error(error);
    });
  }

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
  }

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
  }

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
        modal.remove();
        callback(input.value || def);
      });
      modal.appendChild(submit);
      const cancel = document.createElement('button');
      cancel.classList.add('btn', 'btn-error', 'inline-block-tight', 'btn-modal');
      cancel.innerText = 'Cancel';
      cancel.addEventListener('click', () => {
        modal.remove();
        callback(null);
      });
      modal.appendChild(cancel);
      outerDiv.appendChild(modal);
      editor.appendChild(outerDiv);
    }
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
  }

  // Tear down any state and detach
  destroy() {
    document.querySelectorAll('.blocklyScript').forEach((e) => e.remove());
    document.querySelectorAll('.blocklyTooltipDiv').forEach((e) => e.remove());
    document.querySelectorAll('.blocklyDropDownDiv').forEach((e) => e.remove());
    document.querySelectorAll('.blocklyWidgetDiv').forEach((e) => e.remove());
    this.element.remove();
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
    return 'atom://health-data-filter';
  }
}