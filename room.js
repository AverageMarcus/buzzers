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
      characters: shuffle(chars)
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
    character: room.characters[room.participants.length]
  });
  
  rooms[roomId] = room;
}

function addParticipantWS(roomId, participantId, ws) {
  let room = getOrCreateRoom(roomId);
  room.participants.find(p => p.participantId === participantId).ws = ws;
  room.audience.forEach(ws => ws.send(JSON.stringify({type: "new_participant"})));
}

function addAudienceWS(roomId, ws) {
  let room = getOrCreateRoom(roomId);
  room.audience.push(ws);
}

function buzz(roomId, participant) {
  let room = getOrCreateRoom(roomId);
  room.participants.forEach(p => {
    if (p.ws && p.participantId !== participant.participantId) {
      p.ws.send(JSON.stringify({
        type: "buzz",
        participant: participant.participantName,
        msg: `<img src="${participant.character}"> ${participant.participantName} buzzed!`
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

module.exports = {getOrCreateRoom, addParticipant, addParticipantWS, addAudienceWS, buzz}