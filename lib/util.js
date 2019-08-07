const cp = require('child_process');
const path = require('path');
const slash = require('slash');
const Docker = require('dockerode');
const {Writable} = require("stream");
const {StringDecoder} = require("string_decoder");

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
  if (atom.config.get('open-diabetes-filter.docker.enabled'))
    file = slash(file);
  return file;
}

// Docker

function getDocker() {
  if (atom.config.get('open-diabetes-filter.docker.remote')) {
    return new Docker({
      host: atom.config.get('open-diabetes-filter.docker.host'),
      port: atom.config.get('open-diabetes-filter.docker.port')
    })
  } else return new Docker();
}


function checkDocker(silent) {
  const docker = getDocker();
  docker.getImage('odv').inspect((error, image) => checkDockerImage(error, image, silent));
  docker.getImage('plotteria').inspect((error, image) => checkDockerImage(error, image, silent));
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
  const command = buildCliCommand('version', {}, false);
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

// vault stuff

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

// child processes

/**
 * Executes the cli asynchronously
 *
 * @param command config key used to get the command
 * @param arguments object representing variables in the command
 * @returns Promise<string> promise that resolves with the contents of stdout if successful, or rejects with the contents of stderr
 */
function executeCli(command, arguments = {}) {
  if (atom.config.get('open-diabetes-filter.docker.enabled')) {
    // execute with docker
    const cmd = buildCliCommand(command, arguments, true);
    console.debug(`Executing command on docker: ${cmd}`);
    const stdout = new BufferWritable();
    const stderr = new BufferWritable();
    return new Promise((resolve, reject) => {
      const docker = getDocker();
      docker.run('odv', splitCommandArgs(cmd), [stdout, stderr], {
        Tty: false,
        HostConfig: {
          Binds: [
            getProjectPath() + ':/mnt/project'
          ],
          AutoRemove: atom.config.get('open-diabetes-filter.docker.cleanup')
        },
        WorkingDir: '/mnt/project'
      }, {}, (err, data, container) => {
        if (data && data.StatusCode === 0)
          resolve(stdout.getBuffer());
        else reject(stderr.getBuffer());
      });
    });

  } else {
    // execute on system
    const cmd = buildCliCommand(command, arguments, false);
    console.debug(`Executing child process: ${cmd}`);
    return new Promise((resolve, reject) => {
      cp.exec(cmd, {
        cwd: getProjectPath(),   // set working directory to project path
      }, (error, stdout, stderr) => {
        if (error === null) {
          resolve(stdout);
        } else {
          reject(stderr);
        }
      });
    })
  }
}

/**
 * Spawns a cli process
 *
 * @param command config key used to get the command
 * @param arguments object representing variables in the command
 * @param stdout callback function that consumes stdout
 * @param stderr callback function that consumes stderr
 * @param mount additional mount for the docker container
 * @returns Promise<string> promise that resolves with no data if successful, or rejects with the status code on fail
 */
function spawnCli(command, arguments = {}, stdout = null, stderr = null, mount = null) {
  if (atom.config.get('open-diabetes-filter.docker.enabled')) {
    const cmd = buildCliCommand(command, arguments, true);
    // execute with docker
    console.debug(`Executing command on docker: ${cmd}`);
    return new Promise((resolve, reject) => {
      const docker = getDocker();
      const bind = [
        getProjectPath() + ':/mnt/project'
      ];
      if (mount != null)
        bind.push(mount);
      docker.run('odv', splitCommandArgs(cmd), [new CallbackWritable(stdout), new CallbackWritable(stderr)], {
        Tty: false,
        HostConfig: {
          Binds: bind,
          AutoRemove: atom.config.get('open-diabetes-filter.docker.cleanup')
        },
        WorkingDir: '/mnt/project'
      }, {}, (err, data, container) => {
        if (data && data.StatusCode === 0)
          resolve();
        else reject(data ? data.StatusCode : err);
      });
    });

  } else {
    // execute on system
    const cmd = buildCliCommand(command, arguments, false);
    console.debug(`Spawning child process: ${cmd}`);
    return new Promise((resolve, reject) => {
      let args = splitCommandArgs(cmd);
      const exec = args.shift();
      args = Object.freeze(args);
      const process = cp.spawn(exec, args, {
        cwd: getProjectPath(),
        windowsHide: true
      });
      process.on('close', (code, signal) => {
        if (code === 0)
          resolve();
        else reject(code);
      });
      if (stdout !== null) {
        process.stdout.on('data', chunk => stdout(chunk.toString('utf8')));
      }
      if (stderr != null) {
        process.stderr.on('data', chunk => stderr(chunk.toString('utf8')));
      }
    });
  }
}

function buildCliCommand(command, arguments, docker) {
  if (docker) {
    arguments.java = 'java';
    arguments.javac = 'javac';
    arguments.cli = '/opt/odv/dist/OpenDiabetesVault.jar';
  } else {
    arguments.java = atom.config.get('open-diabetes-filter.paths.java');
    arguments.javac = atom.config.get('open-diabetes-filter.paths.javac');
    arguments.cli = getCli();
  }

  return buildCommand(command, arguments);
}

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


// fs

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

module.exports = {
  getProjectPath, getModulePath, getRelativeProjectPath, checkProjectDirectory,
  getDocker, checkDocker,
  getCli, checkCli,
  getPlot, getPlotConfig, checkPlot,
  executeCli, spawnCli, buildCommand, splitCommandArgs,
  findCommonPath
};

class CallbackWritable extends Writable {
  constructor(callback) {
    super();
    this.callback = callback;
    const state = this._writableState;
    this._decoder = new StringDecoder(state.defaultEncoding);
    this.data = '';
  }

  _write(chunk, encoding, callback) {
    if (encoding === 'buffer') {
      chunk = this._decoder.write(chunk);
    }
    if (this.callback != null)
      this.callback(chunk);
    this.data += chunk;
    callback();
  }

  _final(callback) {
    this.data += this._decoder.end();
    if (this.callback != null)
      this.callback(this.data);
    callback();
  }
}

class BufferWritable extends Writable {
  constructor() {
    super();
    this.buffer = '';
    const state = this._writableState;
    this._decoder = new StringDecoder(state.defaultEncoding);
    this.data = '';
  }

  _write(chunk, encoding, callback) {
    if (encoding === 'buffer') {
      chunk = this._decoder.write(chunk);
    }
    this.data += chunk;
    callback();
  }

  _final(callback) {
    this.data += this._decoder.end();
    this.buffer += this.data;
    callback();
  }

  getBuffer() {
    return this.buffer;
  }
}
