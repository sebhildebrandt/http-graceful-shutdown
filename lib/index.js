'use strict';
// ======================================================================================
// graceful-shutdown.js
// ======================================================================================
// gracefully shuts downs http server
// can be used with http, express, koa, ...
// ======================================================================================

const debug = require('debug')('http-graceful-shutdown');

let isShuttingDown = false;
let connections = {};
let connectionCounter = 0;
let failed = false;

/**
 * Gracefully shuts down `server` when the process receives
 * the passed signals
 *
 * @param {http.Server} server
 * @param {object} opts
 *                        signals: string (each signal separated by SPACE)
 *                        timeout: timeout value for forceful shutdown in ms
 *                        development: boolean value (if true, no graceful shutdown to speed up development
 *                        onShutdown: optional function
 *                        finally: optional function
 */

function GracefulShutdown(server, opts) {

  opts = opts || {};

  // merge opts with default options
  let options = Object.assign({
    signals: 'SIGINT SIGTERM',
    timeout: 30000,
    development: false
  }, opts);

  options.signals.split(' ').forEach(function (signal) {
    if (signal && signal !== '') {
      process.on(signal, function () {
        shutdown(signal);
      });
    }
  });

  function destroy(socket) {
    if (socket._isIdle && isShuttingDown) {
      socket.destroy();
      delete connections[socket._connectionId];
    }
  }

  function isFunction(functionToCheck) {
    let getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([a-zA-Z]+)?Function\]$/.test(getType);
  }

  server.on('request', function (req, res) {
    req.socket._isIdle = false;

    res.on('finish', function () {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });

  server.on('connection', function (socket) {
    let id = connectionCounter++;
    socket._isIdle = true;
    socket._connectionId = id;
    connections[id] = socket;

    socket.on('close', function () {
      delete connections[id];
    });
  });

  process.on('exit', function () {
    if (options.finally && isFunction(options.finally)) {
      options.finally();
    }
    debug('closed');
  });

  function shutdown(sig) {

    let counter = 0;

    function cleanupHttp() {

      return new Promise((resolve, reject) => {
        Object.keys(connections).forEach(function (key) {
          counter++;
          destroy(connections[key]);
        });

        debug('Connections destroyed : ' + counter);
        debug('Connection Counter    : ' + connectionCounter);

        // normal shutdown
        server.close(function (err) {
          if (err) return reject(err);
          resolve();
        });
      });

    }

    debug('shutdown signal - ' + sig);

    // Don't bother with graceful shutdown on development to speed up round trip
    if (options.development) {
      debug('DEV-Mode - imediate forceful shutdown');
      return process.exit(0);
    }

    const finalHandler = () => {
      process.exit(failed ? 1 : 0);
    };

    const exitHandler = promise => promise
      .catch((err) => {
        const errString = (typeof err === 'string') ? err : JSON.stringify(err);
        debug(errString);
        failed = true;
      });


    if (!isShuttingDown) {
      isShuttingDown = true;
      debug('shutting down');

      // forcefull shutdown after timeout
      if (options.timeout) {
        setTimeout(function () {
          debug('Could not close connections in time (' + options.timeout + 'ms), forcefully shutting down');
          process.exit(1);
        }, options.timeout).unref();
      }

      exitHandler(cleanupHttp()).then(() => {
        if (options.onShutdown && isFunction(options.onShutdown)) {
          return exitHandler(options.onShutdown(sig));
        }
        return;
      }).then(finalHandler);
    }
  }
}

module.exports = GracefulShutdown;