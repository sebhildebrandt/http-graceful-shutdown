const http2 = require('http2');
const gracefulShutdown = require('../lib/index');
const port = 3000;

const server = http2.createServer();

server.on('stream', (stream, headers) => {
  stream.respond({
    'content-type': 'text/html; charset=utf-8',
    ':status': 200
  });
  stream.end('<h1>Hello World</h1>');
});

server.listen(port, () => {
  console.log('HTTP-GRACEFUL-SHUTDOWN');
  console.log('-----------------------------------------');
  console.log('Simple HTTP2 test using default options');
  console.log(`Listening at http://localhost:${port}`);
  console.log();
  console.log('Press Ctrl-C to test shutdown');
});

gracefulShutdown(server,
  {
    finally: function () {
      console.log();
      console.log('Server gracefully shutted down.....');
    }
  }
);

