const cp = require('child_process');
const path = require('path');
const fs = require('fs');

function getProjectPath() {
  return atom.project.getPaths()[0];
}

function isVaultInitialized() {
  const vault = path.join(getProjectPath(), '.vault');
  return fs.existsSync(vault);
}

function sendWarningNoVaultInitialized() {
  atom.notifications.addWarning('No OpenDiabetesVault repository found in current project!', {
    buttons: [
      {
        className: 'btn btn-warning',
        text: 'Initialize now',
        onDidClick: initializeVault
      }
    ],
    description: 'The current project does not contain a `.vault` directory. You may initialize the repository now or switch to a different project.',
    dismissable: true
  });
}

function initializeVault() {
  // first check that CLI settings are correct
  executeCli('--version')
    .then(() => {
      // then execute init
      executeCli('init "' + getProjectPath() + '"')
        .then(message => {
          atom.notifications.addSuccess('Initialization finished.', {
            detail: message
          })
        })
        .catch(error => {
          atom.notifications.addError('Initialization failed!', {
            detail: error,
            dismissable: true
          })
        })
    })
    .catch(error => {
      atom.notifications.addError('No OpenDiabetesVault CLI found!', {
        buttons: [
          {
            className: 'btn btn-error',
            text: 'Open Settings',
            onDidClick: () => {
              atom.workspace.open('atom://open-diabetes-vault');
            }
          }
        ],
        detail: error,
        dismissable: true
      })
    })
}

function executeCli(command) {
  const cli = atom.config.get('odv.cli');
  if (cli !== undefined) {
    return new Promise((resolve, reject) => {
      cp.exec('java -jar "' + cli + '" ' + command, (error, stdout, stderr) => {
        if (error === null && !stderr) {
          resolve(stdout);
        } else {
          reject(stderr);
        }
      });
    });
  } else return Promise.reject('No CLI defined.');
}

module.exports = {getProjectPath, isVaultInitialized, sendWarningNoVaultInitialized};
