'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import csv from 'fast-csv';
import util from '../util';
import {Process} from '../process';
import TagInput from '../tag-input';

export default class SliceLabel {
  slices = [];
  currentSlice = null;
  tag = null;
  label = false;
  loading = null;
  error = false;

  constructor(properties) {
    this.plot = properties.plot;
    if (properties.serialized) {
      this.currentSlice = properties.serialized.currentSlice;
      this.tag = properties.serialized.tag;
      this.label = properties.serialized.label;
    }

    etch.initialize(this);
  }

  render() {
    if (!this.label || !this.currentSlice)
      return <div/>;

    const error = [];
    if (this.error)
      error.push(<div className="text-error">Please choose a tag!</div>);
    return (
      <div className="native-key-bindings" style="max-width: 400px; margin-left: 5px">
        <h2 className="mb-1">Label Slice</h2>
        <div className="mb-1">What name should this label get?</div>
        <SliceLabelInput ref="label" value={this.currentSlice.label} slices={this}/>
        <div className="mb-1">Start of Slice: <strong>{this.currentSlice.timestamp}</strong></div>
        <div className="mb-1">Duration: <strong>{this.currentSlice.duration}</strong> minutes</div>
        {error}
        <div className="block">
          <TagInput ref="tag" value={this.tag} title="Choose tag for import"/>
          <button className="btn inline-block btn-warning" on={{click: this.save}}>Save Labels</button>
        </div>
      </div>
    );
  }

  loadSlices() {
    if (this.loading == null)
      this.loading = new Promise((resolve, reject) => {
        this.plot.checkSliceExists().then(exists => {
          if (!exists) {
            this.loading = null;
            reject();
            return;
          }
          const slices = [];
          csv.parseFile(this.plot.getSlicePath(), {headers: true})
            .on('data', row => {
              slices.push(row);
            })
            .on('end', () => {
              this.slices = slices;
              resolve();
            });
        })
      });
    return this.loading;
  }

  unloadSlices() {
    this.loading = null;
  }

  loadCurrentSlice() {
    this.loadSlices().then(() => {
      const toolbar = this.plot.refs.toolbar;
      if (!toolbar.hasSlice()) {
        this.currentSlice = null;
        etch.update(this);
        return;
      }

      const number = this.plot.refs.toolbar.currentPage;
      if (this.slices.length < number) {
        atom.notifications.addError('Invalid number of slices found!', {
          description: 'Expected at least ' + number + ' slices but found ' + this.slices.length + '.',
          dismissable: true
        });
        return;
      }
      this.currentSlice = this.slices[number - 1];
      if (this.refs.label)
        this.refs.label.setLabel(this.currentSlice.label, false);
      etch.update(this);
    }).catch(() => null);
  }

  input(label) {
    if (label) {
      this.currentSlice.label = label;
      this.currentSlice.labelSource = 'manual';
    } else {
      this.currentSlice.label = '';
      this.currentSlice.labelSource = '';
    }
  }

  save() {
    const tag = this.refs.tag.getTag();
    if (!tag) {
      this.error = true;
      etch.update(this);
      return;
    }
    this.error = false;
    etch.update(this);

    const file = this.plot.getSlicePath();
    csv.writeToPath(file, this.slices, {headers: true})
      .on('finish', () => {
        new Process('importslice', {
          file: file,
          tag: tag
        }).execute().then(() => atom.notifications.addSuccess('Slice saved to disk.'));
      });
  }

  toggleLabel() {
    this.label = !this.label;
    etch.update(this);
  }

  serialize() {
    return {
      currentSlices: this.currentSlice,
      tag: this.refs.tag ? this.refs.tag.getTag() : null,
      label: this.label
    }
  }

  destroy() {
    etch.destroy(this);
  }

  update() {
    etch.update(this);
  }
}

class SliceLabelInput {
  constructor(properties) {
    this.value = properties.value;
    this.slices = properties.slices;
    etch.initialize(this);
  }

  render() {
    const items = this.slices.slices
      .filter(s => s.label)
      .map(s => s.label)
      .filter(util.isUnique)
      .sort()
      .map(label => <SliceLabelItem input={this} label={label}/>);
    return (
      <div ref="div">
        <input ref="input" className="input-text mb-1" type="text" placeholder="Name" value={this.value}
               on={{focus: this.openList, blur: this.closeList, input: this.input}}/>
        <div className="tag-list" ref="list">
          <ol className="list-group">
            {items}
          </ol>
        </div>
      </div>
    );
  }

  openList() {
    // set width of dropdown a little bit smaller then total width
    const width = this.element.offsetWidth - 20;
    this.refs.list.style.marginLeft = '10px';
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

  input() {
    this.slices.input(this.getLabel());
  }

  setLabel(label, callback = true) {
    this.refs.input.value = label;
    if (callback)
      this.slices.input(label);
  }

  getLabel() {
    return this.refs.input.value;
  }

  update() {
    etch.update(this);
  }
}

class SliceLabelItem {
  constructor(properties) {
    this.input = properties.input;
    this.label = properties.label;
    etch.initialize(this);
  }

  render() {
    return <li on={{click: this.select}}>{this.label}</li>
  }

  select() {
    this.input.setLabel(this.label);
  }

  update(properties) {
    this.label = properties.label;
    etch.update(this);
  }
}
