'use babel';

/** @jsx etch.dom */

import etch from 'etch';

export default class Modal {
  constructor(properties, children) {
    this.properties = properties;
    this.children = children;
    etch.initialize(this);
  }

  render() {
    return (
      <div className="modal-outer">
        <atom-panel className="modal modal-inner">
          {this.children}
        </atom-panel>
      </div>
    );
  }

  destroy() {
    etch.destroy(this);
  }

  update() {
    etch.update(this);
  }
}
