import { io, Socket } from 'socket.io-client';

export const socket: Socket = io(window.location.origin, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});

export function joinMatchRoom(matchId: string) {
  socket.emit('match:join', matchId);
}

export function leaveMatchRoom(matchId: string) {
  socket.emit('match:leave', matchId);
}
