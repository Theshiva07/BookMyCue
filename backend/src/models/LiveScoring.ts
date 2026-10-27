import mongoose, { Schema, Document } from 'mongoose';

export interface IShot {
  shotNumber: number;
  playerId: string;
  timestamp: string;
  type: 'pot' | 'safety' | 'foul' | 'miss';
  ballsPotted: string[];
  breakValue: number;
  foul: {
    type: string;
    pointsAwarded: number;
  } | null;
}

export interface IFrameBreak {
  playerId: string;
  value: number;
  timestamp: string;
}

export interface IFrame {
  frameNumber: number;
  startedAt: string;
  endedAt?: string;
  winnerId?: string;
  shots: IShot[];
  breaks: IFrameBreak[];
  frameScoreA: number;
  frameScoreB: number;
}

export interface ILiveScoringEvent {
  type: 'frame_start' | 'frame_end' | 'foul' | 'break' | 'comment';
  payload: any;
  timestamp: string;
}

export interface ILiveScoringDoc extends Document {
  matchId: string;
  eventId?: string;
  tournamentId?: string;
  playerA: { id: string; name: string };
  playerB: { id: string; name: string };
  format: '8-ball' | '9-ball' | 'Snooker';
  status: 'live' | 'completed';
  frames: IFrame[];
  currentFrame: number;
  runningScoreA: number;
  runningScoreB: number;
  events: ILiveScoringEvent[];
}

const LiveScoringSchema = new Schema<ILiveScoringDoc>({
  matchId: { type: String, required: true, index: true, unique: true },
  eventId: { type: String },
  tournamentId: { type: String },
  playerA: {
    id: { type: String, required: true },
    name: { type: String, required: true }
  },
  playerB: {
    id: { type: String, required: true },
    name: { type: String, required: true }
  },
  format: { type: String, enum: ['8-ball', '9-ball', 'Snooker'], required: true },
  status: { type: String, enum: ['live', 'completed'], default: 'live' },
  frames: [
    {
      frameNumber: Number,
      startedAt: String,
      endedAt: String,
      winnerId: String,
      shots: [
        {
          shotNumber: Number,
          playerId: String,
          timestamp: String,
          type: { type: String, enum: ['pot', 'safety', 'foul', 'miss'] },
          ballsPotted: [String],
          breakValue: Number,
          foul: {
            type: { type: String },
            pointsAwarded: Number
          }
        }
      ],
      breaks: [
        {
          playerId: String,
          value: Number,
          timestamp: String
        }
      ],
      frameScoreA: { type: Number, default: 0 },
      frameScoreB: { type: Number, default: 0 }
    }
  ],
  currentFrame: { type: Number, default: 1 },
  runningScoreA: { type: Number, default: 0 },
  runningScoreB: { type: Number, default: 0 },
  events: [
    {
      type: { type: String },
      payload: Schema.Types.Mixed,
      timestamp: String
    }
  ]
}, { timestamps: true });

export const LiveScoringModel = mongoose.model<ILiveScoringDoc>('LiveScoring', LiveScoringSchema);

// In-Memory Document Fallback Store for zero-setup execution
export const embeddedMongoDocs = new Map<string, ILiveScoringDoc>();
