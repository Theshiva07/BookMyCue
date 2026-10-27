import { Router, Response } from 'express';
import { randomUUID as uuidv4 } from 'crypto';
import { Neo4jService, TournamentNode, RoundNode, MatchNode } from '../graph/neo4jService';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type = 'Knockout', playerIds = [] } = req.body;
    if (!name || playerIds.length < 2) {
      return res.status(400).json({ error: 'Tournament name and at least 2 playerIds are required' });
    }

    const tournamentId = `trn-${uuidv4().slice(0, 8)}`;
    const numRounds = Math.ceil(Math.log2(playerIds.length));

    const tournament: TournamentNode = {
      tournamentId,
      name,
      type,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      status: 'In Progress',
      numRounds
    };

    const rounds: RoundNode[] = [];
    const matches: MatchNode[] = [];

    // Create Round 1 matches
    const r1Id = `rnd-${tournamentId}-1`;
    rounds.push({ roundId: r1Id, roundNumber: 1, tournamentId, status: 'In Progress' });

    for (let i = 0; i < playerIds.length; i += 2) {
      const pA = playerIds[i];
      const pB = playerIds[i + 1] || playerIds[0]; // fallback pairing
      const matchId = `mth-${uuidv4().slice(0, 8)}`;
      matches.push({
        matchId,
        tournamentId,
        roundId: r1Id,
        playerAId: pA,
        playerBId: pB,
        format: 'Snooker',
        bestOf: 5,
        scoreA: 0,
        scoreB: 0,
        status: 'scheduled',
        scheduledAt: new Date().toISOString()
      });
    }

    // Create Round 2 Final / Semis if needed
    if (numRounds > 1) {
      const r2Id = `rnd-${tournamentId}-2`;
      rounds.push({ roundId: r2Id, roundNumber: 2, tournamentId, status: 'Scheduled' });
      const finalMatchId = `mth-${uuidv4().slice(0, 8)}`;
      const finalMatch: MatchNode = {
        matchId: finalMatchId,
        tournamentId,
        roundId: r2Id,
        playerAId: playerIds[0],
        playerBId: playerIds[1] || playerIds[0],
        format: 'Snooker',
        bestOf: 7,
        scoreA: 0,
        scoreB: 0,
        status: 'scheduled',
        scheduledAt: new Date(Date.now() + 86400000).toISOString()
      };
      matches.push(finalMatch);

      // Link Round 1 matches to final match via NEXT_MATCH
      matches.slice(0, matches.length - 1).forEach(m => {
        Neo4jService.linkNextMatch(m.matchId, finalMatchId);
      });
    }

    await Neo4jService.createTournament(tournament, rounds, matches);
    return res.status(201).json({ tournament, rounds, matches });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id/bracket', async (req: AuthRequest, res: Response) => {
  try {
    const bracket = await Neo4jService.getTournamentBracket(req.params.id);
    return res.json(bracket);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
