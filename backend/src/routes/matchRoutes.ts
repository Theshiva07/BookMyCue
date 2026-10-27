import { Router, Request, Response } from 'express';
import { randomUUID as uuidv4 } from 'crypto';
import { Neo4jService, MatchNode } from '../graph/neo4jService';
import { LiveScoringModel, embeddedMongoDocs } from '../models/LiveScoring';
import { isMongoConnected } from '../config/db';
import { MatchSyncService } from '../services/matchSyncService';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const list: any[] = [];
    embeddedMongoDocs.forEach((doc, matchId) => {
      list.push(doc);
    });
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { playerAId, playerBId, format = 'Snooker', bestOf = 5, eventId, venueId } = req.body;
    if (!playerAId || !playerBId) {
      return res.status(400).json({ error: 'playerAId and playerBId are required' });
    }

    const matchId = `mth-${uuidv4().slice(0, 8)}`;
    const playerA = await Neo4jService.getPlayer(playerAId);
    const playerB = await Neo4jService.getPlayer(playerBId);

    const playerAName = playerA ? playerA.name : `Player ${playerAId.slice(0, 5)}`;
    const playerBName = playerB ? playerB.name : `Player ${playerBId.slice(0, 5)}`;

    // Create MongoDB live scoring doc
    const liveDocData = {
      matchId,
      eventId,
      playerA: { id: playerAId, name: playerAName },
      playerB: { id: playerBId, name: playerBName },
      format,
      status: 'live',
      frames: [
        {
          frameNumber: 1,
          startedAt: new Date().toISOString(),
          shots: [],
          breaks: [],
          frameScoreA: 0,
          frameScoreB: 0
        }
      ],
      currentFrame: 1,
      runningScoreA: 0,
      runningScoreB: 0,
      events: [{ type: 'frame_start', payload: { frameNumber: 1 }, timestamp: new Date().toISOString() }]
    };

    let mongoDocId = matchId;
    if (isMongoConnected) {
      const doc = await LiveScoringModel.create(liveDocData);
      mongoDocId = (doc._id as any).toString();
    } else {
      embeddedMongoDocs.set(matchId, liveDocData as any);
    }

    // Create Neo4j Match node
    const matchNode: MatchNode = {
      matchId,
      eventId,
      playerAId,
      playerBId,
      format,
      bestOf,
      scoreA: 0,
      scoreB: 0,
      status: 'live',
      scheduledAt: new Date().toISOString(),
      venueId,
      mongoScoringDocId: mongoDocId
    };

    await Neo4jService.upsertMatch(matchNode);
    return res.status(201).json({ match: matchNode, liveDoc: liveDocData });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const matchId = req.params.id;
    const matchNode = await Neo4jService.getMatch(matchId);

    let liveDoc = null;
    if (isMongoConnected) {
      liveDoc = await LiveScoringModel.findOne({ matchId });
    } else {
      liveDoc = embeddedMongoDocs.get(matchId) || null;
    }

    if (!matchNode && !liveDoc) {
      return res.status(404).json({ error: 'Match not found' });
    }

    return res.json({
      matchGraphMeta: matchNode,
      liveScoringDoc: liveDoc
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/shot', async (req: Request, res: Response) => {
  try {
    const matchId = req.params.id;
    const { playerId, shotType, ballsPotted, breakValue, foulInfo } = req.body;
    if (!playerId || !shotType) {
      return res.status(400).json({ error: 'playerId and shotType are required' });
    }

    const doc = await MatchSyncService.recordShot(
      matchId,
      playerId,
      shotType,
      ballsPotted,
      breakValue,
      foulInfo
    );
    return res.json(doc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const matchId = req.params.id;
    const { winnerId } = req.body;
    const result = await MatchSyncService.finalizeMatch(matchId, winnerId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/end-frame', async (req: Request, res: Response) => {
  try {
    const matchId = req.params.id;
    const doc = await MatchSyncService.endFrame(matchId);
    return res.json(doc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/abandon', async (req: Request, res: Response) => {
  try {
    const matchId = req.params.id;
    const doc = await MatchSyncService.abandonMatch(matchId);
    return res.json(doc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
