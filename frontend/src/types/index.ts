export interface Player {
  playerId: string;
  name: string;
  email: string;
  phone?: string;
  handedness?: 'Right' | 'Left' | 'Ambidextrous';
  homeVenueId?: string;
  joinedAt: string;
  currentRank: number;
  highestBreak: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  avgBreak: number;
}

export interface Event {
  eventId: string;
  title: string;
  type: 'Friendly' | 'Competition';
  format: '8-ball' | '9-ball' | 'Snooker';
  venueId: string;
  startDate: string;
  endDate: string;
  status: 'Upcoming' | 'Ongoing' | 'Completed';
  createdBy: string;
  maxPlayers: number;
}

export interface Match {
  matchId: string;
  eventId?: string;
  tournamentId?: string;
  roundId?: string;
  playerAId: string;
  playerBId: string;
  format: string;
  bestOf: number;
  scoreA: number;
  scoreB: number;
  winnerId?: string;
  status: 'scheduled' | 'live' | 'completed';
  scheduledAt: string;
  completedAt?: string;
  venueId?: string;
  mongoScoringDocId?: string;
}

export interface LiveScoringDoc {
  matchId: string;
  eventId?: string;
  playerA: { id: string; name: string };
  playerB: { id: string; name: string };
  format: '8-ball' | '9-ball' | 'Snooker';
  status: 'live' | 'completed';
  frames: {
    frameNumber: number;
    startedAt: string;
    endedAt?: string;
    winnerId?: string;
    shots: {
      shotNumber: number;
      playerId: string;
      timestamp: string;
      type: 'pot' | 'safety' | 'foul' | 'miss';
      ballsPotted: string[];
      breakValue: number;
      foul: { type: string; pointsAwarded: number } | null;
    }[];
    breaks: { playerId: string; value: number; timestamp: string }[];
    frameScoreA: number;
    frameScoreB: number;
  }[];
  currentFrame: number;
  runningScoreA: number;
  runningScoreB: number;
  events: any[];
}

export interface HeadToHeadData {
  playerA: Player;
  playerB: Player;
  headToHead: {
    matches: number;
    wins: number;
    losses: number;
    lastPlayed: string;
  };
}

export interface PageRankItem {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
}

export interface LouvainCommunity {
  playerId: string;
  playerName: string;
  communityId: number;
  communityName: string;
}

export interface SimilarityPair {
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  similarity: number;
  sharedOpponents: number;
}

export interface GraphData {
  nodes: { id: string; name?: string; label?: string; type?: string; group?: string; [key: string]: any }[];
  links: { source: string; target: string; type: string; [key: string]: any }[];
}
