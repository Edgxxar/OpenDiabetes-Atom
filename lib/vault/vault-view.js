'use babel';

import VaultCli from "./vault-cli";

export default class VaultView {

  constructor(serialized) {
    this.element = document.createElement('div');
    this.element.classList.add('vault-panel');
    const path = new VaultCli();
    this.element.appendChild(path.element);
  }

  getElement() {
    return this.element;
  }

  getTitle() {
    // Used by Atom for tab text
    return 'Vault Info';
  }

  getURI() {
    // Used by Atom to identify the view when toggling.
    return 'atom://open-diabetes-vault';
  }

  getDefaultLocation() {
    // This location will be used if the user hasn't overridden it by dragging the item elsewhere.
    // Valid values are "left", "right", "bottom", and "center" (the default).
    return 'right';
  }

  getAllowedLocations() {
    // The locations into which the item can be moved.
    return ['left', 'right'];
  }
}