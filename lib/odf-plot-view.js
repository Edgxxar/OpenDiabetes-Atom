'use babel';

export default class OdfPlotView {

  constructor(serialized) {
    this.element = document.createElement('div');
    this.element.innerHTML = 'Hello World';
  }

  getElement() {
    return this.element;
  }

  getTitle() {
    // Used by Atom for tab text
    return 'Plot View';
  }

  getURI() {
    // Used by Atom to identify the view when toggling.
    return 'atom://open-diabetes-plot';
  }
}
