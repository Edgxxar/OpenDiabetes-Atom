'use babel';

import {xml2js} from 'xml-js';
import OdfOutput from "./odf-output";
import OdfToolbar from "./odf-toolbar";

export default class OdfEditorView {

  blockly_injected = false;
  workspace = undefined;

  constructor(serialized) {
    this.serialized = serialized;

    this.element = document.createElement('div');
    this.element.setAttribute('id', 'odf-editor');

    this.toolbar = new OdfToolbar();
    this.element.appendChild(this.toolbar.element);

    this.area = document.createElement('div');
    this.area.setAttribute('id', 'blockly-area');
    this.div = document.createElement('div');
    this.div.setAttribute('id', 'blockly-div');
    this.area.appendChild(this.div);
    this.element.appendChild(this.area);

    this.output = new OdfOutput();
    this.element.appendChild(this.output.element);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    let workspace;
    if (this.workspace instanceof Blockly.Workspace) {
      workspace = xml2js(Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(this.workspace)));
    }
    return {
      deserializer: 'open-diabetes-filter/OdfEditorView',
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
