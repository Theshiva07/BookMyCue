import { Router, Request, Response } from 'express';
import { Neo4jService, embeddedGraph } from '../graph/neo4jService';
import { PlayerProfileModel, embeddedPlayerProfiles } from '../models/PlayerProfile';
import { isMongoConnected } from '../config/db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const players = await Neo4jService.getAllPlayers();
    return res.json(players);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { playerId, name, email, handedness = 'Right', homeVenueId, ranking_points = 1000, highest_break = 0 } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const pId = playerId || `P${String(embeddedGraph.players.size + 1).padStart(3, '0')}`;
    const newPlayer = {
      playerId: pId,
      name,
      email: email || `${name.toLowerCase().replace(/[^a-z]/g, '')}@cuemybreak.com`,
      handedness,
      homeVenueId,
      joinedAt: new Date().toISOString(),
      currentRank: embeddedGraph.players.size + 1,
      highestBreak: Number(highest_break) || 0,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      avgBreak: 0
    };

    const created = await Neo4jService.upsertPlayer(newPlayer);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id/profile', async (req: Request, res: Response) => {
  try {
    const playerId = req.params.id;
    const playerGraph = await Neo4jService.getPlayer(playerId);
    if (!playerGraph) {
      return res.status(404).json({ error: 'Player not found' });
    }

    let profileDoc = null;
    if (isMongoConnected) {
      profileDoc = await PlayerProfileModel.findOne({ playerId });
    } else {
      profileDoc = embeddedPlayerProfiles.get(playerId) || {
        playerId,
        avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        bio: `${playerGraph.name} is a high-performance tournament player featuring exceptional break building and tactical safety play.`,
        preferences: { cueType: 'Parris Ultimate Snooker Cue 3/4', favoriteFormat: 'Snooker' },
        settings: { notifications: true, privacy: 'public' }
      };
    }

    return res.json({
      graphStats: playerGraph,
      profile: profileDoc
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const playerId = req.params.id;
    const matches: any[] = [];

    embeddedGraph.matches.forEach(m => {
      if (m.playerAId === playerId || m.playerBId === playerId) {
        const oppId = m.playerAId === playerId ? m.playerBId : m.playerAId;
        const opponent = embeddedGraph.players.get(oppId);
        matches.push({
          ...m,
          opponentName: opponent ? opponent.name : oppId,
          isWinner: m.winnerId === playerId
        });
      }
    });

    return res.json(matches.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:idA/vs/:idB', async (req: Request, res: Response) => {
  try {
    const { idA, idB } = req.params;
    const playerA = await Neo4jService.getPlayer(idA);
    const playerB = await Neo4jService.getPlayer(idB);

    if (!playerA || !playerB) {
      return res.status(404).json({ error: 'One or both players not found' });
    }

    const h2h = await Neo4jService.getHeadToHead(idA, idB);
    return res.json({
      playerA,
      playerB,
      headToHead: h2h
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
