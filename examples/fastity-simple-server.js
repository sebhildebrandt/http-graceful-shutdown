const Fastify = require('fastify');
const gracefulShutdown = require('../lib/index');
const port = 3000;

const fastify = Fastify();

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

gracefulShutdown(fastify.server,
  {
    finally: function () {
      console.log();
      console.log('Server graceful shut down completed.');
    }
  }
);

