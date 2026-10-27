import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayerProfileDoc extends Document {
  playerId: string;
  avatarUrl: string;
  bio: string;
  preferences: {
    cueType: string;
    favoriteFormat: string;
  };
  settings: {
    notifications: boolean;
    privacy: string;
  };
}

const PlayerProfileSchema = new Schema<IPlayerProfileDoc>({
  playerId: { type: String, required: true, index: true, unique: true },
  avatarUrl: { type: String, default: '' },
  bio: { type: String, default: '' },
  preferences: {
    cueType: { type: String, default: 'Custom Maple' },
    favoriteFormat: { type: String, default: 'Snooker' }
  },
  settings: {
    notifications: { type: Boolean, default: true },
    privacy: { type: String, default: 'public' }
  }
}, { timestamps: true });

export const PlayerProfileModel = mongoose.model<IPlayerProfileDoc>('PlayerProfile', PlayerProfileSchema);
export const embeddedPlayerProfiles = new Map<string, any>();
