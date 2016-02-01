'use strict';
// ======================================================================================
// graceful-shutdown.js
// ======================================================================================
// gracefully shuts downs http server
// can be used with http, express, koa, ...
// ======================================================================================

var debug = require('debug')('http-graeceful-shutdown');
var _ = require('lodash');
var http = require('http');
var https = require('https');

var isShuttingDown = false;
var connections = {};
var connectionCounter = 0;

/**
 * Gracefully shuts down `server` when the process receives
 * the passed signals
 *
 * @param {http.Server} server
 * @param {object} opts
 *                        signals: string (each signal seperated by SPACE)
 *                        timeout: timeout value for forceful shutdown in ms
 *                        development: boolean value (if true, no graceful shutdown to speed up development
 *                        callback: optional  function
 */

function GracefulShutdown(server, opts) {

	opts = opts || {};

	var options = _.defaults(opts,
		{
			signals: 'SIGINT SIGTERM',
			timeout: 30000,
			development: false
		});

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

	server.on('request', function(req, res) {
		req.socket._isIdle = false;

		res.on('finish', function() {
			req.socket._isIdle = true;
			destroy(req.socket);
		});
	});

	server.on('connection', function(socket) {
		var id = connectionCounter++;
		socket._isIdle = true;
		socket._connectionId = id;
		connections[id] = socket;

		socket.on('close', function() {
			delete connections[id];
		});
	});

	process.on('exit', function () {
		if (options.callback) {
			options.callback();
		}
		debug('closed');
	});

	function shutdown(sig) {
		debug('shutdown signal - ' + sig);

		// Don't bother with graceful shutdown on development to speed up round trip
		if (options.development) {
			debug('DEV-Mode - imediate forceful shutdown');
			return process.exit(1);
		}

		if (!isShuttingDown) {
			isShuttingDown = true;
			debug('shutting down');

			// normal shutdown
			server.close(function(err) {
				process.exit(1)
			});

			Object.keys(connections).forEach(function(key) {
				destroy(connections[key]);
			});

			// forcefull shutdown after timeout
			setTimeout(function () {
				debug('Could not close connections in time (' + options.timeout + 'ms), forcefully shutting down');
				process.exit(1)
			}, options.timeout).unref()
		}
	}
}

module.exports = GracefulShutdown;
