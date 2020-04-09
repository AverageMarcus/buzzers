const express = require("express");
const exphbs  = require('express-handlebars');
const bodyParser = require('body-parser')
const Fingerprint = require('express-fingerprint')

const rooms = require('./room');

const app = express();

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
      name: participant.participantName
    });
  } else {
     response.render('join', {layout: false, room: request.params.roomId});
  }  
});

app.post("/:roomId/join", (request, response) => {
  rooms.addParticipant(request.params.roomId, request.fingerprint.hash, request.body.name);
  response.render('room', {
    layout: false, 
    room: request.params.roomId,
    name: request.body.name
  });
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
