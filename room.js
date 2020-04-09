const chars = require('./characters.json');
const rooms = {};

function getOrCreateRoom(roomId) {
  let room = rooms[roomId];
  
  if (!room) {
    room = {
      roomId: roomId,
      participants: [],
      characters: 
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
  });
  
  rooms[roomId] = room;
}

module.exports = {getOrCreateRoom, addParticipant}