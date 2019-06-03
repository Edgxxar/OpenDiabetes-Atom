'use babel';

/** @jsx etch.dom */

import etch from 'etch';
import cp from 'child_process';

//TODO: prettier status highlight
export default class VaultCli {
  constructor() {
    this.status = 'initializing...';
    this.statusClass = 'hightlight';
    etch.initialize(this);

    this.checkCli();
  }

  checkCli() {
    const cli = atom.config.get('odv.cli');
    if (cli !== undefined) {
      this.status = 'checking...';
      this.statusClass = 'hightlight';

      cp.exec('java -jar "' + cli + '" --version', (error, stdout, stderr) => {
        if (error === null) {
          this.status = stdout;
          this.statusClass = 'hightlight-success';
        } else {
          this.status = stderr;
          this.statusClass = 'hightlight-error';
        }
        etch.update(this);
      });
    } else {
      this.status = 'no CLI found';
    }
    etch.update(this);
  }

  updateCli(event) {
    const cli = event.target.files;
    if (cli.length === 1) {
      atom.config.set('odv.cli', cli.item(0).path);
    } else {
      atom.config.unset('odv.cli');
    }
    this.checkCli();
  }

  render() {
    return (
      <div>
        Path to Vault CLI:
        <input type="file" accept=".jar" on={{change: this.updateCli}}/>
        <span class={this.statusClass}>{this.status}</span>
      </div>
    );
  }

  update(code) {
    etch.update(this);
  }
}
