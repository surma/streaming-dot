var doT = require('../streaming-dot.js');
var fs = require('fs');
var express = require('express');

function timeoutPromise(t) {
  return new Promise(resolve =>
    setTimeout(resolve, t)
  );
}

var app = express();

app.get('/streaming-dot.js', express.static('../'));
app.get('/', (req, res, next) => {
  fs.readFile('app/index.dot', 'utf-8', (_, data) => {
    var template = doT.compile(data);
    var stream = template({
      header: fs.createReadStream('app/header.partial.html'),
      footer: fs.createReadStream('app/footer.partial.html'),
      location: timeoutPromise(2000).then(_ => 'server-side')
    });
    res.set('Content-Type', 'text/html');
    stream.pipe(res);
  });
});
app.use('/', express.static('app'));

console.log('Starting webserver on http://localhost:8080');
require('http').createServer(app).listen(8080);