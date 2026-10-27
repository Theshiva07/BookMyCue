import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDoc extends Document {
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'player' | 'scorer' | 'organizer' | 'admin';
  playerId?: string;
}

const UserSchema = new Schema<IUserDoc>({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['player', 'scorer', 'organizer', 'admin'], default: 'player' },
  playerId: { type: String }
}, { timestamps: true });

export const UserModel = mongoose.model<IUserDoc>('User', UserSchema);
export const embeddedUsers = new Map<string, any>();
