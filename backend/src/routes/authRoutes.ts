import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID as uuidv4 } from 'crypto';
import { generateToken, AuthRequest, authenticateJWT } from '../middleware/auth';
import { UserModel, embeddedUsers } from '../models/User';
import { isMongoConnected } from '../config/db';
import { Neo4jService } from '../graph/neo4jService';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'player', handedness = 'Right' } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const userId = `usr-${uuidv4().slice(0, 8)}`;
    const playerId = `plr-${uuidv4().slice(0, 8)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const userObj = {
      userId,
      name,
      email,
      passwordHash,
      role,
      playerId
    };

    if (isMongoConnected) {
      await UserModel.create(userObj);
    } else {
      embeddedUsers.set(email, userObj);
    }

    // Create corresponding Player node in Neo4j Graph
    await Neo4jService.upsertPlayer({
      playerId,
      name,
      email,
      handedness,
      joinedAt: new Date().toISOString(),
      currentRank: 50,
      highestBreak: 0,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      avgBreak: 0
    });

    const token = generateToken({ userId, email, role, playerId });
    return res.status(201).json({ token, user: { userId, name, email, role, playerId } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    let user: any = null;

    if (isMongoConnected) {
      user = await UserModel.findOne({ email });
    } else {
      user = embeddedUsers.get(email);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
      playerId: user.playerId
    });

    return res.json({ token, user: { userId: user.userId, name: user.name, email: user.email, role: user.role, playerId: user.playerId } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticateJWT, (req: AuthRequest, res: Response) => {
  return res.json({ user: req.user });
});

export default router;
