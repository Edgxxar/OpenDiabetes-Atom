const fs = require('fs-extra');
const path = require('path');
const {Process} = require('./process');
const {checkProjectDirectory, getProjectPath} = require('./util');

function initializeVault() {
  new Process('init').execute()
    .then(result => {
      atom.notifications.addSuccess('Initialization finished.', {
        detail: result
      })
    }).catch(err => {
    atom.notifications.addError('Initialization failed!', {
      detail: err,
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
