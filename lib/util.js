const cp = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const slash = require('slash');
const Docker = require('dockerode');

// Docker

function isDockerEnabled() {
  return atom.config.get('open-diabetes-filter.docker.enabled');
}

function getDocker() {
  return new Promise((resolve, reject) => {
    if (atom.config.get('open-diabetes-filter.docker.remote')) {
      // load tls files asynchronously
      const cert = fs.readFile(atom.config.get('open-diabetes-filter.docker.cert'));
      const key = fs.readFile(atom.config.get('open-diabetes-filter.docker.key'));
      let cacert;
      if (atom.config.get('open-diabetes-filter.docker.noca')) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        cacert = Promise.resolve(undefined);
      } else cacert = fs.readFile(atom.config.get('open-diabetes-filter.docker.cacert'));

      Promise.all([cert, key, cacert])
      // after all tls files are loaded
        .then(files => {
          const docker = new Docker({
            protocol: atom.config.get('open-diabetes-filter.docker.protocol'),
            host: atom.config.get('open-diabetes-filter.docker.host'),
            port: atom.config.get('open-diabetes-filter.docker.port'),
            cert: files.shift(),    // Promise.all resolves in same order as input array
            key: files.shift(),
            ca: files.shift()
          });
          console.log(docker);
          resolve(docker);
        })
        // error with tls files
        .catch(err => {
          console.error(err);
          reject(err);
        });

    } else {
      resolve(new Docker());
    }
  });
}

function checkDocker(silent) {
  getDocker().then(docker => {
    docker.getImage('odv').inspect((error, image) => checkDockerImage(error, image, silent));
    docker.getImage('plotteria').inspect((error, image) => checkDockerImage(error, image, silent));
  }).catch(err => {
    atom.notifications.addError('Error while initiating docker!', {
      detail: err,
      dismissable: true
    });
  });
}

function checkDockerImage(error, image, silent) {
  if (error != null) {
    const notification = atom.notifications.addWarning('Could not find Docker image', {
      detail: error,
      dismissable: true,
      buttons: [{
        className: 'btn btn-warning',
        text: 'Open Settings',
        onDidClick: () => {
          atom.workspace.open('atom://config/packages/open-diabetes-filter');
          notification.dismiss();
        }
      }]
    });
  } else if (!silent) {
    atom.notifications.addSuccess('Docker image `' + image.RepoTags[0] + '` successfully found!');
  }
}

// CLI

function getCli() {
  if (atom.config.get('open-diabetes-filter.cli.native'))
    return path.resolve(getModulePath(), '..', 'bin', 'odv', 'OpenDiabetesVault.jar');
  else return atom.config.get('open-diabetes-filter.cli.custom');
}

function checkCli(silent) {
  const command = buildCommand('version', {
    java: atom.config.get('open-diabetes-filter.paths.java'),
    javac: atom.config.get('open-diabetes-filter.paths.javac'),
    cli: getCli()
  });
  cp.exec(command, (error, stdout, stderr) => {
    if (error !== null) {
      const notification = atom.notifications.addWarning('Invalid CLI defined', {
        detail: stderr,
        dismissable: true,
        buttons: [{
          className: 'btn btn-warning',
          text: 'Open Settings',
          onDidClick: () => {
            atom.workspace.open('atom://config/packages/open-diabetes-filter');
            notification.dismiss();
          }
        }]
      });
    } else if (!silent) {
      atom.notifications.addSuccess('ODV CLI successfully found!');
    }
  });
}

// Plot

function getPlot() {
  if (atom.config.get('open-diabetes-filter.plot.native'))
    return path.resolve(getModulePath(), '..', 'bin', 'plotteria', 'plot.py');
  else return atom.config.get('open-diabetes-filter.plot.custom');
}

function getPlotConfig() {
  if (atom.config.get('open-diabetes-filter.plot.config-native'))
    return path.resolve(getModulePath(), '..', 'bin', 'plotteria', 'config.ini');
  return atom.config.get('open-diabetes-filter.plot.config');
}

function checkPlot(silent) {
  const command = buildCommand('plotversion', {
    python: atom.config.get('open-diabetes-filter.paths.python'),
    plot: getPlot()
  });
  cp.exec(command, (error, stdout, stderr) => {
    if (error !== null) {
      const notification = atom.notifications.addWarning('Invalid Plot executable defined', {
        detail: stderr,
        dismissable: true,
        buttons: [{
          className: 'btn btn-warning',
          text: 'Open Settings',
          onDidClick: () => {
            atom.workspace.open('atom://config/packages/open-diabetes-filter');
            notification.dismiss();
          }
        }]
      });
    } else if (!silent) {
      atom.notifications.addSuccess('Plot generator successfully found!');
    }
  });
}

// project

function checkProjectDirectory() {
  if (atom.project.getPaths().length > 0)
    return true;
  const notification = atom.notifications.addWarning('No Project opened!', {
    description: 'You don\'t have any project directory opened.',
    dismissable: true,
    buttons: [{
      className: 'btn btn-warning',
      text: 'Open Project Directory',
      onDidClick: () => {
        atom.pickFolder(paths => {
          notification.dismiss();
          for (const path of paths) {
            atom.project.addPath(path, {
              mustExists: true,
              exact: true
            });
          }
        })
      }
    }]
  });
  return false;
}

// commands

function buildCommand(command, arguments = {}) {
  let cmd = atom.config.get('open-diabetes-filter.commands.' + command);
  for (const [key, value] of Object.entries(arguments)) {
    cmd = cmd.replace('%' + key + '%', value);
  }
  return cmd;
}

/**
 * Splits a command by whitespace but keeps quoted parts together. Allows for escaped quotes.
 *
 * @param command command string
 * @param quotes set to true to keep quotes around arguments
 * @returns Array<string> array of arguments for this command. First argument will be the executable
 */
function splitCommandArgs(command, quotes = false) {
  let args = command.match(/[^"\s]+|"(?:\\"|[^"])+"/g);  // split the command by whitespace but keep quoted parts together. Allows for escaped quotes
  if (!quotes)      // remove quotes
    args = args.map(arg => arg.startsWith('"') && arg.endsWith('"') ? arg.substring(1, arg.length - 1) : arg);
  return args;
}

// paths

function getModulePath() {
  return path.dirname(atom.packages.loadedPackages['open-diabetes-filter']['mainModulePath']);
}

function getProjectPath() {
  //TODO: better error messages if no project is opened!
  return atom.project.getPaths()[0];
}

/**
 * Returns the relative path from the current project to the given file. Used for commands executed in docker
 *
 * @param file Atom File object
 * @returns string relative path to the file
 */
function getRelativeProjectPath(file) {
  file = atom.project.relativizePath(file)[1];
  if (isDockerEnabled())
    file = slash(file);
  return file;
}

/**
 * Given a set of strings representing directory paths, will return a string representing that part of the directory tree that is common to all the directories.
 * @param input {array} set of paths
 * @param sep {string} single character directory separator
 * @returns {string} the common path
 */
function findCommonPath(input, sep = path.sep) {
  /**
   * Given an array of strings, return an array of arrays, containing the
   * strings split at the given separator
   * @param {!Array<!string>} a
   * @returns {!Array<!Array<string>>}
   */
  const splitStrings = a => a.map(i => i.split(sep));

  /**
   * Given an index number, return a function that takes an array and returns the
   * element at the given index
   * @param {number} i
   * @return {function(!Array<*>): *}
   */
  const elAt = i => a => a[i];

  /**
   * Transpose an array of arrays:
   * Example:
   * [['a', 'b', 'c'], ['A', 'B', 'C'], [1, 2, 3]] ->
   * [['a', 'A', 1], ['b', 'B', 2], ['c', 'C', 3]]
   * @param {!Array<!Array<*>>} a
   * @return {!Array<!Array<*>>}
   */
  const rotate = a => a[0].map((e, i) => a.map(elAt(i)));

  /**
   * Checks of all the elements in the array are the same.
   * @param {!Array<*>} arr
   * @return {boolean}
   */
  const allElementsEqual = arr => arr.every(e => e === arr[0]);

  return rotate(splitStrings(input)).filter(allElementsEqual).map(elAt(0)).join(sep);
}

// array stuff

function isUnique(value, index, self) {
  return self.indexOf(value) === index;
}

module.exports = {
  isDockerEnabled, getDocker, checkDocker,
  getCli, checkCli,
  getPlot, getPlotConfig, checkPlot,
  checkProjectDirectory,
  buildCommand, splitCommandArgs,
  getProjectPath, getModulePath, getRelativeProjectPath, findCommonPath,
  isUnique
};
