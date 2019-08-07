const {Process} = require('./process');
const {checkProjectDirectory, getProjectPath} = require('./util');
const fs = require('fs-extra');
const path = require('path');

function initializeVault() {
  const init = new Process('init');
  init.execute()
    .then(() => {
      atom.notifications.addSuccess('Initialization finished.', {
        detail: init.stdout
      })
    }).catch(err => {
    atom.notifications.addError('Initialization failed!', {
      detail: init.stderr,
      dismissable: true
    })
  });
}

function checkVaultInitialized() {
  return new Promise(resolve => {
    if (!checkProjectDirectory()) {
      resolve(false);
      return;
    }
    const vault = path.join(getProjectPath(), '.vault');
    fs.exists(vault).then(exists => {
      if (exists) {
        resolve(true);
        return;
      }
      const notification = atom.notifications.addWarning('No OpenDiabetesVault repository found in current project!', {
        buttons: [
          {
            className: 'btn btn-warning',
            text: 'Initialize now',
            onDidClick: () => {
              notification.dismiss();
              this.initializeVault();
            }
          }
        ],
        description: 'The current project does not contain a `.vault` directory. You may initialize the repository now or switch to a different project.',
        dismissable: true
      });
      resolve(false);
    });
  });
}

module.exports = {
  checkVaultInitialized, initializeVault
};
