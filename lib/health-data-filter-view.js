'use babel';

import path from 'path';

export default class HealthDataFilterView {

  constructor(serializedState) {
    this.element = document.createElement('div');
    this.element.setAttribute('id', 'blockly-workspace');

    const modulePath = path.dirname(atom.packages.loadedPackages['health-data-filter']['mainModulePath']);
    const blocklyPath = path.join(modulePath, 'google-blockly');

    // load html
    const htmlPromise = this.loadHtml(path.join(modulePath, 'blockly-editor.html'));
    // load scripts in sequence
    const scriptPromise = [
      path.join(blocklyPath, 'blockly_compressed.js'),
      path.join(blocklyPath, 'msg', 'js', 'en.js'),
      path.join(blocklyPath, 'blocks_compressed.js')
    ].reduce((sequence, url) => {
      return sequence.then(() => {
        return this.loadScript(url);
      });
    }, Promise.resolve());

    Promise.all([htmlPromise, scriptPromise])
      .then((results) => {
        // html and scripts are loading in parallel, initialize Blockly afterwards
        console.log('Done!');
        this.element.innerHTML = results[0];

        const div = document.getElementById('blockly-div');
        const area = document.getElementById('blockly-area');
        const workspace = Blockly.inject(div, {
          toolbox: document.getElementById('blockly-toolbox')
        });
        const onresize = (e) => {
          if (atom.workspace.getCenter().getActivePaneItem() instanceof HealthDataFilterView) {
            div.style.width = area.offsetWidth + 'px';
            div.style.height = area.offsetHeight + 'px';
            Blockly.svgResize(workspace);
          }
        };
        atom.workspace.onDidStopChangingActivePaneItem(onresize);
        window.addEventListener('resize', onresize, false);
      })
      .catch((error) => {
        // Log any errors that occurred
        console.error(error);
      });
  }

  loadScript(url) {
    return new Promise((resolve, reject) => {
      console.log(`Loading script ${url}...`);
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

  loadHtml(url) {
    return new Promise((resolve, reject) => {
      console.log(`Loading file ${url}...`);
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
