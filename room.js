const chars = require('./characters.json');
const rooms = {};

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOrCreateRoom(roomId) {
  let room = rooms[roomId];

  if (!room) {
    room = {
      roomId: roomId,
      participants: [],
      audience: [],
      characters: shuffle(chars),
      canBuzz: true
    };
    rooms[roomId] = room;
  }

  return room;
}

function addParticipant(roomId, participantId, participantName) {
  let room = getOrCreateRoom(roomId);

  room.participants.push({
    participantId,
    participantName,
    character: room.characters[room.participants.length],
    active: true
  });

  rooms[roomId] = room;
}

function removeParticipant(roomId, participantId) {
  let room = getOrCreateRoom(roomId);
  let participant = room.participants.find(p => p.participantId === participantId);
  if (participant) {
    participant.active = false;
    room.audience.forEach(ws => {
      ws.send(JSON.stringify({
        type: "participants",
        participants: room.participants
      }));
    });
  }
}

function addParticipantWS(roomId, participantId, ws) {
  let room = getOrCreateRoom(roomId);
  let participant = room.participants.find(p => p.participantId === participantId);
  if (participant) {
    participant.ws = ws;
    room.audience.forEach(ws => {
      ws.send(JSON.stringify({
        type: "participants",
        participants: room.participants
      }));
    });
  }
}

function addAudienceWS(roomId, ws) {
  let room = getOrCreateRoom(roomId);
  room.audience.push(ws);
  ws.send(JSON.stringify({
    type: "participants",
    participants: room.participants
  }));
}

function buzz(roomId, participant) {
  let room = getOrCreateRoom(roomId);
  if (room.canBuzz) {
    room.canBuzz = false;

    participant = room.participants.find(p => p.participantId === participant.participantId);

    if (participant) {
      room.participants.forEach(p => {
        if (p.ws && p.participantId !== participant.participantId) {
          p.ws.send(JSON.stringify({
            type: "buzz",
            participant: participant.participantName,
            msg: `<img src="${participant.character}"><div>${participant.participantName} buzzed!</div>`
          }));
        }
      });
      room.audience.forEach(ws => {
        ws.send(JSON.stringify({
          type: "buzz",
          participant: participant
        }));
      });
    }
  }
}

function reset(roomId) {
  let room = getOrCreateRoom(roomId);
  room.canBuzz = true;

  room.participants.forEach(p => {
    if (p.ws) {
      p.ws.send(JSON.stringify({
        type: "reset"
      }));
    }
  });
}

function closeRoom(roomId) {
  let room = getOrCreateRoom(roomId);
  room.canBuzz = false;

  room.participants.forEach(p => {
    if (p.ws) {
      p.ws.send(JSON.stringify({
        type: "close"
      }));
    }
  });

  delete rooms[roomId];
}

function updateScore(roomId, participantId, points) {
  let room = getOrCreateRoom(roomId);
  let participant = room.participants.find(p => p.participantId === participantId);
  if (participant) {
    if (!participant.score) participant.score = 0;

    participant.score += points;

    if (participant.ws) {
      participant.ws.send(JSON.stringify({
        type: "score",
        score: participant.score,
      }));
    }
  }

  room.audience.forEach(ws => {
    ws.send(JSON.stringify({
      type: "participants",
      participants: room.participants.map(p => { return {
        participantId: p.participantId,
        character: p.character,
        participantName: p.participantName,
        score: p.score,
        active: p.active,
      }})
    }));
  });
}

module.exports = {getOrCreateRoom, addParticipant, addParticipantWS, addAudienceWS, buzz, removeParticipant, reset, closeRoom, updateScore}
