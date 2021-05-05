'use strict';
// =============================================================================
//                                    _
//  |_ _|_ _|_ ._ __ _  ._ _.  _  _ _|_    | __ _ |_     _|_  _|  _       ._
//  | | |_  |_ |_)  (_| | (_| (_ (/_ | |_| |   _> | | |_| |_ (_| (_) \/\/ | |
//             |     _|
// -----------------------------------------------------------------------------
// gracefully shuts downs http server
// can be used with http, express, koa, ...
// =============================================================================

const debug = require('debug')('http-graceful-shutdown');
const http = require('http');

/**
 * Gracefully shuts down `server` when the process receives
 * the passed signals
 *
 * @param {http.Server} server
 * @param {object} opts
 *        signals: string (each signal separated by SPACE)
 *        timeout: timeout value for forceful shutdown in ms
 *        forceExit: force process.exit() - otherwise just let event loop clear
 *        development: boolean value (if true, no graceful shutdown to speed up development
 *        onShutdown: optional function
 *        finally: optional function
 */

function GracefulShutdown(server, opts) {

  // option handling
  // ----------------------------------
  opts = opts || {};

  // merge opts with default options
  let options = Object.assign({
    signals: 'SIGINT SIGTERM',
    timeout: 30000,
    development: false,
    forceExit: true
  }, opts);

  let isShuttingDown = false;
  let connections = {};
  let connectionCounter = 0;
  let secureConnections = {};
  let secureConnectionCounter = 0;
  let failed = false;
  let finalRun = false;

  options.signals.split(' ').forEach(function (signal) {
    if (signal && signal !== '') {
      process.on(signal, function () {
        shutdown(signal);
      });
    }
  });

  // helper function
  // ----------------------------------
  function isFunction(functionToCheck) {
    let getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([a-zA-Z]+)?Function\]$/.test(getType);
  }

  function destroy(socket, force = false) {
    if ((socket._isIdle && isShuttingDown) || force) {
      socket.destroy();
      if (socket.server instanceof http.Server) {
        delete connections[socket._connectionId];
      } else {
        delete secureConnections[socket._connectionId];
      }
    }
  }

  function destroyAllConnections(force = false) {

    // destroy empty and idle connections / all connections (if force = true)
    if (!force) {
      debug('Destroy Connections : ' + (force ? '2. forced close' : '1. close'));
    }
    let counter = 0;
    let secureCounter = 0;
    Object.keys(connections).forEach(function (key) {
      const socket = connections[key];
      const serverResponse = socket._httpMessage;

      // send connection close header to open connections
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader('connection', 'close');
        }
      } else {
        counter++;
        destroy(socket);
      }
    });

    debug('Connections destroyed : ' + counter);
    debug('Connection Counter    : ' + connectionCounter);

    Object.keys(secureConnections).forEach(function (key) {
      const socket = secureConnections[key];
      const serverResponse = socket._httpMessage;

      // send connection close header to open connections
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader('connection', 'close');
        }
      } else {
        secureCounter++;
        destroy(socket);
      }
    });

    debug('Secure Connections destroyed : ' + secureCounter);
    debug('Secure Connection Counter    : ' + secureConnectionCounter);
  }

  // set up server/process events
  // ----------------------------------
  server.on('request', function (req, res) {
    req.socket._isIdle = false;
    if (isShuttingDown && !res.headersSent) {
      res.setHeader('connection', 'close');
    }

    res.on('finish', function () {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });

  server.on('connection', function (socket) {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      let id = connectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      connections[id] = socket;

      socket.once('close', () => {
        delete connections[socket._connectionId];
      });
    }
  });

  server.on('secureConnection', (socket) => {

    if (isShuttingDown) {
      socket.destroy();
    } else {
      let id = secureConnectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      secureConnections[id] = socket;

      socket.once('close', () => {
        delete secureConnections[socket._connectionId];
      });
    }
  });

  process.on('exit', function () {
    debug('closed');
  });

  // shutdown event (per signal)
  // ----------------------------------
  function shutdown(sig) {

    return new Promise((resolve, reject) => {

      function cleanupHttp(force = false) {
        return new Promise((resolve, reject) => {
          destroyAllConnections(force);

          debug('Close http server')
          server.close((err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });
      }

      debug('shutdown signal - ' + sig);

      // Don't bother with graceful shutdown on development to speed up round trip
      if (options.development) {
        debug('DEV-Mode - immediate forceful shutdown');
        return process.exit(0);
      }

      function finalHandler() {
        if (!finalRun) {
          finalRun = true;
          if (options.finally && isFunction(options.finally)) {
            options.finally();
          }
          process.nextTick(() => {
            if (options.forceExit) {
              process.exit(failed ? 1 : 0);
            }
            resolve();
          });
        }
      }

      // returns true if should force shut down. returns false for shut down without force
      function isReadyToShutDown (totalNumInterval, intervalTimeout) {
        const reachedTimeout = totalNumInterval === 0;
        if (reachedTimeout) {
          debug('Could not close connections in time (' + options.timeout + 'ms), forcefully shutting down');
          return true;
        }

        // test all connections closed already?
        const allConnectionsClosed =
          Object.keys(connections).length === 0 &&
          Object.keys(secureConnections).length === 0;

        if (allConnectionsClosed) {
          debug('All connections closed. continue to shutting down')
          return false;
        }

        setTimeout(() => isReadyToShutDown(totalNumInterval--, intervalTimeout), intervalTimeout);
      }

      const exitHandler = promise => promise
        .catch((err) => {
          const errString = (typeof err === 'string') ? err : JSON.stringify(err);
          debug(errString);
          failed = true;
          reject(errString);
        });

      if (!isShuttingDown) {
        isShuttingDown = true;
        debug('shutting down');

        const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;

        let force = options.forceExit
        if (options.timeout) {
          force = isReadyToShutDown(pollIterations, 250)
        }
        exitHandler(cleanupHttp(force))
          .then(() => exitHandler(options.onShutdown(sig)))
          .then(finalHandler);
      }
    });
  }

  function shutdownManual() {
    return shutdown('manual');
  }

  return shutdownManual;
}

module.exports = GracefulShutdown;
