const cp = require('child_process');
const {Writable} = require('stream');
const {StringDecoder} = require('string_decoder');
const {getCli, getPlot, getPlotConfig, isDockerEnabled, getDocker, getProjectPath, splitCommandArgs} = require('./util');
const {CLI, JAVAC, PLOT} = require('./process-type');

/**
 * A class representing a process executing a command defined in the settings.
 */
class Process {
  /**
   * Creates a new Process. The process is not executed until the execute() method is called.
   * The process can be disposed using the dispose() method.
   *
   * @param {string} command Command defined in settings. Assumes `open-diabetes-filter.commands` namespace.
   * @param {Object} args Arguments object. Each key represents a variable which will be replaced with the value.
   * @param {string} type Type of the command. Constants defined in process-type.js
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
    let cmd = atom.config.get('open-diabetes-filter.commands.' + command);
    for (const [key, value] of Object.entries(args)) {
      cmd = cmd.replace('%' + key + '%', value);
    }

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
   * Executes the process.
   *
   * @returns {Promise} a promise that resolves when the process exists with status code 0
   */
  execute() {
    if (this.running)
      throw new Error('Process is already running');
    if (this.finished)
      throw new Error('Process did execute already');
    if (this.disposed)
      return Promise.reject('Process was disposed');

    this.running = true;
    return new Promise((resolve, reject) => {
      if (this.docker) {
        console.debug(`Running on Docker: ${this.command}`);
        // this.process is a promise that resolves with the docker container
        this.process = new Promise(container_resolve => {
          const docker = getDocker();
          docker.run(this.docker_image, this.args,
            [new ProcessWritable(this.stdout, this.onstdout), new ProcessWritable(this.stderr, this.onstderr)],
            {
              Tty: false,
              HostConfig: {
                Binds: this.binds,
                AutoRemove: atom.config.get('open-diabetes-filter.docker.cleanup')
              },
              WorkingDir: '/mnt/project'
            }, {}, (err, data) => {
              this.finished = true;
              this.running = false;
              if (data && data.StatusCode === 0)
                resolve(this.stdout);
              else reject(data ? this.stderr : err)
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
          this.finished = true;
          this.running = false;
          if (code === 0)
            resolve(this.stdout);
          else reject(this.stderr);
        });
        process.stdout.on('data', chunk => {
          chunk = chunk.toString('utf8');
          this.stdout += chunk;
          if (typeof this.onstdout !== 'undefined')
            this.onstdout(chunk);
        });
        process.stderr.on('data', chunk => {
          chunk = chunk.toString('utf8');
          this.stderr += chunk;
          if (typeof this.onstderr !== 'undefined')
            this.onstderr(chunk);
        });

        // this.process is a promise that resolves with the ChildProcess object
        this.process = Promise.resolve(process);
      }
    })
  }

  /**
   * Disposes this process. Kills the process if it is already running.
   */
  dispose() {
    if (this.disposed || this.finished)
      return;
    this.disposed = true;
    this.process.then(prc => {
      // ChildProcess and Container both use the kill() method
      prc.kill();
    });
  }
}

module.exports = {
  Process
};

class ProcessWritable extends Writable {
  /**
   * @param {string} buffer
   * @param {function?} callback
   */
  constructor(buffer, callback) {
    super();
    const state = this._writableState;
    this._decoder = new StringDecoder(state.defaultEncoding);
    this.data = '';
    this.buffer = buffer;
    this.callback = callback;
  }

  _write(chunk, encoding, callback) {
    if (encoding === 'buffer') {
      chunk = this._decoder.write(chunk);
    }
    this.data += chunk;
    callback();
    if (typeof this.callback !== 'undefined')
      this.callback(chunk);
  }

  _final(callback) {
    this.data += this._decoder.end();
    this.buffer += this.data;
    callback();
  }
}
