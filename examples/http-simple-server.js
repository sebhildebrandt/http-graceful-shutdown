const http = require('http');
const gracefulShutdown = require('../lib/index');
const port = 3000;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8'),
    res.writeHead(200);
  res.end('Hello World');
});

server.listen(port, () => {
  console.log('HTTP-GRACEFUL-SHUTDOWN');
  console.log('-----------------------------------------');
  console.log('Simple HTTP test using default options');
  console.log(`Listening at http://localhost:${port}`);
  console.log();
  console.log('Press Ctrl-C to test shutdown');
});

gracefulShutdown(server,
  {
    finally: function () {
      console.log();
      console.log('Server graceful shut down completed.');
    }
  }
);

