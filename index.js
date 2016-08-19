var socket = require('socket.io');
var exec = require('child-process-promise').exec;
var http = require('http');
var _ = require('underscore');
var moment = require('moment');
var recordDirectory = '/media/pi/EXURO/';
var command = ['arecord', '-D', 'plughw:1',  '-f', 'S16_LE', '-c2', '-r', '48000', '--duration=300', '-vv'];
var lameCommand = ['lame', '--preset', 'insane'];


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
  console.log('some Burner connected.');
  // Use socket to communicate with this particular client only, sending it it's own id
  socket.on('record', function () {
    var stamp = moment().format('YYYY-MM-DD-HH-mm-SS');
    var localCommand = _.extend([], command);
    var file = recordDirectory + stamp + '.wav';
    localCommand.push(file);
    var commandStr = localCommand.join(' ');
    console.log(commandStr);
    socket.emit('recording-start');
    exec(commandStr).then(function (data) {
      console.log('recording done.');
      socket.emit('recording-done');
      console.log('encoding start.');
      socket.emit('encoding-start');
      var encodeCommand = _.extend([], lameCommand);
      encodeCommand.push(file);
      var encodeCommandString = encodeCommand.join(' ');
      exec(encodeCommandString).then(function() {
        socket.emit('encoding-done');
        console.log('encoding done');
        exec('rm ' + file).then(function () {
          console.log('delete done');
          socket.emit('delete-done');
        }).catch(function (){
          console.log('delete fail');
          socket.emit('delete-fail');
        });
      }).catch(function(){
        socket.emit('encoding-fail');
        console.log('encoding fail');
      });
    }).catch(function (err) {
      socket.emit('recording-failure', err);
    });
  });
});

app.listen(3333);