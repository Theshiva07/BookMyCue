import { Router, Response } from 'express';
import { randomUUID as uuidv4 } from 'crypto';
import { Neo4jService, EventNode } from '../graph/neo4jService';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const events = await Neo4jService.getAllEvents();
    return res.json(events);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, title, type = 'Competition', format = 'Snooker', venueId, startDate, endDate, maxPlayers = 32 } = req.body;
    if (!title || !venueId) {
      return res.status(400).json({ error: 'Title and venueId are required' });
    }

    const event: EventNode = {
      eventId: eventId || `E${String(Math.floor(Math.random() * 900) + 100)}`,
      title,
      type,
      format,
      venueId,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 86400000 * 3).toISOString(),
      status: 'Upcoming',
      createdBy: req.user?.userId || 'U001',
      maxPlayers: Number(maxPlayers) || 32
    };

    const created = await Neo4jService.createEvent(event);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/register', async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const playerId = req.body.playerId || req.user?.playerId;
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }

    await Neo4jService.registerPlayerForEvent(playerId, eventId);
    return res.json({ message: `Player ${playerId} registered for event ${eventId}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
