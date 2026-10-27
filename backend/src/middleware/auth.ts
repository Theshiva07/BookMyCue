import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cuemybreak_jwt_secret_key_2026';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: 'player' | 'scorer' | 'organizer' | 'admin';
    playerId?: string;
  };
}

export function generateToken(payload: { userId: string; email: string; role: string; playerId?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For demo convenience, attach a fallback mock user if no header provided
    req.user = {
      userId: 'usr-admin-1',
      email: 'admin@cuemybreak.com',
      role: 'admin',
      playerId: 'plr-1'
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
