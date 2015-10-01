# http-graceful-shutdown

Gracefully shuts down node http server - can be used with [express][express-url], [koa][koa-url], native node [http][http-url], ...

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
  [![Git Issues][issues-img]][issues-url]
  [![deps status][daviddm-img]][daviddm-url]
  [![MIT license][license-img]][license-url]

## Quick Start

### Installation

```bash
$ npm install http-graceful-shutdown
```

### Basic Usage

```
var gracefulShutdown = require('http-graceful-shutdown');
...
server = app.listen(...);
...

// this enables the graceful shutdown
gracefulShutdown(server);
```


### Advanced Options

You can pass an options-object to specify your specific options for the graceful shutdown

The following example uses specifies all possible options (using more or less the default settings):

```
var gracefulShutdown = require('http-graceful-shutdown');
...
server = app.listen(...);
...

// this enables the graceful shutdown with advanced options
gracefulShutdown(server,
	{
		signals: 'SIGINT SIGTERM',
		timeout: 30000,
		development: false,
		callback: function() {
			console.log('Server gracefulls shutted down.....')
		}
	}
);
```

### Option Reference

| option         | default | Comments |
| -------------- | --------------------- | ---------------------- |
| signals | 'SIGINT SIGTERM' | define the signals, that should be handeled (separated by SPACE) |
| timeout | 30000 | timeout till forced shutdown (in milli seconds) |
| development | false | if set to true, no graceful shutdown is proceeded to speed up dev-process |
| callback | - | here you can place a small (not time consuming) callback function, that will be handeled at the end of the shutdown (not in dev-mode) |

## Version history

| Version        | Date           | Comment  |
| -------------- | -------------- | -------- |
| 1.0.3          | 2015-09-15     | updated docs |
| 1.0.1          | 2015-09-14     | updated docs, reformated code |
| 1.0.0          | 2015-09-14     | initial release |


## Comments

If you have ideas or comments, please do not hesitate to contact me.

Sincerely,

Sebastian Hildebrandt, [+innovations](http://www.plus-innovations.com)

## Credits

Written by Sebastian Hildebrandt [sebhildebrandt](https://github.com/sebhildebrandt)

## License [![MIT license][license-img]][license-url]

>The [`MIT`][license-url] License (MIT)
>
>Copyright &copy; 2015 Sebastian Hildebrandt, [+innovations](http://www.plus-innovations.com).
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

[express-url]: https://github.com/strongloop/expressjs.com
[koa-url]: https://github.com/koajs/koa
[http-url]: https://nodejs.org/api/http.html

[daviddm-url]: https://david-dm.org/sebhildebrandt/http-graceful-shutdown
[daviddm-img]: https://img.shields.io/david/sebhildebrandt/http-graceful-shutdown.svg?style=flat-square

[issues-img]: https://img.shields.io/github/issues/sebhildebrandt/http-graceful-shutdown.svg?style=flat-square
[issues-url]: https://github.com/sebhildebrandt/http-graceful-shutdown/issues
