const express = require('express')
const gracefulShutdown = require('../lib/index');
const app = express();
const port = 3000;

server = app.listen(port, () => {
  console.log('HTTP-GRACEFUL-SHUTDOWN')
  console.log('-----------------------------------------')
  console.log('Simple EXPRESS test using default options')
  console.log(`Listening at http://localhost:${port}`)
  console.log()
  console.log(`Press Ctrl-C to test shutdown`)
});

app.get('/', (req, res) => {
  res.send('Hello World!')
})

gracefulShutdown(server,
  {
    finally: function () {
      console.log()
      console.log('Server gracefully shutted down.....')
    }
  }
);

