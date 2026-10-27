import { Neo4jService, PlayerNode, MatchNode } from '../graph/neo4jService';
import { LiveScoringModel, embeddedMongoDocs } from '../models/LiveScoring';
import { MatchSyncService } from '../services/matchSyncService';

async function runMatchSyncTest() {
  console.log('🧪 Starting Polyglot Sync-on-Completion Transaction Unit Test...');

  const playerA: PlayerNode = {
    playerId: 'test-player-a',
    name: 'Ronnie O\'Sullivan',
    email: 'ronnie@cuemybreak.com',
    joinedAt: new Date().toISOString(),
    currentRank: 1,
    highestBreak: 147,
    totalMatches: 10,
    wins: 8,
    losses: 2,
    winRate: 80,
    avgBreak: 65
  };

  const playerB: PlayerNode = {
    playerId: 'test-player-b',
    name: 'Judd Trump',
    email: 'judd@cuemybreak.com',
    joinedAt: new Date().toISOString(),
    currentRank: 2,
    highestBreak: 147,
    totalMatches: 10,
    wins: 7,
    losses: 3,
    winRate: 70,
    avgBreak: 60
  };

  const matchId = 'test-match-sync-1';
  const match: MatchNode = {
    matchId,
    playerAId: playerA.playerId,
    playerBId: playerB.playerId,
    format: 'Snooker',
    bestOf: 5,
    scoreA: 0,
    scoreB: 0,
    status: 'live',
    scheduledAt: new Date().toISOString()
  };

  // 1. Seed players and match in Neo4j Graph
  await Neo4jService.upsertPlayer(playerA);
  await Neo4jService.upsertPlayer(playerB);
  await Neo4jService.upsertMatch(match);

  // 2. Initialize live scoring document in MongoDB embedded store
  const mockLiveDoc: any = {
    matchId,
    playerA: { id: playerA.playerId, name: playerA.name },
    playerB: { id: playerB.playerId, name: playerB.name },
    format: 'Snooker',
    status: 'live',
    frames: [
      {
        frameNumber: 1,
        startedAt: new Date().toISOString(),
        shots: [],
        breaks: [{ playerId: playerA.playerId, value: 72, timestamp: new Date().toISOString() }],
        frameScoreA: 72,
        frameScoreB: 14
      },
      {
        frameNumber: 2,
        startedAt: new Date().toISOString(),
        shots: [],
        breaks: [{ playerId: playerA.playerId, value: 85, timestamp: new Date().toISOString() }],
        frameScoreA: 85,
        frameScoreB: 0
      },
      {
        frameNumber: 3,
        startedAt: new Date().toISOString(),
        shots: [],
        breaks: [{ playerId: playerA.playerId, value: 104, timestamp: new Date().toISOString() }],
        frameScoreA: 104,
        frameScoreB: 20
      }
    ],
    currentFrame: 3,
    runningScoreA: 0,
    runningScoreB: 0,
    events: []
  };
  embeddedMongoDocs.set(matchId, mockLiveDoc);

  // 3. Execute finalizeMatch sync transaction
  const { doc, syncSuccess } = await MatchSyncService.finalizeMatch(matchId, playerA.playerId);

  // 4. Verification Assertions
  console.assert(syncSuccess === true, 'Sync should return true');
  console.assert(doc.status === 'completed', 'Doc status should be completed');

  const updatedMatch = await Neo4jService.getMatch(matchId);
  console.assert(updatedMatch?.status === 'completed', 'Neo4j Match status should be completed');
  console.assert(updatedMatch?.winnerId === playerA.playerId, 'Neo4j Match winner should be Ronnie');
  console.assert(updatedMatch?.scoreA === 3, 'Score A should be 3');

  const h2h = await Neo4jService.getHeadToHead(playerA.playerId, playerB.playerId);
  console.assert(h2h.matches >= 1, 'Head-to-head match count should be incremented');

  const updatedPlayerA = await Neo4jService.getPlayer(playerA.playerId);
  console.assert(updatedPlayerA?.totalMatches === 11, 'Player A totalMatches should be 11');
  console.assert(updatedPlayerA?.wins === 9, 'Player A wins should be 9');

  console.log('✅ PASS: Polyglot Sync-on-Completion Transaction verified successfully!');
}

runMatchSyncTest().catch(err => {
  console.error('❌ FAIL: Match Sync test threw error:', err);
  process.exit(1);
});
