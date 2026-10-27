import { Server, Socket } from 'socket.io';
import { MatchSyncService } from '../services/matchSyncService';

export function setupScoringSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    socket.on('match:join', (matchId: string) => {
      socket.join(`match:${matchId}`);
      console.log(`Client ${socket.id} joined room match:${matchId}`);
    });

    socket.on('match:leave', (matchId: string) => {
      socket.leave(`match:${matchId}`);
    });

    socket.on('shot:recorded', async (data: {
      matchId: string;
      playerId: string;
      shotType: 'pot' | 'safety' | 'foul' | 'miss';
      ballsPotted?: string[];
      breakValue?: number;
      foulInfo?: { type: string; pointsAwarded: number } | null;
    }) => {
      try {
        const updatedDoc = await MatchSyncService.recordShot(
          data.matchId,
          data.playerId,
          data.shotType,
          data.ballsPotted || [],
          data.breakValue || 0,
          data.foulInfo || null
        );

        io.to(`match:${data.matchId}`).emit('score:update', updatedDoc);
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('match:completed', async (data: { matchId: string; winnerId?: string }) => {
      try {
        const { doc, syncSuccess } = await MatchSyncService.finalizeMatch(data.matchId, data.winnerId);
        io.to(`match:${data.matchId}`).emit('match:completed', { doc, syncSuccess });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
