'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import util from './util';

let tags = [];
let lastupdate = 0;

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
        <input type="text" on={{focus: this.openList, blur: this.closeList}} value={this.properties.value || ''} ref="input"/>
        <div className="tag-list" ref="list">
          <ol className="list-group">
            {tags.map(tag => <TagInputItem list={this}>{tag}</TagInputItem>)}
          </ol>
        </div>
      </div>
    );
  }

  openList() {
    if (Date.now() - lastupdate > 10 * 1000) {
      lastupdate = Date.now();
      util.executeCli('listtags', {}, false).then(stdout => {
        // tags are listed with their last modification date and the name, e.g.
        // 2019.06.24 18:54 -- ALL
        // split the tags using the match, get the name as all characters after the last space
        tags = stdout.match(/[0-9]{4}\.[0-9]{2}\.[0-9]{2} [0-9]{2}:[0-9]{2} -- (.+)/g)
          .map(tag => tag.substring(tag.lastIndexOf(' ') + 1));
        etch.update(this);
      })
    } else etch.update(this);

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
    return this.refs.input.value;
  }

  setTag(tag) {
    this.refs.input.value = tag;
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