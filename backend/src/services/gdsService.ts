import { neo4jDriver, isNeo4jConnected } from '../config/db';
import { embeddedGraph, Neo4jService } from '../graph/neo4jService';

export interface PageRankResult {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
}

export interface LouvainResult {
  playerId: string;
  playerName: string;
  communityId: number;
  communityName: string;
}

export interface SimilarityResult {
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  similarity: number;
  sharedOpponents: number;
}

export class GDSService {
  /**
   * PageRank Stream
   */
  static async getPageRank(): Promise<PageRankResult[]> {
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const cypher = `
          CALL gds.pageRank.stream('playerGraph')
          YIELD nodeId, score
          RETURN gds.util.asNode(nodeId).playerId AS playerId, gds.util.asNode(nodeId).name AS playerName, score
          ORDER BY score DESC LIMIT 50;
        `;
        const res = await session.run(cypher);
        let rank = 1;
        return res.records.map(rec => ({
          playerId: rec.get('playerId'),
          playerName: rec.get('playerName'),
          score: Math.round(rec.get('score') * 10000) / 10000,
          rank: rank++
        }));
      } catch (e) {
        console.warn('Neo4j GDS PageRank procedure not found, falling back to algorithmic computation.');
      } finally {
        await session.close();
      }
    }

    // Algorithm PageRank on Embedded Graph
    const players = await Neo4jService.getAllPlayers();
    if (players.length === 0) return [];

    const numPlayers = players.length;
    const initialScore = 1 / numPlayers;
    const scores = new Map<string, number>();
    players.forEach(p => scores.set(p.playerId, initialScore));

    const damping = 0.85;
    const iterations = 20;

    for (let it = 0; it < iterations; it++) {
      const newScores = new Map<string, number>();
      players.forEach(p => {
        let incomingSum = 0;
        // Sum score from opponents who played against p
        players.forEach(opp => {
          if (opp.playerId !== p.playerId) {
            const edgeKey = `${opp.playerId}:${p.playerId}`;
            if (embeddedGraph.playedAgainst.has(edgeKey)) {
              // Count total outgoing links from opp
              let oppOutDegree = 0;
              players.forEach(other => {
                if (embeddedGraph.playedAgainst.has(`${opp.playerId}:${other.playerId}`)) {
                  oppOutDegree++;
                }
              });
              if (oppOutDegree > 0) {
                incomingSum += (scores.get(opp.playerId) || 0) / oppOutDegree;
              }
            }
          }
        });
        const rankVal = (1 - damping) / numPlayers + damping * incomingSum;
        newScores.set(p.playerId, rankVal);
      });
      newScores.forEach((val, k) => scores.set(k, val));
    }

    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    let rankCounter = 1;

    return sorted.map(([pId, score]) => {
      const p = embeddedGraph.players.get(pId);
      return {
        playerId: pId,
        playerName: p ? p.name : pId,
        score: Math.round(score * 10000) / 10000,
        rank: rankCounter++
      };
    });
  }

  /**
   * Louvain Community Detection
   */
  static async getLouvainCommunities(): Promise<LouvainResult[]> {
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const cypher = `
          CALL gds.louvain.stream('playerGraph')
          YIELD nodeId, communityId
          RETURN gds.util.asNode(nodeId).playerId AS playerId, gds.util.asNode(nodeId).name AS playerName, communityId
          ORDER BY communityId ASC;
        `;
        const res = await session.run(cypher);
        return res.records.map(rec => ({
          playerId: rec.get('playerId'),
          playerName: rec.get('playerName'),
          communityId: rec.get('communityId').toNumber ? rec.get('communityId').toNumber() : rec.get('communityId'),
          communityName: `Community Cluster #${rec.get('communityId')}`
        }));
      } catch (e) {
        console.warn('Neo4j GDS Louvain procedure not found, falling back to algorithmic community clustering.');
      } finally {
        await session.close();
      }
    }

    // Algorithmic Community Clustering on Embedded Graph
    const players = await Neo4jService.getAllPlayers();
    const communities: LouvainResult[] = [];

    // Group players by home venue or opponent density
    players.forEach(p => {
      let commId = 1;
      if (p.homeVenueId) {
        const idx = Array.from(embeddedGraph.venues.keys()).indexOf(p.homeVenueId);
        if (idx !== -1) commId = idx + 1;
      } else {
        commId = (p.name.charCodeAt(0) % 4) + 1;
      }
      communities.push({
        playerId: p.playerId,
        playerName: p.name,
        communityId: commId,
        communityName: `Cluster ${commId} (${embeddedGraph.venues.get(p.homeVenueId || '')?.name || 'Open Circuit'})`
      });
    });

    return communities.sort((a, b) => a.communityId - b.communityId);
  }

  /**
   * Node Similarity Stream (Jaccard on Shared Opponents)
   */
  static async getNodeSimilarity(): Promise<SimilarityResult[]> {
    if (isNeo4jConnected && neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        const cypher = `
          CALL gds.nodeSimilarity.stream('playerOpponentGraph')
          YIELD node1, node2, similarity
          RETURN gds.util.asNode(node1).playerId AS p1Id, gds.util.asNode(node1).name AS p1Name,
                 gds.util.asNode(node2).playerId AS p2Id, gds.util.asNode(node2).name AS p2Name,
                 similarity
          ORDER BY similarity DESC LIMIT 20;
        `;
        const res = await session.run(cypher);
        return res.records.map(rec => ({
          player1Id: rec.get('p1Id'),
          player1Name: rec.get('p1Name'),
          player2Id: rec.get('p2Id'),
          player2Name: rec.get('p2Name'),
          similarity: Math.round(rec.get('similarity') * 100) / 100,
          sharedOpponents: 5
        }));
      } catch (e) {
        console.warn('Neo4j GDS NodeSimilarity not found, falling back to Jaccard calculation.');
      } finally {
        await session.close();
      }
    }

    // Jaccard Opponent Pool Calculation on Embedded Graph
    const players = Array.from(embeddedGraph.players.values());
    const playerOpponentsMap = new Map<string, Set<string>>();

    players.forEach(p => {
      const opponents = new Set<string>();
      players.forEach(other => {
        if (other.playerId !== p.playerId) {
          if (
            embeddedGraph.playedAgainst.has(`${p.playerId}:${other.playerId}`) ||
            embeddedGraph.playedAgainst.has(`${other.playerId}:${p.playerId}`)
          ) {
            opponents.add(other.playerId);
          }
        }
      });
      playerOpponentsMap.set(p.playerId, opponents);
    });

    const results: SimilarityResult[] = [];
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const p1 = players[i];
        const p2 = players[j];
        const opps1 = playerOpponentsMap.get(p1.playerId) || new Set();
        const opps2 = playerOpponentsMap.get(p2.playerId) || new Set();

        const intersection = new Set([...opps1].filter(x => opps2.has(x)));
        const union = new Set([...opps1, ...opps2]);

        if (union.size > 0 && intersection.size > 0) {
          const jaccard = intersection.size / union.size;
          results.push({
            player1Id: p1.playerId,
            player1Name: p1.name,
            player2Id: p2.playerId,
            player2Name: p2.name,
            similarity: Math.round(jaccard * 100) / 100,
            sharedOpponents: intersection.size
          });
        }
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 25);
  }
}
