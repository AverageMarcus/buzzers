
const rooms = {};

export function getOrCreateRoom(roomId) {
  let room = rooms[roomId];
  
  if (!room) {
    room = {
      roomId: roomId,
      participants: []
    };
    rooms[roomId] = room;
  }
  
  return room;
}


export addParticipant(roomId, participantId, participantName) {
  
}