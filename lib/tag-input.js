'use babel';

/** @jsx etch.dom */

import etch from 'etch';

export default class TagInput {
  constructor(properties, children) {
    this.properties = properties;
    this.children = children;
    etch.initialize(this);
  }

  render() {
    //TODO: get tags from CLI
    return (
      <div className="input-tag inline-block">
        <div style="display: inline-block">{this.children}</div>
        <input type="text" on={{focus: this.openList, blur: this.closeList}} placeholder="ALL" value={this.properties.value || ''} ref="input"/>
        <div className="tag-list" ref="list">
          <ol className="list-group">
            <TagInputItem list={this}>Tag 1</TagInputItem>
            <TagInputItem list={this}>Tag 2</TagInputItem>
            <TagInputItem list={this}>Tag 3</TagInputItem>
            <TagInputItem list={this}>Tag 4</TagInputItem>
            <TagInputItem list={this}>Tag 5</TagInputItem>
            <TagInputItem list={this}>Tag 6</TagInputItem>
            <TagInputItem list={this}>Tag 7</TagInputItem>
            <TagInputItem list={this}>Tag 8</TagInputItem>
            <TagInputItem list={this}>Tag 9</TagInputItem>
            <TagInputItem list={this}>Tag 10</TagInputItem>
            <TagInputItem list={this}>Tag 11</TagInputItem>
          </ol>
        </div>
      </div>
    );
  }

  openList() {
    // determine left margin of dropdown dynamically depending on width of child contents
    const margin = this.element.childNodes[0].offsetWidth;
    // set width of dropdown a little bit smaller then total width minus margin
    const width = this.element.offsetWidth - margin - 10;
    this.refs.list.style.marginLeft = margin + 'px';
    this.refs.list.style.width = width + 'px';
    this.refs.list.style.display = 'block';
  }

  closeList(event) {
    // this is executed as soon as the focus is taken off of the input
    // set timeout to allow for clicks on the actual list items to occur
    setTimeout(() => {
      if (document.activeElement !== event.target) {
        this.refs.list.style.display = 'none';
      }
    }, 100);
  }

  getTag() {
    return this.refs.input.value || 'ALL';
  }

  destroy() {
    etch.destroy(this);
  }

  update() {
    etch.update(this);
  }
}

class TagInputItem {
  constructor(properties, children) {
    this.list = properties.list;
    this.tag = children[0].text;
    etch.initialize(this);
  }

  render() {
    return <li on={{click: this.select}}>{this.tag}</li>
  }

  select() {
    this.list.refs.input.value = this.tag;
  }

  update() {
    etch.update(this);
  }
}
