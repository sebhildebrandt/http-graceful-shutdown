# http-graceful-shutdown

```
  _   _   _                                  __      _        _        _      _
 | |_| |_| |_ _ __ ___ __ _ _ _ __ _ __ ___ / _|_  _| |___ __| |_ _  _| |_ __| |_____ __ ___ _
 | ' \  _|  _| '_ \___/ _` | '_/ _` / _/ -_)  _| || | |___(_-< ' \ || |  _/ _` / _ \ V  V / ' \
 |_||_\__|\__| .__/   \__, |_| \__,_\__\___|_|  \_,_|_|   /__/_||_\_,_|\__\__,_\___/\_/\_/|_||_|
             |_|      |___/
```

Gracefully shuts down [node.js][nodejs-url] http server. More than 10 Mio downloads overall.

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
  [![Git Issues][issues-img]][issues-url]
  [![Closed Issues][closed-issues-img]][closed-issues-url]
  [![deps status][dependencies-img]][dependencies-url]
  [![Caretaker][caretaker-image]][caretaker-url]
  [![MIT license][license-img]][license-url]

**Version 3.0** just released. This version is fully backwards compatible to version 2.x but adds much better handling under the hood. More that 10 Mio downloads.

- can be used with [express][express-url], [koa][koa-url], [fastify][fastify-url], native node [http][http-url], [http2][http2-url] ... see examples
- simple to use
- configurable to your needs
- add your own cleanup function

### Features

`http-graceful-shutdown` manages a secure and save shutdown of your http server application:

- tracks all connections
- stops the server from accepting new connections on shutdown
- graceful communication to all connected clients of server intention to shut down
- immediately destroys all sockets without an attached HTTP request
- properly handles all HTTP and HTTPS connections
- possibility to define cleanup functions (e.g. closing DB connections)
- preShutdown function if you need to have all HTTP sockets available and untouched
- choose between shutting down by function call or triggered by SIGINT, SIGTERM, ...
- choose between final forceful process termination node.js (process.exit) or clearing event loop (options).

## Quick Start

### Installation

```bash
$ npm install http-graceful-shutdown
```

### Basic Usage

```js
const gracefulShutdown = require('http-graceful-shutdown');
...
// app: can be http, https, express, koa, fastity, ...
server = app.listen(...);
...

// this enables the graceful shutdown
gracefulShutdown(server);
```

## Explanation

### Functionality

```
                                                                    PARENT Process (e.g. nodemon, shell, kubernetes, ...)
─────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────
                         │ Signal (SIGINT, SIGTERM, ...)
                         │
                         │
           (1)       (2) v                                                 NODE SERVER (HTTP, Express, koa, fastity, ...)
    ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇
           │             │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │ <─ shutdown procedure
           │             │ shutdown initiated           │ │                                            │
           │             │                              │ │                                            │
           │             │                              │ │    (8) shutdown function    (9) finally fn │
           │             │ ▄▄▄▄▄▄▄▄▄▄▄▄ ▄▄▄             │ │ ▄▄ ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄ ▄▄▄▄▄▄▄▄▄▄▄▄▄▄ │
           │             └ (3)          (4) close       │ └ (7) destroy                                │
           │               preShutdown  idle sockets    │   remaining sockets                          │
           │                                            │                                              │ (10)
     serve │      serving req. (open connection)        │          (5)                                 └ SERVER terminated
        ▄▄▄│      ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄┤           ^ blocked
        ^  │      ^  last request before                │           │
        │  │      │  receiving shutdown signal          │           │
        │  │      │                                     │           │
        │  │      │                                     │           │
        │  │      │                                     │           │
        │  │      │ Long request                        │           │
Request │  V Resp │                                     V Resp.     │
        │         │                                                 │                                                   CLIENT
────────┴─────────┴─────────────────────────────────────────────────┴─────────────────────────────────────────────────────────
```

1. usually, your NODE http server (the black bar in the middle) replies to client requests and sends responses
2. if your server receives a termination signal (e.g. SIGINT - Ctrl-C) from its parent, http-graceful-shutdown starts the shutdown procedure
3. first, http-graceful-shutdown will run the "preShutdown" (async) function. Place your own function here (passed to the options object), if you need to have all HTTP sockets available and untouched.
4. then all empty connections are closed and destroyed and
5. http-graceful-shutdown will block any new requests
6. if possible, http-graceful-shutdown communicates to the clients that the server is about to close (connection close header)
7. http-graceful-shutdown now tries to wait till all sockets are finished, then destroys the all remaining sockets
8. now it is time to run the "onShutdown" (async) function (if such a function is passed to the options object)
9. as soon as this onShutdown function has ended, the "finally" (sync) function is executed (if passed to the options)
10. now the event loop is cleared up OR process.exit() is triggered (can be defined in the options) and the server process ends.

## Options

| option      | default          | Comments                                                                                                                     |
| ----------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| timeout     | 30000            | timeout till forced shutdown (in milliseconds)                                                                               |
| signals     | 'SIGINT SIGTERM' | define the signals, that should be handled (separated by SPACE)                                                              |
| development | false            | if set to true, no graceful shutdown is proceeded to speed up dev-process                                                    |
| preShutdown | -                | not time-consuming callback function. Needs to return a promise.<br>Here, all HTTP sockets are still available and untouched |
| onShutdown  | -                | not time-consuming callback function. Needs to return a promise.                                                             |
| forceExit   | true             | force process.exit - otherwise just let event loop clear                                                                     |
| finally     | -                | small, not time-consuming function, that will<br>be handled at the end of the shutdown (not in dev-mode)                     |

### Option Explanation

- **timeout:** You can define the maximum time that the shutdown process may take (timeout option). If after this time, connections are still open or the shutdown process is still running, then the remaining connections will be forcibly closed and the server process is terminated.
- **signals** Here you can define which signals can trigger the shutdown process (SIGINT, SIGTERM, SIGKILL, SIGHUP, SIGUSR2, ...)
- **development** If true, the shutdown process is much shorter, because it just terminates the server, ignoring open connections, shutdown function, finally function ...
- **preShutdown** Place your own (not time-consuming) callback function here, if you need to have all HTTP sockets available and untouched during cleanup. Needs to return a promise. (async). If you add an input parameter to your cleanup function (optional), the SIGNAL type that caused the shutdown is passed to your cleanup function. See example.
- **onShutdown** place your (not time-consuming) callback function, that will handle your additional cleanup things (e.g. close DB connections). Needs to return a promise. (async). If you add an input parameter to your cleanup function (optional), the SIGNAL type that caused the shutdown is passed to your cleanup function. See example.
- **finally** here you can place a small (not time-consuming) function, that will be handled at the end of the shutdown e.g. for logging of shutdown. (sync)
- **forceExit** force process.exit() at the end of the shutdown process, otherwise just let event loop clear

### Advanced Options Example

You can pass an options-object to specify your specific options for the graceful shutdown

The following example uses all possible options:

```js
const gracefulShutdown = require('http-graceful-shutdown');
...
// app: can be http, https, express, koa, fastity, ...
server = app.listen(...);
...

// your personal cleanup function
// - must return a promise
// - the input parameter is optional (only needed if you want to
//   access the signal type inside this function)
// - this function here in this example takes one second to complete
function shutdownFunction(signal) {
  return new Promise((resolve) => {
    console.log('... called signal: ' + signal);
    console.log('... in cleanup')
    setTimeout(function() {
      console.log('... cleanup finished');
      resolve();
    }, 1000)
  });
}

// finally function
// -- sync function
// -- should be very short (not time consuming)
function finalFunction() {
  console.log('Server gracefulls shutted down.....')
}

// this enables the graceful shutdown with advanced options
gracefulShutdown(server,
  {
    signals: 'SIGINT SIGTERM',
    timeout: 10000,                   // timeout: 10 secs
    development: false,               // not in dev mode
    forceExit: true,                  // triggers process.exit() at the end of shutdown process
    preShutdown: preShutdownFunction, // needed operation before httpConnections are shutted down
    onShutdown: shutdownFunction,     // shutdown function (async) - e.g. for cleanup DB, ...
    finally: finalFunction            // finally function (sync) - e.g. for logging
  }
);
```
### Trigger shutdown manually

You can now trigger gracefulShutdown programatically (e.g. for tests) like so:

```js
let shutdown
beforeAll(() => {
  shutdown = gracefulShutdown(...)
})

afterAll(async () => {
  await shutdown()
})
```

### Do not force process.exit()

With the `forceExit` option, you can define how your node server process ends: when setting `forceExit` to `false`, you just let the event loop clear and then the proccess ends automatically:

```js
const gracefulShutdown = require('http-graceful-shutdown');
...
// app: can be http, https, express, koa, fastity, ...
server = app.listen(...);
...

// enable graceful shutdown with options:
// this option lets the event loop clear to end your node server
// no explicit process.exit() will be triggered.

gracefulShutdown(server, {
  forceExit: false
});
```

If you want an explicit process.exit() at the end, set `forceExit` to `true` (which is the default).

### Debug

If you want to get debug notes ([debug][debug-url] is a dependency of this module), just set the DEBUG environment variable to enable
 debugging:

```
export DEBUG=http-graceful-shutdown
```

OR on Windows:

```
set DEBUG=http-graceful-shutdown
```

## Examples

You can find examples how to use `http-graceful-shutdown` with Express, Koa, http, http2, fastify in the `examples` directory.
To run the examples, be sure to install debug and express, koa or fastify.

```
npm install debug express koa fastify
```
## Version history

| Version | Date       | Comment                                                           |
| ------- | ---------- | ----------------------------------------------------------------- |
| 3.1.12  | 2023-02-11 | fix forceExit default value                                       |
| 3.1.11  | 2022-11-18 | updated examples                                                  |
| 3.1.10  | 2022-11-17 | forceExit handling adapted                                        |
| 3.1.9   | 2022-10-24 | updated docs, code cleanup                                        |
| 3.1.8   | 2022-07-27 | updated docs, fixed typos                                         |
| 3.1.7   | 2022-03-18 | updated dependencies, updated docs                                |
| 3.1.6   | 2022-02-27 | updated dependencies                                              |
| 3.1.5   | 2021-11-08 | updated docs                                                      |
| 3.1.4   | 2021-08-27 | updated docs                                                      |
| 3.1.3   | 2021-08-03 | fixed handle events once (thanks to Igor Basov)                   |
| 3.1.2   | 2021-06-15 | fixed cleanupHttp() no timeout                                    |
| 3.1.1   | 2021-05-13 | updated docs                                                      |
| 3.1.0   | 2021-05-08 | refactoring, added preShutdown                                    |
| 3.0.2   | 2021-04-08 | updated docs                                                      |
| 3.0.1   | 2021-02-26 | code cleanup                                                      |
| 3.0.0   | 2021-02-25 | version 3.0 release                                               |
| 2.4.0   | 2021-02-15 | added forceExit option (defaults to true)                         |
| 2.3.2   | 2019-06-14 | typescript typings fix                                            |
| 2.3.1   | 2019-05-31 | updated docs, added typescript typings                            |
| 2.3.0   | 2019-05-30 | added manual shutdown (for tests) see docs below                  |
| 2.2.3   | 2019-02-01 | updated docs, debug                                               |
| 2.2.2   | 2018-12-28 | updated docs, keywords                                            |
| 2.2.1   | 2018-11-20 | updated docs                                                      |
| 2.2.0   | 2018-11-19 | added (optional) signal type to shutdown function - see example   |
| 2.1.3   | 2018-11-06 | updated docs                                                      |
| 2.1.2   | 2018-11-03 | updated dependencies (version bump), updated docs                 |
| 2.1.1   | 2018-02-28 | extended `isFunction` to support e.g. AsyncFunctions              |
| 2.1.0   | 2018-02-11 | bug fixing onShutdown method was called before `server.close`     |
| 2.0.6   | 2017-11-06 | updated docs, code cleanup                                        |
| 2.0.5   | 2017-11-06 | updated dependencies, modifications gitignore, added docs         |
| 2.0.4   | 2017-09-21 | updated dependencies, modifications gitignore                     |
| 2.0.3   | 2017-06-18 | updated dependencies                                              |
| 2.0.2   | 2017-05-27 | fixed return value 0                                              |
| 2.0.1   | 2017-04-24 | modified documentation                                            |
| 2.0.0   | 2017-04-24 | added 'onShutdown' option, renamed 'callback' option to 'finally' |
| 1.0.6   | 2016-02-03 | adding more explicit debug information and documentation          |
| 1.0.5   | 2016-02-01 | better handling of closing connections                            |
| 1.0.4   | 2015-10-01 | small fixes                                                       |
| 1.0.3   | 2015-09-15 | updated docs                                                      |
| 1.0.1   | 2015-09-14 | updated docs, reformated code                                     |
| 1.0.0   | 2015-09-14 | initial release                                                   |

## Comments

If you have ideas, comments or questions, please do not hesitate to contact me.

Sincerely,

Sebastian Hildebrandt, [+innovations](http://www.plus-innovations.com)

## Credits

Written by Sebastian Hildebrandt [sebhildebrandt](https://github.com/sebhildebrandt)

#### Contributors

- Deepak Bhattarai [bring2dip](https://github.com/bring2dip)
- Shen [shenfe](https://github.com/shenfe)
- Jeff Hansen [jeffijoe](https://github.com/jeffijoe)
- Igor Basov [IgorBasov](https://github.com/IgorBasov)

## License [![MIT license][license-img]][license-url]

>The [`MIT`][license-url] License (MIT)
>
>Copyright &copy; 2015-2023 Sebastian Hildebrandt, [+innovations](http://www.plus-innovations.com).
>
>Permission is hereby granted, free of charge, to any person obtaining a copy
>of this software and associated documentation files (the "Software"), to deal
>in the Software without restriction, including without limitation the rights
>to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
>copies of the Software, and to permit persons to whom the Software is
>furnished to do so, subject to the following conditions:
>
>The above copyright notice and this permission notice shall be included in
>all copies or substantial portions of the Software.
>
>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
>IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
>FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
>AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
>LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
>OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
>THE SOFTWARE.

[npm-image]: https://img.shields.io/npm/v/http-graceful-shutdown.svg?style=flat-square
[npm-url]: https://npmjs.org/package/http-graceful-shutdown
[downloads-image]: https://img.shields.io/npm/dm/http-graceful-shutdown.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/http-graceful-shutdown

[license-url]: https://github.com/sebhildebrandt/http-graceful-shutdown/blob/master/LICENSE
[license-img]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[npmjs-license]: https://img.shields.io/npm/l/http-graceful-shutdown.svg?style=flat-square

[caretaker-url]: https://github.com/sebhildebrandt
[caretaker-image]: https://img.shields.io/badge/caretaker-sebhildebrandt-blue.svg?style=flat-square

[nodejs-url]: https://nodejs.org/en/
[express-url]: https://github.com/strongloop/expressjs.com
[koa-url]: https://github.com/koajs/koa
[fastify-url]: https://www.fastify.io
[http-url]: https://nodejs.org/api/http.html
[http2-url]: https://nodejs.org/api/http2.html
[debug-url]: https://github.com/visionmedia/debug

[dependencies-url]: https://www.npmjs.com/package/http-graceful-shutdown?activeTab=dependencies
[dependencies-img]: https://img.shields.io/librariesio/release/npm/http-graceful-shutdown.svg?style=flat-square

[daviddm-url]: https://david-dm.org/sebhildebrandt/http-graceful-shutdown
[daviddm-img]: https://img.shields.io/david/sebhildebrandt/http-graceful-shutdown.svg?style=flat-square

[issues-img]: https://img.shields.io/github/issues/sebhildebrandt/http-graceful-shutdown.svg?style=flat-square
[issues-url]: https://github.com/sebhildebrandt/http-graceful-shutdown/issues
[closed-issues-img]: https://img.shields.io/github/issues-closed-raw/sebhildebrandt/http-graceful-shutdown.svg?style=flat-square&color=brightgreen
[closed-issues-url]: https://github.com/sebhildebrandt/http-graceful-shutdown/issues?q=is%3Aissue+is%3Aclosed
