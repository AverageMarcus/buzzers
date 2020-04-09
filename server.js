const express = require("express");
const exphbs  = require('express-handlebars');
const bodyParser = require('body-parser');
const Fingerprint = require('express-fingerprint');
const WebSocket = require('ws');
const http = require('http');

const rooms = require('./room');

const app = express();
const server = http.createServer(app);

app.use(Fingerprint({
    parameters:[
        Fingerprint.useragent,
        Fingerprint.acceptHeaders,
        Fingerprint.geoip
    ]
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
})); 

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(express.static("public"));

app.get("/:roomId/join", (request, response) => {
  
  let room = rooms.getOrCreateRoom(request.params.roomId);
  let participant = room.participants.find(p => p.participantId === request.fingerprint.hash);
  
  if (participant) {
    response.render('room', {
      layout: false, 
      room: request.params.roomId,
      name: participant.participantName,
      participantName: participant.participantName,
      participantId: participant.participantId,
    });
  } else {
     response.render('join', {layout: false, room: request.params.roomId});
  }  
});

app.post("/:roomId/join", (request, response) => {
  rooms.addParticipant(request.params.roomId, request.fingerprint.hash, request.body.name);
  response.redirect(`/${request.params.roomId}/join`);
});

server.listen(process.env.PORT, () => {
    console.log("Your app is listening on port " + server.address().port);
});


const wss = new WebSocket.Server({ server });
wss.on('connection', (ws, req) => {
    ws.on('message', (message) => {
      message = JSON.stringify(message);
      console.log(message)
      console.log(message.type)
      console.log(message.data)
    });

    ws.send('Connected');
});