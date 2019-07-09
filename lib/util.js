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

// child processes

/**
 * Executes the cli asynchronously
 *
 * @param command config key used to get the command
 * @param arguments object representing variables in the command
 * @returns Promise<string> promise that resolves with the contents of stdout if successful, or rejects with the contents of stderr
 */
function executeCli(command, arguments = {}) {
  const cmd = buildCliCommand(command, arguments);
  console.debug(`Executing command '${cmd}'`);

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
      console.log(stdout.getBuffer());
      if (data.StatusCode === 0)
        resolve(stdout.getBuffer());
      else reject(stderr.getBuffer());
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
  console.debug(`Spawning command '${cmd}'`);

  return new Promise((resolve, reject) => {
    const docker = getDocker();

    docker.run('odv', splitCommandArgs(cmd), [new CallbackWritable(stdout), new CallbackWritable(stderr)], {
      Tty: false,
      HostConfig: {
        Binds: [
          getProjectPath() + ':/mnt/project'
        ],
        AutoRemove: atom.config.get('open-diabetes-filter.docker-cleanup')
      },
      WorkingDir: '/mnt/project'
    }, {}, (err, data, container) => {
      if (data.StatusCode === 0)
        resolve();
      else reject(data.StatusCode);
    });
  });
}

function buildCliCommand(command, arguments) {
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
  return atom.project.relativizePath(file.getPath())[1];
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

function checkDockerImage(image) {
  const docker = getDocker();
  return docker.listImages().then(data => {
    for (const img of data) {
      if (img.RepoTags[0] === image + ':latest')
        return Promise.resolve();
    }
    atom.notifications.addWarning('No Docker image for ' + image + ' found!', {
      description: 'There is no Docker image for `' + image + '`.',
    });
    return Promise.reject();
  });
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

module.exports = {
  getProjectPath, getModulePath,
  isVaultInitialized,
  executeCli, spawnCli,
  buildCommand, splitCommandArgs,
  getRelativeProjectPath,
  getDocker, checkDockerImage,
  warnNotInitialized,
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
