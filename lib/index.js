'use strict';
// ======================================================================================
// graceful-shutdown.js
// ======================================================================================
// gracefully shuts downs http server
// can be used with http, express, koa, ...
// ======================================================================================

var debug = require('debug')('http-graeceful-shutdown');
var _ = require('lodash');

module.exports = exports = GracefulShutdown;

var shuttingdown = false;

/**
 * Gracefully shuts down `server` when the process receives
 * the passed signals
 *
 * @param {HTTPServer} server
 * @param {object} options
 * 						signals: string (each signal seperated by SPACE)
 * 						timeout: timeout value for forceful shutdown in ms
 * 						development: boolean value (if true, no graceful shutdown to speed up development
 * 						callback: optional  function
 * @param {Function} [cb] optional callback that executes when shutting down
 */

function GracefulShutdown (server, opts) {

	opts = opts || {};

	var options = _.defaults(opts,
		{
			signals: 'SIGINT SIGTERM',
			timeout: 30000,
			development: false
		});

	options.signals.split(' ').forEach(function(signal) {
		if (signal && signal != '') {
			process.on(signal, function() {
				shutdown(signal);
			});
		}
	})

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

		if (!shuttingdown) {
			shuttingdown = true;
			debug('shutting down');

			// normal shutdown
			server.close(function () {
				process.exit(0);
			});

			// forcefull shutdown after timeout
			setTimeout(function () {
				debug('Could not close connections in time (' + options.timeout + 'ms), forcefully shutting down');
				process.exit(1)
			}, options.timeout).unref();
		}
	}

};
