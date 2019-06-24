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
 * @param failonstderr if set to true (default), any output in stderr will cause the promise to reject. Otherwise the promise will only reject if an error occured
 * @returns Promise<string> promise that resolves with the contents of stdout if successful, or rejects with the contents of stderr
 */
function executeCli(command, arguments = {}, failonstderr = true) {
  const cmd = buildCliCommand(command, arguments);
  console.debug(`Executing command ${cmd}...`);
  return new Promise((resolve, reject) => {
    cp.exec(cmd, {
      cwd: getProjectPath(),   // set working directory to project path
    }, (error, stdout, stderr) => {
      if (error === null && !(stderr && failonstderr)) {
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
  const cmd = buildCliCommand(command, arguments);
  console.debug(`Spawning command ${cmd}...`);
  let args = splitCommandArgs(cmd);
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

/**
 * Splits a command by whitespace but keeps quoted parts together. Allows for escaped quotes.
 *
 * @param command command string
 * @returns Array<string> array of arguments for this command. First argument will be the executable
 */
function splitCommandArgs(command) {
  return command.match(/[^"\s]+|"(?:\\"|[^"])+"/g)  // split the command by whitespace but keep quoted parts together. Allows for escaped quotes
    .map(arg => arg.startsWith('"') && arg.endsWith('"') ? arg.substring(1, arg.length - 1) : arg);   // remove quotes
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

function mkdir(directory) {
  // split dirs by separator
  const dirs = directory.split(path.sep);
  // collect paths from root to full path
  const paths = [];
  for (let i = 0; i < dirs.length; i++) {
    paths.push(path.join(...dirs.slice(0, i + 1)))
  }
  // on windows remove first element, as this cannot be created (first element will be the drive C:., D:. etc)
  // TODO: test this on linux
  if (process.platform === 'win32')
    paths.shift();
  // check paths one after the other and create them if necessary
  return paths.reduce((p, path) => {
    return p.then(() => exists(path)).then(exists => {
      if (exists)
        return Promise.resolve();
      else return new Promise((resolve, reject) => {
        // create path
        fs.mkdir(path, err => {
          if (err)
            reject(err);
          else resolve();
        })
      })
    });
  }, Promise.resolve());
}

function exists(path) {
  return new Promise(resolve => {
    fs.access(path, err => {
      if (err)
        resolve(false);
      else resolve(true);
    })
  })
}

// plot

function checkPlot(plot) {
  if (plot) {
    const command = atom.config.get('open-diabetes-filter.commands.plotversion').replace('%plot%', plot);
    cp.exec(command, (error, stdout, stderr) => {
      if (error === null) {
        atom.notifications.addSuccess('Successfully changed plot executable', {
          description: 'OpenDiabetes plot version `' + stdout + '`'
        });
      } else {
        atom.notifications.addError('Invalid plot executable defined', {
          detail: stderr
        });
      }
    });
  } else {
    atom.notifications.addError('No plot executable defined', {
      description: 'There is no path for the plot executable defined.'
    });
  }
}

module.exports = {
  getProjectPath, getModulePath,
  checkCli, isVaultInitialized, executeCli, spawnCli,
  splitCommandArgs,
  warnNotInitialized,
  writeFile, mkdir, exists,
  checkPlot
};
