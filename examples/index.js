var doT = require('../streaming-dot.js');
var fs = require('fs');
var express = require('express');

var app = express();

app.get('/streaming-dot.js', express.static('../'));
app.get('/streaming-dot.min.js', express.static('../'));
app.use('/node_modules', express.static('../node_modules'));
app.get('/', (req, res, next) => {
  fs.readFile('app/index.dot.html', 'utf-8', (_, data) => {
    var template = doT.compile(data);
    var stream = template({
      header: fs.createReadStream('app/header.partial.html'),
      footer: fs.createReadStream('app/footer.partial.html'),
      version: doT.version
    });
    res.set('Content-Type', 'text/html');
    stream.pipe(res);
  });
});
app.use('/', express.static('app'));

console.log('Starting webserver on http://localhost:8080');
require('http').createServer(app).listen(8080);