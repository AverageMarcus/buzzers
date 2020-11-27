const express = require("express");
const exphbs  = require('express-handlebars');
const bodyParser = require('body-parser');
const Fingerprint = require('express-fingerprint');
const WebSocket = require('ws');
const http = require('http');
const randomWords = require('random-words');
const rooms = require('./room');
const room = require("./room");

const app = express();
const server = http.createServer(app);

app.use(Fingerprint({ parameters: [Fingerprint.useragent, Fingerprint.acceptHeaders, Fingerprint.geoip] }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.use(express.static("public"));

app.get("/", (request, response) => {
  response.render('index', {
    layout: false,
    suggestedTitle: randomWords({exactly: 1, wordsPerString: 3, separator: '-', maxLength: 5})
  });
});

app.get("/:roomId", (request, response) => {
  let room = rooms.getOrCreateRoom(request.params.roomId.trim().toLowerCase());
  let participant = room.participants.find(p => p.participantId === request.fingerprint.hash);

  if (room.audience.length === 0) {
    response.render('audience', {
      layout: false,
      room: request.params.roomId.trim().toLowerCase(),
      participants: room.participants,
    });
  } else if (participant) {
    response.render('room', {
      layout: false,
      room: request.params.roomId.trim().toLowerCase(),
      name: participant.participantName,
      participantName: participant.participantName,
      participantId: participant.participantId,
      character: participant.character,
    });
  } else {
    response.render('join', {layout: false, room: request.params.roomId.trim().toLowerCase()});
  }
});

app.post("/:roomId", (request, response) => {
  rooms.addParticipant(request.params.roomId.toLowerCase(), request.fingerprint.hash, request.body.name);
  response.redirect(`/${request.params.roomId.toLowerCase()}`);
});

server.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + server.address().port);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  let roomId = req.url.substring(1).toLowerCase();

  if (roomId.includes("/audience")) {
    roomId = roomId.replace("/audience", "");
    rooms.addAudienceWS(roomId, ws);

    ws.on('message', (message) => {
      message = JSON.parse(message);
      if (message.type === "reset") {
        rooms.reset(roomId);
      } else if (message.type === "point") {
        rooms.updateScore(roomId, message.participantId, message.points);
      }
    });

    ws.on('close', () => {
      room.closeRoom(roomId);
    });
  } else {
    let participant;
    ws.on('message', (message) => {
      message = JSON.parse(message);
      if (message.type === "join") {
        participant = message.data;
        rooms.addParticipantWS(roomId, participant.participantId, ws)
      }
      if (message.type === "buzz") {
        console.log(`${participant.participantName} buzzed!`)
        rooms.buzz(roomId, participant);
      }
    });

    ws.on('close', () => {
      if (participant) {
        rooms.removeParticipant(roomId, participant.participantId);
      }
    });
  }
});
