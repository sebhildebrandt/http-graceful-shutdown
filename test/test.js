const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const gracefulShutdown = require('../lib/index.js');

function get(port) {
  return new Promise((resolve, reject) => {
    http
      .get({ port, agent: new http.Agent({ keepAlive: true }) }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ body, headers: res.headers }));
      })
      .on('error', reject);
  });
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, () => resolve(server.address().port)));
}

test('waits for in-flight request, runs hooks in order, accepts nothing afterwards', async () => {
  const events = [];
  const server = http.createServer((req, res) => {
    setTimeout(() => res.end('ok'), 300);
  });
  const port = await listen(server);

  const shutdown = gracefulShutdown(server, {
    forceExit: false,
    preShutdown: async () => { events.push('preShutdown'); },
    onShutdown: async () => { events.push('onShutdown'); },
    finally: (signal) => events.push('finally:' + signal),
  });

  const resPromise = get(port);
  await new Promise((r) => setTimeout(r, 50));
  const shutdownDone = shutdown();

  const res = await resPromise;
  assert.equal(res.body, 'ok');
  assert.equal(res.headers.connection, 'close');

  await shutdownDone;
  assert.deepEqual(events, ['preShutdown', 'onShutdown', 'finally:manual']);
  await assert.rejects(get(port));
});

test('force-kills hanging connections after timeout', async () => {
  const server = http.createServer(() => { /* never responds */ });
  const port = await listen(server);

  const shutdown = gracefulShutdown(server, { forceExit: false, timeout: 500 });

  const resPromise = get(port);
  await new Promise((r) => setTimeout(r, 50));

  await shutdown();
  await assert.rejects(resPromise);
});

test('runs finally and rejects with original error when onShutdown fails', async () => {
  const server = http.createServer((req, res) => res.end('ok'));
  await listen(server);

  const boom = new Error('boom');
  let finallySignal = null;
  const shutdown = gracefulShutdown(server, {
    forceExit: false,
    onShutdown: async () => { throw boom; },
    finally: (signal) => { finallySignal = signal; },
  });

  const err = await shutdown().catch((e) => e);
  assert.equal(err, boom);
  assert.equal(finallySignal, 'manual');
});

test('concurrent shutdown calls share one run', async () => {
  const server = http.createServer((req, res) => res.end('ok'));
  await listen(server);

  let preShutdownCalls = 0;
  const shutdown = gracefulShutdown(server, {
    forceExit: false,
    preShutdown: async () => {
      preShutdownCalls++;
      await new Promise((r) => setTimeout(r, 100));
    },
  });

  await Promise.all([shutdown(), shutdown()]);
  assert.equal(preShutdownCalls, 1);
});

test('rejects signals that cannot be intercepted', () => {
  const server = http.createServer();
  assert.throws(() => gracefulShutdown(server, { signals: 'SIGKILL' }));
  assert.throws(() => gracefulShutdown(server, { signals: 'SIGSTOP' }));
});

test('destroys idle keep-alive sockets immediately, shutdown resolves quickly', async () => {
  const server = http.createServer((req, res) => res.end('ok'));
  const port = await listen(server);

  const shutdown = gracefulShutdown(server, { forceExit: false, timeout: 5000 });

  await get(port);
  const start = Date.now();
  await shutdown();
  assert.ok(Date.now() - start < 2000, 'shutdown did not wait for idle socket');
  await assert.rejects(get(port));
});
