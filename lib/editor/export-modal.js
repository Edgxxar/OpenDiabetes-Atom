'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import Modal from '../modal'
import TagInput from '../tag-input';
import util from '../util';

export default class ExportModal {
  constructor() {
    etch.initialize(this);
  }

  render() {
    return (
      <Modal ref="modal">
        <h2 className="modal-title">Data Export</h2>
        <div>Please choose how you want to export data in the current repository:</div>
        <div className="checklist-container">
          <div className="checklist-item" on={{click: this.setType}}>
            CSV
            <input type="radio" ref="csv"/>
            <span className="checklist-mark"/>
          </div>
          <div className="checklist-item" on={{click: this.setType}}>
            JSON
            <input type="radio" ref="json"/>
            <span className="checklist-mark"/>
          </div>
          <div className="checklist-item" on={{click: this.setType}}>
            Nightscout
            <input type="radio" ref="ns"/>
            <span className="checklist-mark"/>
          </div>
        </div>
        <div attributes={{style: 'margin-bottom: 5px'}}>Only export data with the following tag:</div>
        <TagInput ref="tag">Input tag:</TagInput>
        <br/>
        <div className="text-error" id="errorText"/>
        <button className="btn inline-block-tight btn-modal btn-warning" on={{click: this.export}}>Start Export</button>
        <button className="btn inline-block-tight btn-modal" on={{click: this.close}}>Cancel</button>
        <div className="process-output" id="exportOutput"/>
      </Modal>
    );
  }

  close() {
    this.refs.modal.destroy()
  }

  setType(event) {
    let target;
    // check if checklist-item div or checklist-mark span was clicked
    if (event.target.localName === 'div')
      target = event.target;
    else target = event.target.parentElement;

    switch (target.childNodes[0].data) {
      case 'CSV':
        this.refs.csv.setAttribute('checked', true);
        this.refs.json.removeAttribute('checked');
        this.refs.ns.removeAttribute('checked');
        this.type = 'ODV_CSV';
        break;
      case 'JSON':
        this.refs.csv.removeAttribute('checked');
        this.refs.json.setAttribute('checked', true);
        this.refs.ns.removeAttribute('checked');
        this.type = 'ODV_JSON';
        break;
      case 'Nightscout':
        this.refs.csv.removeAttribute('checked');
        this.refs.json.removeAttribute('checked');
        this.refs.ns.setAttribute('checked', true);
        this.type = 'NIGHTSCOUT';
        break;
    }
  }

  export(event) {
    if (!this.type) {
      document.getElementById('errorText').innerHTML = 'Please select an export type!';
      return;
    }
    document.getElementById('errorText').innerHTML = '';
    const button = event.target;
    button.setAttribute('disabled', true);
    const output = document.getElementById('exportOutput');

    let cmd, args;
    if (this.refs.tag.getTag() !== 'ALL') {
      cmd = 'exporttagged';
      args = {
        type: this.type,
        tag: this.refs.tag.getTag()
      }
    } else {
      cmd = 'export';
      args = {
        type: this.type
      }
    }

    util.spawnCli(cmd, args, stdout => {
      const msg = document.createElement('div');
      msg.classList.add('text-highlight');
      msg.innerHTML = stdout;
      output.appendChild(msg);
      output.scrollTop = output.scrollHeight;
    }, stderr => {
      const msg = document.createElement('div');
      msg.classList.add('text-error');
      msg.innerHTML = stderr;
      output.appendChild(msg);
      output.scrollTop = output.scrollHeight;
    })
      .then(() => {
        button.removeAttribute('disabled');
        //etch.destroy(this);
        atom.notifications.addSuccess('Import finished', {
          description: 'Import finished successfully.'
        });
      })
      .catch(() => {
        button.removeAttribute('disabled');
      });
  }

  update() {
    etch.update(this);
  }
}
