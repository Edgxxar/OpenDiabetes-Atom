'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import csv from 'fast-csv';
import Modal from '../modal'

export default class LabelModal {
  constructor(plot, pdf) {
    this.plot = plot;
    this.pdf = pdf;
    this.slices = [];
    const match = pdf.match(/^plot_[a-z]+_([0-9]{6})_([0-9]+)\.pdf$/);
    if (!Array.isArray(match) || match.length < 3 || !match[1] || !match[2]) {
      atom.notifications.addError('Invalid file name! Could not find date or number.', {
        detail: pdf,
        dismissable: true
      });
      return;
    }
    let date = match[1];
    // to compare the date with rows in the slice file, format it as 'yyyy-mm-dd'
    date = '20' + date.slice(0, 2) + '-' + date.slice(2, 4) + '-' + date.slice(4, 6);
    const number = parseInt(match[2]);

    plot.checkSliceExists().then(exists => {
      if (!exists) {
        atom.notifications.addError('Could not find slice file!', {
          detail: plot.getSlicePath(),
          dismissable: true
        });
        return;
      }

      const slices = [];
      csv.parseFile(plot.getSlicePath(), {headers: true})
        .on('data', row => {
          if (row.timestamp.startsWith(date))
            slices.push(row);
          this.slices.push(row);
        })
        .on('end', () => {
          if (slices.length < number + 1) {
            atom.notifications.addError('Invalid number of slices found!', {
              description: 'Expected at least **' + (number + 1) + '** slices but found **' + slices.length + '** for *' + date + '*.',
              dismissable: true
            });
            return;
          }
          this.slice = slices[number];

          etch.initialize(this);
          plot.element.appendChild(this.element);
        });
    });
  }

  render() {
    return (
      <Modal ref="modal">
        <h2 className="modal-title">Label Slice</h2>
        <div className="mb-1">What name should this label get?</div>
        <input ref="label" className="input-text mb-1" type="text" placeholder="Name" value={this.slice.label}/>
        <div className="mb-1">Start of Slice:</div>
        <input ref="timestamp" className="input-text mb-1" type="text" value={this.slice.timestamp}/>
        <div className="mb-1">Duration:</div>
        <input ref="duration" className="input-text" type="text" value={this.slice.duration}/>
        <button className="btn inline-block-tight btn-modal btn-warning" on={{click: this.label}}>Create Label</button>
        <button className="btn inline-block-tight btn-modal" on={{click: this.close}}>Cancel</button>
      </Modal>
    );
  }

  label() {
    this.slice.label = this.refs.label.value;
    this.slice.labelSource = 'manual';

    csv.writeToPath(this.plot.getSlicePath(), this.slices, {headers: true})
      .on('finish', () => {
        atom.notifications.addSuccess('Slice *' + this.slice.timestamp + '* successfully labeled as `' + this.slice.label + '`.');
        this.close();
      });
  }

  close() {
    this.refs.modal.destroy()
  }

  update() {
    etch.update(this);
  }
}
