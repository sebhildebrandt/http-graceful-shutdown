const koa = require('koa');
const gracefulShutdown = require('../lib/index');
const app = new koa();
const port = 3000;

server = app.listen(port, () => {
  console.log('HTTP-GRACEFUL-SHUTDOWN')
  console.log('-------------------------------------------')
  console.log('Simple KOA test using default options')
  console.log(`Listening at http://localhost:${port}`)
  console.log()
  console.log(`Press Ctrl-C to test shutdown`)
});

app.use(async ctx => {
  ctx.body = 'Hello World';
});

gracefulShutdown(server,
  {
    finally: function () {
      console.log()
      console.log('Server gracefully shutted down.....')
    }
  }
);

