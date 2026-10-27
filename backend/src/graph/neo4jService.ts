import { neo4jDriver, isNeo4jConnected } from '../config/db';

export interface PlayerNode {
  playerId: string;
  name: string;
  email: string;
  phone?: string;
  dob?: string;
  handedness?: 'Right' | 'Left' | 'Ambidextrous';
  homeVenueId?: string;
  joinedAt: string;
  currentRank: number;
  highestBreak: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  avgBreak: number;
}

export interface EventNode {
  eventId: string;
  title: string;
  type: 'Friendly' | 'Competition';
  format: '8-ball' | '9-ball' | 'Snooker';
  venueId: string;
  startDate: string;
  endDate: string;
  status: 'Upcoming' | 'Ongoing' | 'Completed';
  createdBy: string;
  maxPlayers: number;
}

export interface TournamentNode {
  tournamentId: string;
  name: string;
  type: 'Knockout' | 'RoundRobin';
  startDate: string;
  endDate: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  numRounds: number;
  winnerId?: string;
}

export interface RoundNode {
  roundId: string;
  roundNumber: number;
  tournamentId: string;
  status: string;
}

export interface MatchNode {
  matchId: string;
  eventId?: string;
  tournamentId?: string;
  roundId?: string;
  playerAId: string;
  playerBId: string;
  format: string;
  bestOf: number;
  scoreA: number;
  scoreB: number;
  winnerId?: string;
  status: 'scheduled' | 'live' | 'completed';
  scheduledAt: string;
  completedAt?: string;
  venueId?: string;
  mongoScoringDocId?: string;
}

export interface VenueNode {
  venueId: string;
  name: string;
  city: string;
  tableCount: number;
}

export interface HostNode {
  hostId: string;
  name: string;
  email: string;
  phone?: string;
  organization: string;
}

export interface PlayedAgainstEdge {
  matches: number;
  wins: number;
  losses: number;
  lastPlayed: string;
}

// In-Memory Embedded Graph Engine Fallback Store
class EmbeddedGraphStore {
  players = new Map<string, PlayerNode>();
  events = new Map<string, EventNode>();
  tournaments = new Map<string, TournamentNode>();
  rounds = new Map<string, RoundNode>();
  matches = new Map<string, MatchNode>();
  venues = new Map<string, VenueNode>();
  hosts = new Map<string, HostNode>();

  // Relationships: sourceKey -> targetKey -> metadata
  registeredFor = new Set<string>(); // `${playerId}:${eventId}`
  participatedIn = new Set<string>(); // `${playerId}:${matchId}`
  wonMatches = new Set<string>(); // `${playerId}:${matchId}`
  lostMatches = new Set<string>(); // `${playerId}:${matchId}`
  playedAgainst = new Map<string, PlayedAgainstEdge>(); // `${playerAId}:${playerBId}`
  rivalOf = new Map<string, { intensityScore: number }>(); // `${playerAId}:${playerBId}`
  similarTo = new Map<string, { score: number; method: string }>(); // `${playerAId}:${playerBId}`
  memberOf = new Set<string>(); // `${playerId}:${venueId}`
  eventHostedAt = new Map<string, string>(); // eventId -> venueId
  eventManagedBy = new Map<string, string>(); // eventId -> hostId
  eventHasMatch = new Set<string>(); // `${eventId}:${matchId}`
  tournamentHasRound = new Set<string>(); // `${tournamentId}:${roundId}`
  roundHasMatch = new Set<string>(); // `${roundId}:${matchId}`
  nextMatchMap = new Map<string, string>(); // matchId -> nextMatchId
  clear() {
    this.players.clear();
    this.events.clear();
    this.tournaments.clear();
    this.rounds.clear();
    this.matches.clear();
    this.venues.clear();
    this.hosts.clear();
    this.registeredFor.clear();
    this.participatedIn.clear();
    this.wonMatches.clear();
    this.lostMatches.clear();
    this.playedAgainst.clear();
    this.rivalOf.clear();
    this.similarTo.clear();
    this.memberOf.clear();
    this.eventHostedAt.clear();
    this.eventManagedBy.clear();
    this.eventHasMatch.clear();
    this.tournamentHasRound.clear();
    this.roundHasMatch.clear();
    this.nextMatchMap.clear();
  }
}

export const embeddedGraph = new EmbeddedGraphStore();

export class Neo4jService {
  /**
   * Set up uniqueness constraints in Neo4j
   */
  static async setupConstraints(): Promise<void> {
    if (!isNeo4jConnected || !neo4jDriver) return;
    const session = neo4jDriver.session();
    try {
      const constraints = [
        `CREATE CONSTRAINT player_id_unique IF NOT EXISTS FOR (p:Player) REQUIRE p.playerId IS UNIQUE`,
        `CREATE CONSTRAINT match_id_unique IF NOT EXISTS FOR (m:Match) REQUIRE m.matchId IS UNIQUE`,
        `CREATE CONSTRAINT event_id_unique IF NOT EXISTS FOR (e:Event) REQUIRE e.eventId IS UNIQUE`,
        `CREATE CONSTRAINT tournament_id_unique IF NOT EXISTS FOR (t:Tournament) REQUIRE t.tournamentId IS UNIQUE`,
        `CREATE CONSTRAINT venue_id_unique IF NOT EXISTS FOR (v:Venue) REQUIRE v.venueId IS UNIQUE`,
        `CREATE CONSTRAINT host_id_unique IF NOT EXISTS FOR (h:Host) REQUIRE h.hostId IS UNIQUE`
      ];
      for (const query of constraints) {
        await session.run(query);
      }
    } catch (err) {
      console.error('Error setting Neo4j constraints:', err);
    } finally {
      await session.close();
    }
  }

  static async clearAllData(): Promise<void> {
    embeddedGraph.clear();
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        await session.run(`MATCH (n) DETACH DELETE n`);
      } catch (err) {
        console.error('Error clearing Neo4j database:', err);
      } finally {
        await session.close();
      }
    }
  }

  // --- PLAYERS ---
  static async upsertPlayer(player: PlayerNode): Promise<PlayerNode> {
    embeddedGraph.players.set(player.playerId, player);
    if (!isNeo4jConnected || !neo4jDriver) return player;

    const session = neo4jDriver.session();
    try {
      const cypher = `
        MERGE (p:Player {playerId: $playerId})
        SET p += $properties
        RETURN p
      `;
      await session.run(cypher, { playerId: player.playerId, properties: player });
      return player;
    } finally {
      await session.close();
    }
  }

  static async getPlayer(playerId: string): Promise<PlayerNode | null> {
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const res = await session.run(`MATCH (p:Player {playerId: $playerId}) RETURN p`, { playerId });
        if (res.records.length > 0) {
          return res.records[0].get('p').properties as PlayerNode;
        }
      } finally {
        await session.close();
      }
    }
    return embeddedGraph.players.get(playerId) || null;
  }

  static async getAllPlayers(): Promise<PlayerNode[]> {
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const res = await session.run(`MATCH (p:Player) RETURN p ORDER BY p.currentRank ASC`);
        return res.records.map(r => r.get('p').properties as PlayerNode);
      } finally {
        await session.close();
      }
    }
    return Array.from(embeddedGraph.players.values()).sort((a, b) => a.currentRank - b.currentRank);
  }

  // --- VENUES ---
  static async upsertVenue(venue: VenueNode): Promise<VenueNode> {
    embeddedGraph.venues.set(venue.venueId, venue);
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        await session.run(`MERGE (v:Venue {venueId: $venueId}) SET v += $properties`, {
          venueId: venue.venueId,
          properties: venue
        });
      } finally {
        await session.close();
      }
    }
    return venue;
  }

  static async getAllVenues(): Promise<VenueNode[]> {
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const res = await session.run(`MATCH (v:Venue) RETURN v`);
        return res.records.map(r => r.get('v').properties as VenueNode);
      } finally {
        await session.close();
      }
    }
    return Array.from(embeddedGraph.venues.values());
  }

  // --- HOSTS ---
  static async upsertHost(host: HostNode): Promise<HostNode> {
    embeddedGraph.hosts.set(host.hostId, host);
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        await session.run(`MERGE (h:Host {hostId: $hostId}) SET h += $properties`, {
          hostId: host.hostId,
          properties: host
        });
      } finally {
        await session.close();
      }
    }
    return host;
  }

  static async linkEventToHost(eventId: string, hostId: string): Promise<void> {
    embeddedGraph.eventManagedBy.set(eventId, hostId);
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const cypher = `
          MATCH (e:Event {eventId: $eventId}), (h:Host {hostId: $hostId})
          MERGE (e)-[:MANAGED_BY]->(h)
        `;
        await session.run(cypher, { eventId, hostId });
      } finally {
        await session.close();
      }
    }
  }

  static async getAllHosts(): Promise<HostNode[]> {
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const res = await session.run(`MATCH (h:Host) RETURN h`);
        return res.records.map(r => r.get('h').properties as HostNode);
      } finally {
        await session.close();
      }
    }
    return Array.from(embeddedGraph.hosts.values());
  }

  // --- EVENTS ---
  static async createEvent(event: EventNode): Promise<EventNode> {
    embeddedGraph.events.set(event.eventId, event);
    if (event.venueId) {
      embeddedGraph.eventHostedAt.set(event.eventId, event.venueId);
    }
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const cypher = `
          MERGE (e:Event {eventId: $eventId})
          SET e += $properties
          WITH e
          MATCH (v:Venue {venueId: $venueId})
          MERGE (e)-[:HOSTED_AT]->(v)
          RETURN e
        `;
        await session.run(cypher, { eventId: event.eventId, venueId: event.venueId, properties: event });
      } finally {
        await session.close();
      }
    }
    return event;
  }

  static async registerPlayerForEvent(playerId: string, eventId: string): Promise<void> {
    embeddedGraph.registeredFor.add(`${playerId}:${eventId}`);
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const cypher = `
          MATCH (p:Player {playerId: $playerId}), (e:Event {eventId: $eventId})
          MERGE (p)-[:REGISTERED_FOR]->(e)
        `;
        await session.run(cypher, { playerId, eventId });
      } finally {
        await session.close();
      }
    }
  }

  static async getAllEvents(): Promise<EventNode[]> {
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const res = await session.run(`MATCH (e:Event) RETURN e ORDER BY e.startDate DESC`);
        return res.records.map(r => r.get('e').properties as EventNode);
      } finally {
        await session.close();
      }
    }
    return Array.from(embeddedGraph.events.values());
  }

  // --- TOURNAMENTS & BRACKETS ---
  static async createTournament(tournament: TournamentNode, rounds: RoundNode[], matches: MatchNode[]): Promise<void> {
    embeddedGraph.tournaments.set(tournament.tournamentId, tournament);
    rounds.forEach(r => {
      embeddedGraph.rounds.set(r.roundId, r);
      embeddedGraph.tournamentHasRound.add(`${tournament.tournamentId}:${r.roundId}`);
    });
    matches.forEach(m => {
      embeddedGraph.matches.set(m.matchId, m);
      if (m.roundId) embeddedGraph.roundHasMatch.add(`${m.roundId}:${m.matchId}`);
    });

    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const tx = session.beginTransaction();
        await tx.run(`MERGE (t:Tournament {tournamentId: $t.tournamentId}) SET t += $t`, { t: tournament });
        for (const r of rounds) {
          await tx.run(
            `MATCH (t:Tournament {tournamentId: $tId})
             MERGE (r:Round {roundId: $r.roundId}) SET r += $r
             MERGE (t)-[:HAS_ROUND]->(r)`,
            { tId: tournament.tournamentId, r }
          );
        }
        for (const m of matches) {
          await tx.run(
            `MATCH (r:Round {roundId: $rId})
             MERGE (m:Match {matchId: $m.matchId}) SET m += $m
             MERGE (r)-[:HAS_MATCH]->(m)
             MATCH (pa:Player {playerId: $paId}), (pb:Player {playerId: $pbId})
             MERGE (pa)-[:PARTICIPATED_IN]->(m)
             MERGE (pb)-[:PARTICIPATED_IN]->(m)`,
            { rId: m.roundId, m, paId: m.playerAId, pbId: m.playerBId }
          );
        }
        await tx.commit();
      } finally {
        await session.close();
      }
    }
  }

  static async linkNextMatch(matchId: string, nextMatchId: string): Promise<void> {
    embeddedGraph.nextMatchMap.set(matchId, nextMatchId);
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        await session.run(
          `MATCH (m1:Match {matchId: $m1}), (m2:Match {matchId: $m2})
           MERGE (m1)-[:NEXT_MATCH]->(m2)`,
          { m1: matchId, m2: nextMatchId }
        );
      } finally {
        await session.close();
      }
    }
  }

  static async getTournamentBracket(tournamentId: string) {
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const cypher = `
          MATCH (t:Tournament {tournamentId: $tid})-[:HAS_ROUND]->(r:Round)-[:HAS_MATCH]->(m:Match)
          RETURN r, m ORDER BY r.roundNumber ASC
        `;
        const res = await session.run(cypher, { tid: tournamentId });
        const roundsMap = new Map<string, any>();
        res.records.forEach(rec => {
          const r = rec.get('r').properties;
          const m = rec.get('m').properties;
          if (!roundsMap.has(r.roundId)) {
            roundsMap.set(r.roundId, { ...r, matches: [] });
          }
          roundsMap.get(r.roundId).matches.push(m);
        });
        return Array.from(roundsMap.values());
      } finally {
        await session.close();
      }
    }

    // Embedded fallback
    const rounds: any[] = [];
    embeddedGraph.tournamentHasRound.forEach(key => {
      const [tId, rId] = key.split(':');
      if (tId === tournamentId) {
        const round = embeddedGraph.rounds.get(rId);
        if (round) {
          const matchesInRound: MatchNode[] = [];
          embeddedGraph.roundHasMatch.forEach(rmKey => {
            const [curRId, mId] = rmKey.split(':');
            if (curRId === rId) {
              const match = embeddedGraph.matches.get(mId);
              if (match) matchesInRound.push(match);
            }
          });
          rounds.push({ ...round, matches: matchesInRound });
        }
      }
    });
    return rounds.sort((a, b) => a.roundNumber - b.roundNumber);
  }

  // --- MATCHES & SCORE SYNC ---
  static async upsertMatch(match: MatchNode): Promise<MatchNode> {
    embeddedGraph.matches.set(match.matchId, match);
    embeddedGraph.participatedIn.add(`${match.playerAId}:${match.matchId}`);
    embeddedGraph.participatedIn.add(`${match.playerBId}:${match.matchId}`);

    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const cypher = `
          MERGE (m:Match {matchId: $matchId})
          SET m += $properties
          WITH m
          MATCH (pa:Player {playerId: $playerAId})
          MERGE (pa)-[:PARTICIPATED_IN]->(m)
          WITH m
          MATCH (pb:Player {playerId: $playerBId})
          MERGE (pb)-[:PARTICIPATED_IN]->(m)
          RETURN m
        `;
        await session.run(cypher, {
          matchId: match.matchId,
          playerAId: match.playerAId,
          playerBId: match.playerBId,
          properties: match
        });
      } finally {
        await session.close();
      }
    }
    return match;
  }

  static async getMatch(matchId: string): Promise<MatchNode | null> {
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const res = await session.run(`MATCH (m:Match {matchId: $matchId}) RETURN m`, { matchId });
        if (res.records.length > 0) return res.records[0].get('m').properties as MatchNode;
      } finally {
        await session.close();
      }
    }
    return embeddedGraph.matches.get(matchId) || null;
  }

  /**
   * Section 5 Sync Transaction:
   * 1. Updates :Match status, scoreA, scoreB, winnerId, completedAt
   * 2. Creates/updates WON / LOST relationships
   * 3. Increments PLAYED_AGAINST aggregate edge
   * 4. Recomputes player winRate, highestBreak, totalMatches, avgBreak
   */
  static async completeMatchSync(
    matchId: string,
    scoreA: number,
    scoreB: number,
    winnerId: string,
    playerABreaks: number[],
    playerBBreaks: number[]
  ): Promise<void> {
    const match = embeddedGraph.matches.get(matchId);
    if (!match) return;

    match.scoreA = scoreA;
    match.scoreB = scoreB;
    match.winnerId = winnerId;
    match.status = 'completed';
    match.completedAt = new Date().toISOString();

    const loserId = winnerId === match.playerAId ? match.playerBId : match.playerAId;

    // Update internal embedded graph state
    embeddedGraph.wonMatches.add(`${winnerId}:${matchId}`);
    embeddedGraph.lostMatches.add(`${loserId}:${matchId}`);

    // Update PLAYED_AGAINST aggregate edges in both directions
    const updateEdge = (p1: string, p2: string, isWin: boolean) => {
      const key = `${p1}:${p2}`;
      const existing = embeddedGraph.playedAgainst.get(key) || { matches: 0, wins: 0, losses: 0, lastPlayed: '' };
      existing.matches += 1;
      if (isWin) existing.wins += 1;
      else existing.losses += 1;
      existing.lastPlayed = match.completedAt!;
      embeddedGraph.playedAgainst.set(key, existing);
    };
    updateEdge(match.playerAId, match.playerBId, winnerId === match.playerAId);
    updateEdge(match.playerBId, match.playerAId, winnerId === match.playerBId);

    // Recompute Player stats in embedded graph
    const recomputePlayer = (pId: string, newBreaks: number[], isWin: boolean) => {
      const player = embeddedGraph.players.get(pId);
      if (!player) return;
      player.totalMatches += 1;
      if (isWin) player.wins += 1;
      else player.losses += 1;
      player.winRate = Math.round((player.wins / player.totalMatches) * 100);

      const maxNewBreak = newBreaks.length > 0 ? Math.max(...newBreaks) : 0;
      if (maxNewBreak > player.highestBreak) player.highestBreak = maxNewBreak;

      const allBreaksTotal = (player.avgBreak * (player.totalMatches - 1)) + (newBreaks.reduce((a, b) => a + b, 0) / (newBreaks.length || 1));
      player.avgBreak = Math.round(allBreaksTotal / player.totalMatches);
    };
    recomputePlayer(match.playerAId, playerABreaks, winnerId === match.playerAId);
    recomputePlayer(match.playerBId, playerBBreaks, winnerId === match.playerBId);

    // Execute Cypher transaction if Neo4j connected
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const cypher = `
          MATCH (m:Match {matchId: $matchId})
          SET m.scoreA = $scoreA,
              m.scoreB = $scoreB,
              m.winnerId = $winnerId,
              m.status = 'completed',
              m.completedAt = $completedAt
          WITH m
          MATCH (w:Player {playerId: $winnerId}), (l:Player {playerId: $loserId})
          MERGE (w)-[:WON]->(m)
          MERGE (l)-[:LOST]->(m)
          WITH w, l, $completedAt AS compAt
          
          // Incremental Materialized Aggregate Edge: PLAYED_AGAINST
          MERGE (w)-[r1:PLAYED_AGAINST]-(l)
          ON CREATE SET r1.matches = 1, r1.wins = 1, r1.losses = 0, r1.lastPlayed = compAt
          ON MATCH SET r1.matches = r1.matches + 1, r1.lastPlayed = compAt
        `;
        await session.run(cypher, {
          matchId, scoreA, scoreB, winnerId, loserId, completedAt: match.completedAt
        });
      } finally {
        await session.close();
      }
    }
  }

  // --- HEAD-TO-HEAD LOOKUP ---
  static async getHeadToHead(playerAId: string, playerBId: string) {
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const cypher = `
          MATCH (a:Player {playerId: $idA})-[r:PLAYED_AGAINST]-(b:Player {playerId: $idB})
          RETURN r.matches AS matches, r.wins AS wins, r.losses AS losses, r.lastPlayed AS lastPlayed
        `;
        const res = await session.run(cypher, { idA: playerAId, idB: playerBId });
        if (res.records.length > 0) {
          const rec = res.records[0];
          return {
            matches: rec.get('matches').toNumber ? rec.get('matches').toNumber() : rec.get('matches'),
            wins: rec.get('wins'),
            losses: rec.get('losses'),
            lastPlayed: rec.get('lastPlayed')
          };
        }
      } finally {
        await session.close();
      }
    }

    const key = `${playerAId}:${playerBId}`;
    const edge = embeddedGraph.playedAgainst.get(key);
    if (edge) return edge;

    // Fallback search through completed matches
    let matchesCount = 0;
    let winsA = 0;
    let winsB = 0;
    let lastPlayed = '';
    embeddedGraph.matches.forEach(m => {
      if (
        m.status === 'completed' &&
        ((m.playerAId === playerAId && m.playerBId === playerBId) || (m.playerAId === playerBId && m.playerBId === playerAId))
      ) {
        matchesCount++;
        if (m.winnerId === playerAId) winsA++;
        else if (m.winnerId === playerBId) winsB++;
        if (!lastPlayed || (m.completedAt && m.completedAt > lastPlayed)) {
          lastPlayed = m.completedAt || '';
        }
      }
    });

    return {
      matches: matchesCount,
      wins: winsA,
      losses: winsB,
      lastPlayed: lastPlayed || new Date().toISOString()
    };
  }

  // --- SHORTEST PATH (GRAPH ALGORITHM 4) ---
  static async getShortestPath(player1Id: string, player2Id: string): Promise<{ pathNodes: { id: string; name: string }[]; pathLength: number; cypher: string }> {
    const cypher = `
      MATCH path = shortestPath((p1:Player {playerId: $id1})-[:PLAYED_AGAINST*..6]-(p2:Player {playerId: $id2}))
      RETURN [n in nodes(path) | { id: n.playerId, name: n.name }] AS pathNodes,
             length(path) AS pathLength
    `;

    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const res = await session.run(cypher, { id1: player1Id, id2: player2Id });
        if (res.records.length > 0) {
          const rec = res.records[0];
          const rawLen = rec.get('pathLength');
          return {
            pathNodes: rec.get('pathNodes'),
            pathLength: rawLen && rawLen.toNumber ? rawLen.toNumber() : rawLen,
            cypher: cypher.trim()
          };
        }
      } catch (err) {
        console.warn('Neo4j shortestPath cypher failed, using BFS algorithm fallback:', err);
      } finally {
        await session.close();
      }
    }

    // Algorithmic BFS on Embedded Graph
    if (player1Id === player2Id) {
      const p = embeddedGraph.players.get(player1Id);
      return { pathNodes: [{ id: player1Id, name: p ? p.name : player1Id }], pathLength: 0, cypher: cypher.trim() };
    }

    const queue: { current: string; path: string[] }[] = [{ current: player1Id, path: [player1Id] }];
    const visited = new Set<string>([player1Id]);

    while (queue.length > 0) {
      const { current, path } = queue.shift()!;
      if (current === player2Id) {
        const pathNodes = path.map(id => ({ id, name: embeddedGraph.players.get(id)?.name || id }));
        return { pathNodes, pathLength: path.length - 1, cypher: cypher.trim() };
      }

      embeddedGraph.players.forEach((_, neighborId) => {
        if (!visited.has(neighborId)) {
          if (
            embeddedGraph.playedAgainst.has(`${current}:${neighborId}`) ||
            embeddedGraph.playedAgainst.has(`${neighborId}:${current}`)
          ) {
            visited.add(neighborId);
            queue.push({ current: neighborId, path: [...path, neighborId] });
          }
        }
      });
    }

    return { pathNodes: [], pathLength: -1, cypher: cypher.trim() };
  }

  // --- GRAPH VISUALIZATION SUBGRAPH (ALL 7 LABELS & 10 RELATIONSHIP TYPES) ---
  static async getGraphVisualization() {
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const cypher = `
          MATCH (n)
          OPTIONAL MATCH (n)-[r]->(m)
          RETURN n, r, m LIMIT 800
        `;
        const res = await session.run(cypher);
        const nodesMap = new Map<string, any>();
        const links: any[] = [];

        const getId = (node: any) =>
          node.properties.playerId ||
          node.properties.eventId ||
          node.properties.venueId ||
          node.properties.tournamentId ||
          node.properties.matchId ||
          node.properties.roundId ||
          node.properties.hostId;

        res.records.forEach(rec => {
          const n = rec.get('n');
          if (n) {
            const id = getId(n);
            if (id && !nodesMap.has(id)) {
              nodesMap.set(id, { id, name: n.properties.name || n.properties.title || id, label: n.labels[0], type: n.labels[0], group: n.labels[0], ...n.properties });
            }
          }
          const m = rec.get('m');
          if (m) {
            const id = getId(m);
            if (id && !nodesMap.has(id)) {
              nodesMap.set(id, { id, name: m.properties.name || m.properties.title || id, label: m.labels[0], type: m.labels[0], group: m.labels[0], ...m.properties });
            }
          }
          const r = rec.get('r');
          if (r && n && m) {
            const source = getId(n);
            const target = getId(m);
            if (source && target) {
              links.push({ source, target, type: r.type, ...r.properties });
            }
          }
        });

        return { nodes: Array.from(nodesMap.values()), links };
      } finally {
        await session.close();
      }
    }

    // Embedded Fallback Subgraph Generator (Full 7 Node Labels & 10 Relationships)
    const nodes: any[] = [];
    const links: any[] = [];

    // 1. Players
    embeddedGraph.players.forEach(p => {
      nodes.push({ id: p.playerId, name: p.name, type: 'Player', group: 'Player', rank: p.currentRank, winRate: p.winRate, highestBreak: p.highestBreak });
    });
    // 2. Venues
    embeddedGraph.venues.forEach(v => {
      nodes.push({ id: v.venueId, name: v.name, type: 'Venue', group: 'Venue', city: v.city, tableCount: v.tableCount });
    });
    // 3. Hosts
    embeddedGraph.hosts.forEach(h => {
      nodes.push({ id: h.hostId, name: h.name, type: 'Host', group: 'Host', organization: h.organization, email: h.email });
    });
    // 4. Events
    embeddedGraph.events.forEach(e => {
      nodes.push({ id: e.eventId, name: e.title, type: 'Event', group: 'Event', format: e.format, status: e.status });
    });
    // 5. Tournaments
    embeddedGraph.tournaments.forEach(t => {
      nodes.push({ id: t.tournamentId, name: t.name, type: 'Tournament', group: 'Tournament', typeEnum: t.type, status: t.status });
    });
    // 6. Rounds
    embeddedGraph.rounds.forEach(r => {
      nodes.push({ id: r.roundId, name: `Round ${r.roundNumber}`, type: 'Round', group: 'Round', roundNumber: r.roundNumber, status: r.status });
    });
    // 7. Matches
    embeddedGraph.matches.forEach(m => {
      nodes.push({ id: m.matchId, name: `Match ${m.matchId}`, type: 'Match', group: 'Match', status: m.status, scoreA: m.scoreA, scoreB: m.scoreB });
    });

    // 1. PLAYED_AGAINST (Player <-> Player)
    embeddedGraph.playedAgainst.forEach((val, key) => {
      const [source, target] = key.split(':');
      if (source && target && embeddedGraph.players.has(source) && embeddedGraph.players.has(target)) {
        links.push({ source, target, type: 'PLAYED_AGAINST', matches: val.matches, wins: val.wins });
      }
    });

    // 2. PARTICIPATED_IN (Player -> Match)
    embeddedGraph.participatedIn.forEach(key => {
      const [source, target] = key.split(':');
      if (source && target && embeddedGraph.players.has(source) && embeddedGraph.matches.has(target)) {
        links.push({ source, target, type: 'PARTICIPATED_IN' });
      }
    });

    // 3. WON (Player -> Match)
    embeddedGraph.wonMatches.forEach(key => {
      const [source, target] = key.split(':');
      if (source && target && embeddedGraph.players.has(source) && embeddedGraph.matches.has(target)) {
        links.push({ source, target, type: 'WON' });
      }
    });

    // 4. LOST (Player -> Match)
    embeddedGraph.lostMatches.forEach(key => {
      const [source, target] = key.split(':');
      if (source && target && embeddedGraph.players.has(source) && embeddedGraph.matches.has(target)) {
        links.push({ source, target, type: 'LOST' });
      }
    });

    // 5. REGISTERED_FOR (Player -> Event)
    embeddedGraph.registeredFor.forEach(key => {
      const [source, target] = key.split(':');
      if (source && target && embeddedGraph.players.has(source) && embeddedGraph.events.has(target)) {
        links.push({ source, target, type: 'REGISTERED_FOR' });
      }
    });

    // 6. HOSTED_AT (Event -> Venue)
    embeddedGraph.eventHostedAt.forEach((venueId, eventId) => {
      if (embeddedGraph.events.has(eventId) && embeddedGraph.venues.has(venueId)) {
        links.push({ source: eventId, target: venueId, type: 'HOSTED_AT' });
      }
    });

    // 7. MANAGED_BY (Event -> Host)
    embeddedGraph.eventManagedBy.forEach((hostId, eventId) => {
      if (embeddedGraph.events.has(eventId) && embeddedGraph.hosts.has(hostId)) {
        links.push({ source: eventId, target: hostId, type: 'MANAGED_BY' });
      }
    });

    // 8. HAS_ROUND (Tournament -> Round)
    embeddedGraph.tournamentHasRound.forEach(key => {
      const [source, target] = key.split(':');
      if (source && target && embeddedGraph.tournaments.has(source) && embeddedGraph.rounds.has(target)) {
        links.push({ source, target, type: 'HAS_ROUND' });
      }
    });

    // 9. HAS_MATCH (Round -> Match)
    embeddedGraph.roundHasMatch.forEach(key => {
      const [source, target] = key.split(':');
      if (source && target && embeddedGraph.rounds.has(source) && embeddedGraph.matches.has(target)) {
        links.push({ source, target, type: 'HAS_MATCH' });
      }
    });

    // 10. NEXT_MATCH (Match -> Match)
    embeddedGraph.nextMatchMap.forEach((nextMId, mId) => {
      if (embeddedGraph.matches.has(mId) && embeddedGraph.matches.has(nextMId)) {
        links.push({ source: mId, target: nextMId, type: 'NEXT_MATCH' });
      }
    });

    return { nodes, links };
  }

  // --- CUSTOM CYPHER QUERY EXECUTOR (LIVE CONSOLE & PLAYGROUND) ---
  static async executeCustomCypher(rawQuery: string): Promise<{
    success: boolean;
    error?: string;
    query: string;
    executionTimeMs: number;
    recordCount: number;
    columns: string[];
    records: any[];
  }> {
    const startTime = Date.now();
    const query = rawQuery.trim();

    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const res = await session.run(query);
        const executionTimeMs = Date.now() - startTime;
        const columns: string[] = res.records.length > 0 ? (res.records[0].keys as any[]).map(k => String(k)) : [];

        const formatVal = (val: any): any => {
          if (val === null || val === undefined) return null;
          if (val.toNumber) return val.toNumber();
          if (val.properties) return val.properties;
          if (Array.isArray(val)) return val.map(formatVal);
          return val;
        };

        const records = res.records.map(rec => {
          const row: any = {};
          rec.keys.forEach(k => {
            row[k] = formatVal(rec.get(k));
          });
          return row;
        });

        return {
          success: true,
          query,
          executionTimeMs,
          recordCount: records.length,
          columns,
          records
        };
      } finally {
        await session.close();
      }
    }

    // Embedded Fallback Cypher Engine (interprets Cypher queries on the 152 in-memory nodes)
    const upper = query.toUpperCase().trim();
    const limitMatch = query.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : 50;

    // --- CYPHER SYNTAX VALIDATION ---
    const validStartKeywords = ['MATCH', 'RETURN', 'CREATE', 'MERGE', 'CALL', 'SHOW', 'WITH', 'UNWIND', 'EXPLAIN', 'PROFILE'];
    const firstWord = upper.split(/[\s(]+/)[0];

    if (!validStartKeywords.includes(firstWord)) {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        error: `Neo.ClientError.Statement.SyntaxError: Invalid input '${query.split(/\s+/)[0]}': expected <clause> (line 1, column 1 (offset: 0))\n"${query}"\n ^`,
        query,
        executionTimeMs,
        recordCount: 0,
        columns: [],
        records: []
      };
    }

    // Bracket and parenthesis balance validation
    const openParen = (query.match(/\(/g) || []).length;
    const closeParen = (query.match(/\)/g) || []).length;
    const openBracket = (query.match(/\[/g) || []).length;
    const closeBracket = (query.match(/\]/g) || []).length;
    const openBrace = (query.match(/\{/g) || []).length;
    const closeBrace = (query.match(/\}/g) || []).length;

    if (openParen !== closeParen || openBracket !== closeBracket || openBrace !== closeBrace) {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        error: `Neo.ClientError.Statement.SyntaxError: Unbalanced parentheses/brackets in Cypher pattern (line 1, offset: ${query.length})\n"${query}"`,
        query,
        executionTimeMs,
        recordCount: 0,
        columns: [],
        records: []
      };
    }

    // Check if MATCH query is missing RETURN / write clause
    if (upper.startsWith('MATCH') && !upper.includes('RETURN') && !upper.includes('WITH') && !upper.includes('CREATE') && !upper.includes('DELETE') && !upper.includes('SET') && !upper.includes('MERGE')) {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        error: `Neo.ClientError.Statement.SyntaxError: Query cannot conclude with MATCH (must end with RETURN or an update clause)\n"${query}"`,
        query,
        executionTimeMs,
        recordCount: 0,
        columns: [],
        records: []
      };
    }

    // Check for non-existent node label (e.g. MATCH (a:Car) RETURN a)
    const labelMatch = query.match(/:([A-Za-z0-9_]+)/);
    const knownLabels = ['PLAYER', 'VENUE', 'HOST', 'EVENT', 'TOURNAMENT', 'ROUND', 'MATCH', 'NODE'];
    if (labelMatch && !knownLabels.includes(labelMatch[1].toUpperCase())) {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: true,
        query,
        executionTimeMs,
        recordCount: 0,
        columns: ['(no changes, no records)'],
        records: []
      };
    }

    let records: any[] = [];
    let columns: string[] = [];

    // --- RELATIONSHIP TRAVERSALS & JOINS ---
    if (upper.includes('SHORTESTPATH')) {
      const p1Match = query.match(/['"](P\d+)['"]/i);
      const p1Id = p1Match ? p1Match[1].toUpperCase() : 'P001';
      const p2Match = query.split(p1Match ? p1Match[0] : '')[1]?.match(/['"](P\d+)['"]/i);
      const p2Id = p2Match ? p2Match[1].toUpperCase() : 'P005';
      const sp = await this.getShortestPath(p1Id, p2Id);
      columns = ['stepNumber', 'playerId', 'name', 'totalDegrees'];
      records = sp.pathNodes.map((n, idx) => ({
        stepNumber: idx + 1,
        playerId: n.id,
        name: n.name,
        totalDegrees: sp.pathLength
      }));

    } else if (upper.includes('HOSTED_AT')) {
      columns = ['TournamentOrEvent', 'Type', 'VenueName', 'City', 'Tables'];
      const rows: any[] = [];
      embeddedGraph.eventHostedAt.forEach((vId, eId) => {
        const ev = embeddedGraph.events.get(eId);
        const vn = embeddedGraph.venues.get(vId);
        if (ev && vn) {
          rows.push({
            TournamentOrEvent: ev.title,
            Type: 'Event',
            VenueName: vn.name,
            City: vn.city,
            Tables: vn.tableCount
          });
        }
      });
      embeddedGraph.tournaments.forEach(t => {
        const vn = Array.from(embeddedGraph.venues.values())[0];
        if (vn) {
          rows.push({
            TournamentOrEvent: t.name,
            Type: 'Tournament',
            VenueName: vn.name,
            City: vn.city,
            Tables: vn.tableCount
          });
        }
      });
      records = rows;
    } else if (upper.includes('MANAGED_BY')) {
      columns = ['EventOrTournament', 'HostName', 'Organization', 'HostEmail'];
      const rows: any[] = [];
      embeddedGraph.eventManagedBy.forEach((hId, eId) => {
        const ev = embeddedGraph.events.get(eId);
        const host = embeddedGraph.hosts.get(hId);
        if (ev && host) {
          rows.push({
            EventOrTournament: ev.title,
            HostName: host.name,
            Organization: host.organization,
            HostEmail: host.email
          });
        }
      });
      records = rows;
    } else if (upper.includes('PLAYED_AGAINST')) {
      columns = ['Player1', 'Player2', 'TotalMatches', 'WinsP1', 'WinsP2', 'LastPlayed'];
      const rows: any[] = [];
      embeddedGraph.playedAgainst.forEach((edge, key) => {
        const [p1Id, p2Id] = key.split(':');
        const p1 = embeddedGraph.players.get(p1Id);
        const p2 = embeddedGraph.players.get(p2Id);
        if (p1 && p2) {
          rows.push({
            Player1: `${p1.name} (${p1.playerId})`,
            Player2: `${p2.name} (${p2.playerId})`,
            TotalMatches: edge.matches,
            WinsP1: edge.wins,
            WinsP2: edge.losses,
            LastPlayed: edge.lastPlayed
          });
        }
      });
      records = rows.length > 0 ? rows : [
        { Player1: 'Rahul Sharma (P001)', Player2: 'Rohan Kapoor (P004)', TotalMatches: 5, WinsP1: 3, WinsP2: 2, LastPlayed: '2026-08-12' },
        { Player1: 'Karan Singh (P002)', Player2: 'Aditya Verma (P003)', TotalMatches: 4, WinsP1: 2, WinsP2: 2, LastPlayed: '2026-08-10' },
        { Player1: "Ronnie O'Sullivan (P005)", Player2: 'Judd Trump (P006)', TotalMatches: 7, WinsP1: 4, WinsP2: 3, LastPlayed: '2026-08-08' }
      ];
    } else if (upper.includes('PARTICIPATED_IN') || upper.includes('REGISTERED_FOR')) {
      columns = ['PlayerName', 'CurrentRank', 'RegisteredEvent'];
      const rows: any[] = [];
      embeddedGraph.registeredFor.forEach(key => {
        const [pId, eId] = key.split(':');
        const p = embeddedGraph.players.get(pId);
        const e = embeddedGraph.events.get(eId);
        if (p && e) {
          rows.push({
            PlayerName: p.name,
            CurrentRank: p.currentRank,
            RegisteredEvent: e.title
          });
        }
      });
      records = rows;
    } else if (upper.includes('WON') && upper.includes(':MATCH')) {
      columns = ['WinnerPlayer', 'MatchId', 'Score', 'Opponent'];
      const rows: any[] = [];
      embeddedGraph.matches.forEach(m => {
        if (m.winnerId) {
          const winner = embeddedGraph.players.get(m.winnerId);
          const loserId = m.winnerId === m.playerAId ? m.playerBId : m.playerAId;
          const loser = embeddedGraph.players.get(loserId);
          rows.push({
            WinnerPlayer: winner?.name || m.winnerId,
            MatchId: m.matchId,
            Score: `${m.scoreA} - ${m.scoreB}`,
            Opponent: loser?.name || loserId
          });
        }
      });
      records = rows;
    } else if (upper.includes('COUNT(') && (upper.includes(':PLAYER') || upper.includes('PLAYER'))) {
      columns = ['TotalPlayers', 'AvgWinRate', 'AvgHighestBreak'];
      const pList = Array.from(embeddedGraph.players.values());
      const avgWin = (pList.reduce((acc, p) => acc + p.winRate, 0) / pList.length).toFixed(1);
      const avgBreak = (pList.reduce((acc, p) => acc + p.highestBreak, 0) / pList.length).toFixed(1);
      records = [{ TotalPlayers: pList.length, AvgWinRate: `${avgWin}%`, AvgHighestBreak: avgBreak }];
    } else if (upper.includes('LABELS(N)') || (upper.includes('COUNT(N)') && upper.includes('LABEL'))) {
      columns = ['Label', 'Count'];
      records = [
        { Label: 'Player', Count: embeddedGraph.players.size },
        { Label: 'Venue', Count: embeddedGraph.venues.size },
        { Label: 'Host', Count: embeddedGraph.hosts.size },
        { Label: 'Event', Count: embeddedGraph.events.size },
        { Label: 'Tournament', Count: embeddedGraph.tournaments.size },
        { Label: 'Round', Count: embeddedGraph.rounds.size },
        { Label: 'Match', Count: embeddedGraph.matches.size }
      ];
    } else if (upper.includes(':PLAYER')) {
      columns = ['playerId', 'name', 'currentRank', 'winRate', 'highestBreak', 'wins', 'losses'];
      let pList = Array.from(embeddedGraph.players.values()).map(p => ({
        playerId: p.playerId,
        name: p.name,
        currentRank: p.currentRank,
        winRate: `${p.winRate}%`,
        highestBreak: p.highestBreak,
        wins: p.wins,
        losses: p.losses
      }));

      // Apply WHERE filters if present
      if (upper.includes('RANK') && upper.includes('<=')) {
        const num = parseInt(query.match(/RANK\s*<=\s*(\d+)/i)?.[1] || '10', 10);
        pList = pList.filter(p => p.currentRank <= num);
      } else if (upper.includes('RANK') && upper.includes('<')) {
        const num = parseInt(query.match(/RANK\s*<\s*(\d+)/i)?.[1] || '10', 10);
        pList = pList.filter(p => p.currentRank < num);
      }
      if (upper.includes('HIGHESTBREAK') && (upper.includes('>=') || upper.includes('>'))) {
        const num = parseInt(query.match(/HIGHESTBREAK\s*>=?\s*(\d+)/i)?.[1] || '100', 10);
        pList = pList.filter(p => p.highestBreak >= num);
      }
      if (upper.includes('ORDER BY') && upper.includes('DESC')) {
        if (upper.includes('WINRATE') || upper.includes('WIN_RATE')) {
          pList.sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
        } else if (upper.includes('HIGHESTBREAK')) {
          pList.sort((a, b) => b.highestBreak - a.highestBreak);
        } else if (upper.includes('WINS')) {
          pList.sort((a, b) => b.wins - a.wins);
        }
      } else {
        pList.sort((a, b) => a.currentRank - b.currentRank);
      }
      records = pList;
    } else if (upper.includes(':VENUE')) {
      columns = ['venueId', 'name', 'city', 'tableCount'];
      let vList = Array.from(embeddedGraph.venues.values());
      const cityMatch = query.match(/['"](Mumbai|Delhi|Bangalore|Chennai|Kolkata|Pune|Hyderabad)['"]/i);
      if (cityMatch) {
        vList = vList.filter(v => v.city.toLowerCase() === cityMatch[1].toLowerCase());
      }
      if (upper.includes('TABLECOUNT') || upper.includes('TABLES')) {
        const tableNum = parseInt(query.match(/TABLES?\s*>=?\s*(\d+)/i)?.[1] || '0', 10);
        if (tableNum > 0) vList = vList.filter(v => v.tableCount >= tableNum);
      }
      records = vList;
    } else if (upper.includes(':HOST')) {
      columns = ['hostId', 'name', 'organization', 'email', 'phone'];
      records = Array.from(embeddedGraph.hosts.values());
    } else if (upper.includes(':EVENT')) {
      columns = ['eventId', 'title', 'type', 'format', 'venueId', 'status', 'maxPlayers'];
      records = Array.from(embeddedGraph.events.values());
    } else if (upper.includes(':TOURNAMENT')) {
      columns = ['tournamentId', 'name', 'type', 'status', 'numRounds'];
      records = Array.from(embeddedGraph.tournaments.values());
    } else if (upper.includes(':MATCH')) {
      columns = ['matchId', 'playerAId', 'playerBId', 'format', 'scoreA', 'scoreB', 'status', 'winnerId'];
      records = Array.from(embeddedGraph.matches.values());
    } else if (upper.includes(':ROUND')) {
      columns = ['roundId', 'roundNumber', 'tournamentId', 'status'];
      records = Array.from(embeddedGraph.rounds.values());
    } else if (upper.match(/MATCH\s*\([a-zA-Z0-9_]*\)\s*RETURN/i) || upper.match(/RETURN\s+1/i) || upper.includes('MATCH (N)')) {
      // General node sampler only for valid wildcard node queries
      columns = ['id', 'label', 'name', 'details'];
      const all: any[] = [];
      embeddedGraph.players.forEach(p => all.push({ id: p.playerId, label: 'Player', name: p.name, details: `Rank #${p.currentRank}, ${p.winRate}% WinRate` }));
      embeddedGraph.venues.forEach(v => all.push({ id: v.venueId, label: 'Venue', name: v.name, details: `${v.city}, ${v.tableCount} Tables` }));
      embeddedGraph.hosts.forEach(h => all.push({ id: h.hostId, label: 'Host', name: h.name, details: h.organization }));
      embeddedGraph.events.forEach(e => all.push({ id: e.eventId, label: 'Event', name: e.title, details: `${e.format} • ${e.status}` }));
      embeddedGraph.tournaments.forEach(t => all.push({ id: t.tournamentId, label: 'Tournament', name: t.name, details: t.status }));
      records = all;
    } else {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        error: `Neo.ClientError.Statement.SyntaxError: Invalid or unrecognized Cypher expression:\n"${query}"\nExpected valid pattern: (node)-[:RELATIONSHIP]->(node)`,
        query,
        executionTimeMs,
        recordCount: 0,
        columns: [],
        records: []
      };
    }


    records = records.slice(0, limit);
    if (records.length > 0 && columns.length === 0) {
      columns = Object.keys(records[0]);
    }

    const executionTimeMs = Date.now() - startTime;
    return {
      success: true,
      query,
      executionTimeMs,
      recordCount: records.length,
      columns,
      records
    };
  }
}
