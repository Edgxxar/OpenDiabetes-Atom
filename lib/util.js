const cp = require('child_process');
const path = require('path');
const fs = require('fs');

// paths

function getModulePath() {
  return path.dirname(atom.packages.loadedPackages['open-diabetes-filter']['mainModulePath']);
}

function getProjectPath() {
  return atom.project.getPaths()[0];
}

// vault stuff

function isVaultInitialized() {
  const vault = path.join(getProjectPath(), '.vault');
  return fs.existsSync(vault);
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
      cp.exec('java -jar "' + cli + '" ' + command, {
        cwd: getProjectPath(),   // set working directory to project path
      }, (error, stdout, stderr) => {
        if (error === null && !stderr) {
          resolve(stdout);
        } else {
          reject(stderr);
        }
      });
    });
  } else return Promise.reject('No CLI defined.');
}

function spawnCli(arguments, stdout = null, stderr = null) {
  const cli = atom.config.get('odv.cli');
  if (cli !== undefined) {
    return new Promise((resolve, reject) => {
      const process = cp.spawn('java', [
        '-jar', cli, ...arguments
      ], {
        cwd: getProjectPath(),
        windowsHide: true
      });
      process.on('close', (code, signal) => {
        if (code === 0)
          resolve(code);
        else reject(code !== null ? code : signal);
      });
      if (stdout !== null) {
        process.stdout.on('data', chunk => stdout(chunk.toString('utf8')));
      }
      if (stderr != null) {
        process.stderr.on('data', chunk => stderr(chunk.toString('utf8')));
      }
    });
  } else return Promise.reject('No CLI defined.');
}

// notifications

function warnNotInitialized() {
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

// filesystem

function writeFile(file, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(file, content, err => {
      if (err === null)
        resolve();
      else reject(err);
    })
  })
}

module.exports = {writeFile, getProjectPath, getModulePath, executeCli, spawnCli, isVaultInitialized, warnNotInitialized};
