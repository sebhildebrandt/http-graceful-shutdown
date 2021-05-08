const Fastify = require('fastify');
const gracefulShutdown = require('../lib/index');
const http2 = require('http2');
const port = 3000;
const server = http2.createServer((req, res) => {
  handler(req, res);
});

const serverFactory = (handler, opts) => {
  return server;
};

const fastify = Fastify({ serverFactory });

// Declare a route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' });
});

// Run the server!
fastify.listen(port, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log('HTTP-GRACEFUL-SHUTDOWN');
  console.log('-------------------------------------------');
  console.log('Simple FASTIFY test using default options');
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

