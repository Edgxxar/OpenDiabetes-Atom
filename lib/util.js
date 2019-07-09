const cp = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const Docker = require('dockerode');
const {Writable} = require("stream");
const {StringDecoder} = require("string_decoder");

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
      executeCli('init')
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
        detail: error,
        dismissable: true
      })
    })
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
  if (atom.config.get('open-diabetes-filter.docker')) {
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
          AutoRemove: atom.config.get('open-diabetes-filter.docker-cleanup')
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
  if (atom.config.get('open-diabetes-filter.docker')) {
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
          AutoRemove: atom.config.get('open-diabetes-filter.docker-cleanup')
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
  if (docker)
    arguments.cli = '/opt/odv/dist/OpenDiabetesVault.jar';
  else
    arguments.cli = atom.config.get('open-diabetes-filter.cli');

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

/**
 * Returns the relative path from the current project to the given file. Used for commands executed in docker
 *
 * @param file Atom File object
 * @returns string relative path to the file
 */
function getRelativeProjectPath(file) {
  return atom.project.relativizePath(file)[1];
}

// Docker

function getDocker() {
  if (atom.config.get('open-diabetes-filter.docker-remote')) {
    return new Docker({
      host: atom.config.get('open-diabetes-filter.docker-host'),
      port: atom.config.get('open-diabetes-filter.docker-port')
    })
  } else return new Docker();
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
  getProjectPath, getModulePath,
  isVaultInitialized,
  executeCli, spawnCli,
  buildCommand, splitCommandArgs,
  getRelativeProjectPath,
  getDocker,
  warnNotInitialized,
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
