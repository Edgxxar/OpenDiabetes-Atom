const cp = require('child_process');
const uuid = require('uuid/v4');
const {Writable} = require('stream');
const {StringDecoder} = require('string_decoder');
const {isDockerEnabled, getDocker, getCli, getPlot, getPlotConfig, buildCommand, splitCommandArgs, getProjectPath} = require('./util');
const {CLI, JAVAC, PLOT} = require('./process-type');

const __running = {};

function disposeAll() {
  for (const process of Object.values(__running)) {
    process.dispose();
  }
}

/**
 * A class representing a process executing a command defined in the settings.
 * The process can be executed only once, using the `execute()` method.
 * It is possible to assign consumer functions to the `onstdout` and `onstderr` fields.
 */
class Process {
  /**
   * Creates a new Process. The process is not executed until the `execute()` method is called.
   * The process can be disposed using the `dispose()` method.
   *
   * @param {string} command Command defined in settings. Assumes `open-diabetes-filter.commands` namespace.
   * @param {Object} args Arguments object. Each key represents a variable which will be replaced with the value.
   * @param {string} type Type of the command. Constants defined in `process-type.js`
   * @param {boolean} docker determines if this process will be executed in a docker container
   */
  constructor(command, args = {}, type = CLI, docker = isDockerEnabled()) {
    // if docker is used, different values are needed for java, javac, python, cli, plot and config
    if (docker) {
      switch (type) {
        case CLI:
          this.docker_image = 'odv';
          args.java = 'java';
          args.cli = '/opt/odv/dist/OpenDiabetesVault.jar';
          break;
        case JAVAC:
          this.docker_image = 'odv';
          args.javac = 'javac';
          args.cli = '/opt/odv/dist/OpenDiabetesVault.jar';
          break;
        case PLOT:
          this.docker_image = 'plotteria';
          args.python = 'python';
          args.plot = '/tmp/plotteria/plot.py';
          args.config = '/tmp/plotteria/config.ini';
          break;
      }
    } else {
      switch (type) {
        case CLI:
          args.java = atom.config.get('open-diabetes-filter.paths.java');
          args.cli = getCli();
          break;
        case JAVAC:
          args.javac = atom.config.get('open-diabetes-filter.paths.javac');
          args.cli = getCli();
          break;
        case PLOT:
          args.python = atom.config.get('open-diabetes-filter.paths.python');
          args.plot = getPlot();
          args.config = getPlotConfig();
          break;
      }
    }

    // build command
    let cmd = buildCommand(command, args);

    // set up class values
    this.command = cmd;
    this.args = splitCommandArgs(cmd);
    this.stdout = '';
    this.stderr = '';
    this.docker = docker;
    this.binds = [
      getProjectPath() + ':/mnt/project'
    ];
    this.running = false;
    this.finished = false;
    this.disposed = false;
  }

  /**
   * Adds a bind for a docker container.
   *
   * @param {string} path path on the host
   * @param {string} target path in the container
   */
  addBind(path, target) {
    this.binds.push(path + ':' + target);
  }

  /**
   * Executes the process. Does nothing if this process was disposed using the `dispose()` method.
   * You can only execute this method once.
   *
   * @returns {Promise<string>} a promise that resolves with stdout or rejects with stderr
   * @throws {Error} if this process was executed already.
   */
  execute() {
    if (this.running)
      throw new Error('Process is already running');
    if (this.finished)
      throw new Error('Process did execute already');
    if (this.disposed)
      return Promise.reject('Process was disposed');

    this.running = true;
    this.id = uuid();
    __running[this.id] = this;

    return new Promise((resolve, reject) => {
      if (this.docker) {
        console.debug(`Running on Docker: ${this.command}`);
        // this.process is a promise that resolves with the docker container
        this.process = new Promise(container_resolve => {
          const docker = getDocker();
          docker.run(this.docker_image, this.args,
            [new StdoutWritable(this), new StderrWritable(this)],
            {
              Tty: false,
              HostConfig: {
                Binds: this.binds,
                AutoRemove: atom.config.get('open-diabetes-filter.docker.cleanup')
              },
              WorkingDir: '/mnt/project'
            }, {}, (err, data) => {
              this.running = false;
              delete __running[this.id];

              if (data && data.StatusCode === 0) {
                this.finished = true;
                resolve(this.stdout);
              } else reject(data ? this.stderr : err)
            })
            .on('container', container => {
              container_resolve(container);
            });
        });

      } else {
        console.debug(`Spawning process: ${this.command}`);
        const exec = this.args.shift();
        const args = Object.freeze(this.args);
        const process = cp.spawn(exec, args, {
          cwd: getProjectPath(),
          windowsHide: true
        });
        process.on('close', code => {
          this.running = false;
          delete __running[this.id];

          if (code === 0) {
            this.finished = true;
            resolve(this.stdout);
          } else reject(this.stderr);
        });
        process.stdout.on('data', chunk => {
          chunk = chunk.toString('utf8');
          this.stdout += chunk;
          if (typeof this.onstdout === 'function')
            this.onstdout(chunk);
        });
        process.stderr.on('data', chunk => {
          chunk = chunk.toString('utf8');
          this.stderr += chunk;
          if (typeof this.onstderr === 'function')
            this.onstderr(chunk);
        });

        // this.process is a promise that resolves with the ChildProcess object
        this.process = Promise.resolve(process);
      }
    })
  }

  /**
   * Disposes this process. Kills the process if it is already running.
   * Does nothing if the process did already finish or was disposed previously.
   */
  dispose() {
    if (this.disposed || this.finished)
      return;
    this.disposed = true;
    if (this.running) {
      this.process.then(prc => {
        // ChildProcess and Container both use the kill() method
        prc.kill();
      });
    }
  }
}

module.exports = {
  Process, disposeAll
};

class StdoutWritable extends Writable {
  /**
   * @param {Process} process
   */
  constructor(process) {
    super();
    const state = this._writableState;
    this._decoder = new StringDecoder(state.defaultEncoding);
    this.data = '';
    this.process = process;
  }

  _write(chunk, encoding, callback) {
    if (encoding === 'buffer') {
      chunk = this._decoder.write(chunk);
    }
    this.data += chunk;
    callback();
    if (typeof this.process.onstdout === 'function')
      this.process.onstdout(chunk);
  }

  _final(callback) {
    this.data += this._decoder.end();
    this.process.stdout = this.data;
    callback();
  }
}

class StderrWritable extends Writable {
  /**
   * @param {Process} process
   */
  constructor(process) {
    super();
    const state = this._writableState;
    this._decoder = new StringDecoder(state.defaultEncoding);
    this.data = '';
    this.process = process;
  }

  _write(chunk, encoding, callback) {
    if (encoding === 'buffer') {
      chunk = this._decoder.write(chunk);
    }
    this.data += chunk;
    callback();
    if (typeof this.process.onstderr === 'function')
      this.process.onstderr(chunk);
  }

  _final(callback) {
    this.data += this._decoder.end();
    this.process.stderr = this.data;
    callback();
  }
}
