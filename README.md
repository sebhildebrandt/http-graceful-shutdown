# http-graceful-shutdown

Gracefully shuts down [node.js][nodejs-url] http server.

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
  [![Git Issues][issues-img]][issues-url]
  [![Closed Issues][closed-issues-img]][closed-issues-url]
  [![deps status][daviddm-img]][daviddm-url]
  [![Code Quality: Javascript][lgtm-badge]][lgtm-badge-url]
  [![Total alerts][lgtm-alerts]][lgtm-alerts-url]
  [![Caretaker][caretaker-image]][caretaker-url]
  [![MIT license][license-img]][license-url]

- can be used with [express][express-url], [koa][koa-url], native node [http][http-url], ...
- simple to use
- configurable to your needs
- add your own cleanup function

## Quick Start

### Installation

```bash
$ npm install http-graceful-shutdown
```

### Basic Usage

```js
var gracefulShutdown = require('http-graceful-shutdown');
...
// app: can be http, https, express, koa
server = app.listen(...);
...

// this enables the graceful shutdown
gracefulShutdown(server);
```


### Advanced Options

You can pass an options-object to specify your specific options for the graceful shutdown

The following example uses all possible options (using more or less the default settings):

```js
const gracefulShutdown = require('http-graceful-shutdown');
...
// app: can be http, https, express, koa
server = app.listen(...);
...

// your personal cleanup function
// - must return a promise
// - the input parameter is optional (only needed if you want to
//   access the signal type inside this function)
// - this function here in this example takes one second to complete
function cleanup(signal) {
  return new Promise((resolve) => {
	console.log('... called signal: ' signal);
  	console.log('... in cleanup')
  	setTimeout(function() {
  		console.log('... cleanup finished');
  		resolve();
  	}, 1000)
  });
}

// this enables the graceful shutdown with advanced options
gracefulShutdown(server,
	{
		signals: 'SIGINT SIGTERM',
		timeout: 30000,
		development: false,
		onShutdown: cleanup,
		finally: function() {
			console.log('Server gracefulls shutted down.....')
		}
	}
);
```

### Major (breaking) Changes - Version 2

- **renamed** option: `callback`: now to `finally`: place your (not time consuming) function, that will be handled at the end of the shutdown (not in dev-mode)
- **new** option: `onShutdown`: place your function, that will handle your additional cleanup things. Needs to return a promise

### Option Reference

| option         | default | Comments |
| -------------- | --------------------- | ---------------------- |
| signals | 'SIGINT SIGTERM' | define the signals, that should be handled (separated by SPACE) |
| timeout | 30000 | timeout till forced shutdown (in milli seconds) |
| development | false | if set to true, no graceful shutdown is proceeded to speed up dev-process |
| onShutdown | - | place your (not time consuming) callback function, that will<br>handle your additional cleanup things. Needs to return a promise.<br><br>If you add an input parameter to your cleanup function (optional),<br>the signal type that caused the shutdown is passed to your<br>cleanup function - example. |
| finally | - | here you can place a small (not time consuming) function, that will<br>be handled at the end of the shutdown (not in dev-mode) |

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

## Version history

| Version        | Date           | Comment  |
| -------------- | -------------- | -------- |
| 2.2.3          | 2019-02-01     | updated docs, debug |
| 2.2.2          | 2018-12-28     | updated docs, keywords |
| 2.2.1          | 2018-11-20     | updated docs |
| 2.2.0          | 2018-11-19     | added (optional) signal type to shutdown function - see example |
| 2.1.3          | 2018-11-06     | updated docs |
| 2.1.2          | 2018-11-03     | updated dependencies (version bump), updated docs |
| 2.1.1          | 2018-02-28     | extended `isFunction` to support e.g. AsyncFunctions  |
| 2.1.0          | 2018-02-11     | bug fixing onShutdown method was called before `server.close`  |
| 2.0.6          | 2017-11-06     | updated docs, code cleanup |
| 2.0.5          | 2017-11-06     | updated dependencies, modifications gitignore, added docs |
| 2.0.4          | 2017-09-21     | updated dependencies, modifications gitignore |
| 2.0.3          | 2017-06-18     | updated dependencies |
| 2.0.2          | 2017-05-27     | fixed return value 0 |
| 2.0.1          | 2017-04-24     | modified documentation |
| 2.0.0          | 2017-04-24     | added 'onShutdown' option, renamed 'callback' option to 'finally' |
| 1.0.6          | 2016-02-03     | adding more explicit debug information and documentation |
| 1.0.5          | 2016-02-01     | better handling of closing connections |
| 1.0.4          | 2015-10-01     | small fixes |
| 1.0.3          | 2015-09-15     | updated docs |
| 1.0.1          | 2015-09-14     | updated docs, reformated code |
| 1.0.0          | 2015-09-14     | initial release |


## Comments

If you have ideas or comments, please do not hesitate to contact me.

Sincerely,

Sebastian Hildebrandt, [+innovations](http://www.plus-innovations.com)

## Credits

Written by Sebastian Hildebrandt [sebhildebrandt](https://github.com/sebhildebrandt)

#### Contributers

- Deepak Bhattarai [bring2dip](https://github.com/bring2dip)
- Shen [shenfe](https://github.com/shenfe)


## License [![MIT license][license-img]][license-url]

>The [`MIT`][license-url] License (MIT)
>
>Copyright &copy; 2015-2019 Sebastian Hildebrandt, [+innovations](http://www.plus-innovations.com).
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

[lgtm-badge]: https://img.shields.io/lgtm/grade/javascript/g/sebhildebrandt/http-graceful-shutdown.svg?style=flat-square
[lgtm-badge-url]: https://lgtm.com/projects/g/sebhildebrandt/http-graceful-shutdown/context:javascript
[lgtm-alerts]: https://img.shields.io/lgtm/alerts/g/sebhildebrandt/http-graceful-shutdown.svg?style=flat-square
[lgtm-alerts-url]: https://lgtm.com/projects/g/sebhildebrandt/http-graceful-shutdown/alerts

[caretaker-url]: https://github.com/sebhildebrandt
[caretaker-image]: https://img.shields.io/badge/caretaker-sebhildebrandt-blue.svg?style=flat-square

[nodejs-url]: https://nodejs.org/en/
[express-url]: https://github.com/strongloop/expressjs.com
[koa-url]: https://github.com/koajs/koa
[http-url]: https://nodejs.org/api/http.html
[debug-url]: https://github.com/visionmedia/debug

[daviddm-url]: https://david-dm.org/sebhildebrandt/http-graceful-shutdown
[daviddm-img]: https://img.shields.io/david/sebhildebrandt/http-graceful-shutdown.svg?style=flat-square

[issues-img]: https://img.shields.io/github/issues/sebhildebrandt/http-graceful-shutdown.svg?style=flat-square
[issues-url]: https://github.com/sebhildebrandt/http-graceful-shutdown/issues
[closed-issues-img]: https://img.shields.io/github/issues-closed-raw/sebhildebrandt/http-graceful-shutdown.svg?style=flat-square
[closed-issues-url]: https://github.com/sebhildebrandt/http-graceful-shutdown/issues?q=is%3Aissue+is%3Aclosed
