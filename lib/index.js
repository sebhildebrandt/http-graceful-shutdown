// =============================================================================
//                                    _
//  |_ _|_ _|_ ._ __ _  ._ _.  _  _ _|_    | __ _ |_     _|_  _|  _       ._
//  | | |_  |_ |_)  (_| | (_| (_ (/_ | |_| |   _> | | |_| |_ (_| (_) \/\/ | |
//             |     _|
// -----------------------------------------------------------------------------
// gracefully shuts downs http server
// can be used with http, express, koa, ...
// (c) 2026 Sebastian Hildebrandt
// License: MIT
// =============================================================================

const debug = require('debug')('http-graceful-shutdown');
const http = require('node:http');
const os = require('node:os');

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
 *        preShutdown: optional function. Needs to return a promise. - HTTP sockets are still available and untouched
 *        onShutdown: optional function. Needs to return a promise.
 *        finally: optional function, handled at the end of the shutdown.
 */

function GracefulShutdown(server, opts) {
	// option handling
	// ----------------------------------
	opts = opts || {};

	// merge opts with default options
	const options = Object.assign(
		{
			signals: 'SIGINT SIGTERM',
			timeout: 30000,
			development: false,
			forceExit: true,
			onShutdown: (signal) => Promise.resolve(signal),
			preShutdown: (signal) => Promise.resolve(signal),
		},
		opts,
	);

	let isShuttingDown = false;
	const connections = {};
	let connectionCounter = 0;
	const secureConnections = {};
	let secureConnectionCounter = 0;
	let failed = false;
	let finalRun = false;
	let shutdownPromise = null;

	function onceFactory() {
		let called = false;
		return (emitter, events, callback) => {
			function call() {
				if (!called) {
					called = true;
					return callback.apply(this, arguments);
				}
				// second signal: force immediate shutdown
				debug('received repeated shut down signal, forcing shutdown');
				process.exit(1);
			}
			events.forEach((e) => emitter.on(e, call));
		};
	}

	const signals = options.signals
		.split(' ')
		.map((s) => s.trim())
		.filter((s) => !!s.length);

	signals.forEach((signal) => {
		if (signal === 'SIGKILL' || signal === 'SIGSTOP') {
			throw new Error(`http-graceful-shutdown: signal ${signal} cannot be intercepted`);
		}
		if (!(signal in os.constants.signals)) {
			process.emitWarning(`http-graceful-shutdown: unknown signal ${signal}`);
		}
	});

	const once = onceFactory();

	once(process, signals, (signal) => {
		debug('received shut down signal', signal);
		shutdown(signal)
			.then(() => {
				if (options.forceExit) {
					process.exit(failed ? 1 : 0);
				}
			})
			.catch((err) => {
				debug('server shut down error occurred', err);
				if (options.forceExit) {
					process.exit(1);
				}
				process.exitCode = 1;
			});
	});

	// helper function
	// ----------------------------------
	function isFunction(functionToCheck) {
		const getType = Object.prototype.toString.call(functionToCheck);
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
		debug(`Destroy Connections : ${force ? 'forced close' : 'close'}`);
		let counter = 0;
		let secureCounter = 0;
		Object.keys(connections).forEach((key) => {
			const socket = connections[key];
			const serverResponse = socket._httpMessage;

			// send connection close header to open connections
			if (serverResponse && !force) {
				if (!serverResponse.headersSent) {
					serverResponse.setHeader('connection', 'close');
				}
			} else {
				counter++;
				destroy(socket, force);
			}
		});

		debug(`Connections destroyed : ${counter}`);
		debug(`Connection Counter    : ${connectionCounter}`);

		Object.keys(secureConnections).forEach((key) => {
			const socket = secureConnections[key];
			const serverResponse = socket._httpMessage;

			// send connection close header to open connections
			if (serverResponse && !force) {
				if (!serverResponse.headersSent) {
					serverResponse.setHeader('connection', 'close');
				}
			} else {
				secureCounter++;
				destroy(socket, force);
			}
		});

		debug(`Secure Connections destroyed : ${secureCounter}`);
		debug(`Secure Connection Counter    : ${secureConnectionCounter}`);
	}

	// set up server/process events
	// ----------------------------------
	server.on('request', (req, res) => {
		const socket = req.socket;
		socket._isIdle = false;
		if (isShuttingDown && !res.headersSent) {
			res.setHeader('connection', 'close');
		}

		res.on('finish', () => {
			socket._isIdle = true;
			destroy(socket);
		});
	});

	server.on('connection', (socket) => {
		if (isShuttingDown) {
			socket.destroy();
		} else {
			const id = connectionCounter++;
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
			const id = secureConnectionCounter++;
			socket._isIdle = true;
			socket._connectionId = id;
			secureConnections[id] = socket;

			socket.once('close', () => {
				delete secureConnections[socket._connectionId];
			});
		}
	});

	// shutdown event (per signal)
	// ----------------------------------
	function shutdown(sig) {
		function cleanupHttp() {
			destroyAllConnections();
			debug('Close http server');

			return new Promise((resolve, reject) => {
				server.close((err) => {
					if (err) {
						return reject(err);
					}
					return resolve(true);
				});
			});
		}

		debug(`shutdown signal - ${sig}`);

		// Don't bother with graceful shutdown on development to speed up round trip
		if (options.development) {
			debug('DEV-Mode - immediate forceful shutdown');
			return process.exit(0);
		}

		function finalHandler() {
			if (!finalRun) {
				finalRun = true;
				if (options.finally && isFunction(options.finally)) {
					debug('executing finally()');
					return Promise.resolve().then(() => options.finally(sig));
				}
			}

			return Promise.resolve();
		}

		// returns true if should force shut down. returns false for shut down without force
		function waitForReadyToShutDown(totalNumInterval) {
			debug(`waitForReadyToShutDown... ${totalNumInterval}`);

			if (totalNumInterval === 0) {
				// timeout reached
				debug(
					`Could not close connections in time (${options.timeout}ms), will forcefully shut down`,
				);
				return Promise.resolve(true);
			}

			// test all connections closed already?
			const allConnectionsClosed =
				Object.keys(connections).length === 0 &&
				Object.keys(secureConnections).length === 0;

			if (allConnectionsClosed) {
				debug('All connections closed. Continue to shutting down');
				return Promise.resolve(false);
			}

			debug('Schedule the next waitForReadyToShutdown');
			return new Promise((resolve) => {
				setTimeout(() => {
					resolve(waitForReadyToShutDown(totalNumInterval - 1));
				}, 250);
			});
		}

		if (shutdownPromise) {
			return shutdownPromise;
		}

		debug('shutting down');

		shutdownPromise = options
			.preShutdown(sig)
			.then(() => {
				isShuttingDown = true;

				const serverClosed = cleanupHttp();
				serverClosed.catch(() => {});

				const pollIterations = options.timeout
					? Math.round(options.timeout / 250)
					: 0;

				return waitForReadyToShutDown(pollIterations).then((force) => {
					debug('Do onShutdown now');

					// if after waiting for connections to drain within timeout period
					// or if timeout has reached, we forcefully disconnect all sockets
					if (force) {
						destroyAllConnections(force);
					}

					return serverClosed;
				});
			})
			.then(() => options.onShutdown(sig))
			.then(finalHandler)
			.catch((err) => {
				debug(err instanceof Error ? err.stack : String(err));
				failed = true;
				return finalHandler()
					.catch((finalErr) => {
						debug('finally() failed', finalErr);
					})
					.then(() => {
						throw err;
					});
			});

		return shutdownPromise;
	}

	function shutdownManual() {
		return shutdown('manual');
	}

	return shutdownManual;
}

module.exports = GracefulShutdown;
