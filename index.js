var socket = require('socket.io');
var exec = require('child-process-promise').exec;
var http = require('http');
var _ = require('underscore');
var moment = require('moment');
var recordDirectory = './';
var command = ['arecord', '-D', 'plughw:1',  '-f', 'S16_LE', '-c2',  '--duration=10', '-vv'];


// Send index.html to all requests
var app = http.createServer(function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(index);
});

// Socket.io server listens to our app
var io = require('socket.io').listen(app);

// Send current time to all connected clients
function sendTime() {
  io.emit('time', { time: new Date().toJSON() });
}

// Send current time every 10 secs
setInterval(sendTime, 10000);

// Emit welcome message on connection
io.on('connection', function(socket) {
  console.log('someone connected.');
  // Use socket to communicate with this particular client only, sending it it's own id
  socket.emit('welcome', { message: 'Welcome!', id: socket.id });
  socket.on('i am client', console.log);
  socket.on('record', function () {
    var stamp = moment().format('YYYY-MM-DD-HH');
    var localCommand = _.extend([], command);
    localCommand.push(recordDirectory + stamp + '.wav');
    console.log(command, localCommand, recordDirectory);
    exec(command.join(' ')).then(function (data) {
      console.log('recording done.');
      socket.emit('recording-done');
    });
  });
});

app.listen(3333);