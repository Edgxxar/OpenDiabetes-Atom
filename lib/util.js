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

function checkCli(cli) {
  if (cli) {
    const command = atom.config.get('open-diabetes-filter.commands.version').replace('%cli%', cli);
    cp.exec(command, (error, stdout, stderr) => {
      if (error === null) {
        atom.notifications.addSuccess('Successfully changed CLI', {
          description: 'OpenDiabetesVault CLI version `' + stdout + '`'
        });
      } else {
        atom.notifications.addError('Invalid CLI defined', {
          detail: stderr
        });
      }
    });
  } else {
    atom.notifications.addError('No CLI defined', {
      description: 'There is no path for the OpenDiabetesVault command line interface executable defined.'
    });
  }
}

function isVaultInitialized() {
  const vault = path.join(getProjectPath(), '.vault');
  return fs.existsSync(vault);
}

function initializeVault() {
  // first check that CLI settings are correct
  executeCli('version')
    .then(() => {
      // then execute init
      executeCli('init', {
        path: getProjectPath()
      })
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

/**
 * Executes the cli asynchronously
 *
 * @param command config key used to get the command
 * @param arguments object representing variables in the command
 * @returns Promise<string> promise that resolves with the contents of stdout if successful, or rejects with the contents of stderr
 */
function executeCli(command, arguments = {}) {
  const cmd = buildCliCommand(command, arguments);
  return new Promise((resolve, reject) => {
    cp.exec(cmd, {
      cwd: getProjectPath(),   // set working directory to project path
    }, (error, stdout, stderr) => {
      if (error === null && !stderr) {
        resolve(stdout);
      } else {
        reject(stderr);
      }
    });
  });
}

/**
 * Spawns a cli process
 *
 * @param command config key used to get the command
 * @param arguments object representing variables in the command
 * @param stdout callback function that consumes stdout
 * @param stderr callback function that consumes stderr
 * @returns Promise<string> promise that resolves with status code 0 if successful, or rejects with the error code or signal on fail
 */
function spawnCli(command, arguments = {}, stdout = null, stderr = null) {
  let args = buildCliCommand(command, arguments)
    .match(/[^"\s]+|"(?:\\"|[^"])+"/g)  // split the command by whitespace but keep quoted parts together. Allows for escaped quotes
    .map(arg => arg.startsWith('"') && arg.endsWith('"') ? arg.substring(1, arg.length - 1) : arg);  // remove quotes
  const exec = args.shift();
  args = Object.freeze(args);
  return new Promise((resolve, reject) => {
    const process = cp.spawn(exec, args, {
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
}

function buildCliCommand(command, arguments) {
  const cli = atom.config.get('open-diabetes-filter.cli');
  let cmd = atom.config.get('open-diabetes-filter.commands.' + command)
    .replace('%cli%', cli);
  for (const [key, value] of Object.entries(arguments)) {
    cmd = cmd.replace('%' + key + '%', value);
  }
  return cmd;
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

module.exports = {
  getProjectPath, getModulePath,
  checkCli, isVaultInitialized, executeCli, spawnCli,
  warnNotInitialized,
  writeFile
};
