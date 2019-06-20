'use babel';

/** @jsx etch.dom */

import etch from 'etch';

export default class TagInput {
  constructor(properties, children) {
    this.children = children;
    etch.initialize(this);
  }

  render() {
    //TODO: get tags from CLI
    return (
      <div className="input-tag inline-block">
        <div style="display: inline-block">{this.children}</div>
        <input type="text" on={{focus: this.openList, blur: this.closeList}} placeholder="ALL" ref="input"/>
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
    const margin = this.element.childNodes[0].offsetWidth;
    const width = this.element.offsetWidth - margin - 10;
    this.refs.list.style.marginLeft = margin + 'px';
    this.refs.list.style.width = width + 'px';
    this.refs.list.style.display = 'block';
  }

  closeList(event) {
    setTimeout(() => {
      if (document.activeElement !== event.target) {
        this.refs.list.style.display = 'none';
      }
    }, 100);
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
