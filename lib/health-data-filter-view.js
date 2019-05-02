'use babel';

import path from 'path';

export default class HealthDataFilterView {

  constructor(serializedState) {
    this.element = document.createElement('div');

    const area = document.createElement('div');
    area.setAttribute('id', 'blocklyArea');
    this.element.appendChild(area);

    const div = document.createElement('div');
    div.setAttribute('id', 'blocklyDiv');
    area.appendChild(div);

    const toolbox = document.createElement('xml');
    toolbox.setAttribute('id', 'toolbox');
    toolbox.style.setProperty('display', 'none');
    toolbox.innerHTML =
      '<block type="controls_if"></block>' +
      '<block type="controls_repeat_ext"></block>' +
      '<block type="logic_compare"></block>' +
      '<block type="math_number"></block>' +
      '<block type="math_arithmetic"></block>' +
      '<block type="text"></block>' +
      '<block type="text_print"></block>';
    this.element.appendChild(toolbox);

    const modulePath = path.dirname(atom.packages.loadedPackages['health-data-filter']['mainModulePath']);
    const blocklyPath = path.join(modulePath, 'google-blockly');
    console.log('Loading blockly...');
    this.loadScript(path.join(blocklyPath, 'blockly_compressed.js'))
      .then(() => {
        console.log('Loading messages...');

        return this.loadScript(path.join(blocklyPath, 'msg', 'js', 'en.js'))
      })
      .then(() => {
        console.log('Loading blocks...');

        return this.loadScript(path.join(blocklyPath, 'blocks_compressed.js'))
      })
      .then(() => {
        console.log('Finished loading blockly components!');

        const workspace = Blockly.inject(div, {
          toolbox: document.getElementById('toolbox')
        });
        const onresize = function (e) {
          if (atom.workspace.getCenter().getActivePaneItem() instanceof HealthDataFilterView) {
            div.style.width = area.offsetWidth + 'px';
            div.style.height = area.offsetHeight + 'px';
            Blockly.svgResize(workspace);
          }
        };
        atom.workspace.onDidStopChangingActivePaneItem(onresize);
        window.addEventListener('resize', onresize, false);
      });
  }

  loadScript(url) {
    return new Promise(function (resolve) {
      const script = document.createElement('script');
      script.classList.add('blocklyScript');
      script.src = url;
      script.addEventListener('load', function () {
        resolve(script);
      });
      document.body.appendChild(script);
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
