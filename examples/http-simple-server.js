const http = require('http');
const gracefulShutdown = require('../lib/index');
const port = 3000;

const server = http.createServer();
server.on('error', (err) => console.error(err));

server.on('stream', (stream, headers) => {
  // stream is a Duplex
  stream.respond({
    'content-type': 'text/html; charset=utf-8',
    ':status': 200
  });
  stream.end('Hello World');
});

server.listen(port, () => {
  console.log('HTTP-GRACEFUL-SHUTDOWN')
  console.log('-----------------------------------------')
  console.log('Simple HTTP test using default options')
  console.log(`Listening at http://localhost:${port}`)
  console.log()
  console.log(`Press Ctrl-C to test shutdown`)
});

gracefulShutdown(server,
  {
    finally: function () {
      console.log()
      console.log('Server gracefully shutted down.....')
    }
  }
);

