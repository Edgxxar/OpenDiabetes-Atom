'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import csv from 'fast-csv';
import util from '../util';
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
        <input ref="label" className="input-text mb-1" type="text" placeholder="Name"
               value={this.currentSlice.label} on={{input: this.input}}/>
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
              this.loadCurrentSlice();
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
        this.refs.label.value = this.currentSlice.label;
      etch.update(this);
    });
  }

  input() {
    const label = this.refs.label.value.trim();
    if (label) {
      this.currentSlice.label = label;
      this.currentSlice.labelSource = 'manual';
    } else {
      this.currentSlice.label = undefined;
      this.currentSlice.labelSource = undefined;
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
        util.executeCli('importslice', {
          file: file,
          tag: tag
        }).then(() => atom.notifications.addSuccess('Slice saved to disk.'));
      });
  }

  toggleLabel() {
    this.label = !this.label;
    etch.update(this);
  }

  serialize() {
    return {
      currentSlices: this.currentSlice,
      tag: this.refs.tag.getTag(),
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
