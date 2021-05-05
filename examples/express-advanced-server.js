const express = require('express')
const gracefulShutdown = require('../lib/index');
const app = express()
const port = 3000

const server = app.listen(port, () => {
  console.log('HTTP-GRACEFUL-SHUTDOWN')
  console.log('-------------------------------------------')
  console.log('Advanced EXPRESS test using advanced options and cleanup function')
  console.log(`Listening at http://localhost:${port}`)
  console.log()
  console.log(`Press Ctrl-C to test shutdown`)
});

app.get('/', (req, res) => {
  setTimeout(() => {
    res.send('Hello World!')
  }, 15000);

})

// personal cleanup function
// - must return a promise
// - the input parameter is optional (only needed if you want to
//   access the signal type inside this function)
// - this function here in this example takes one second to complete
function cleanup(signal) {
  return new Promise((resolve) => {
    console.log();
    console.log('"onShutdown" function');
    console.log('... called signal: ' + signal);
    console.log('... in cleanup');
    console.log('... for 5 seconds');
    console.log('...');
    setTimeout(function () {
      console.log('... cleanup finished');
      resolve();
    }, 5000);
  });
}

// this enables the graceful shutdown with advanced options
gracefulShutdown(server,
  {
    signals: 'SIGINT SIGTERM',
    timeout: 3000,
    development: false,
    onShutdown: cleanup,
    forceExit: true,
    finally: function () {
      console.log()
      console.log('In "finally" function')
      console.log('... Server was gracefully shut down.....')
    }
  }
);
