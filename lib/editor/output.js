'use babel';

/** @jsx etch.dom */

import etch from 'etch';

export default class Output {
  constructor() {
    this.code = '';
    etch.initialize(this);
  }

  render() {
    return (
      <div id="odf-output">
        <textarea id="odf-code" readOnly>{this.code}</textarea>
      </div>
    );
  }

  update(code) {
    this.code = code;
    etch.update(this);
  }
}
