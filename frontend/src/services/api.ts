import axios from 'axios';
import { Player, Event, Match, LiveScoringDoc, HeadToHeadData, PageRankItem, LouvainCommunity, SimilarityPair, GraphData } from '../types';

const API_BASE = '/api';

export const api = {
  // Auth
  register: (data: any) => axios.post(`${API_BASE}/auth/register`, data).then(r => r.data),
  login: (data: any) => axios.post(`${API_BASE}/auth/login`, data).then(r => r.data),
  getMe: () => axios.get(`${API_BASE}/auth/me`).then(r => r.data),

  // Events
  getEvents: (): Promise<Event[]> => axios.get(`${API_BASE}/events`).then(r => r.data),
  createEvent: (data: any): Promise<Event> => axios.post(`${API_BASE}/events`, data).then(r => r.data),
  registerForEvent: (eventId: string, playerId: string) => axios.post(`${API_BASE}/events/${eventId}/register`, { playerId }).then(r => r.data),

  // Tournaments
  createTournament: (data: any) => axios.post(`${API_BASE}/tournaments`, data).then(r => r.data),
  getTournamentBracket: (id: string) => axios.get(`${API_BASE}/tournaments/${id}/bracket`).then(r => r.data),

  // Matches
  getMatches: (): Promise<any[]> => axios.get(`${API_BASE}/matches`).then(r => r.data),
  createMatch: (data: any): Promise<{ match: Match; liveDoc: LiveScoringDoc }> => axios.post(`${API_BASE}/matches`, data).then(r => r.data),
  getMatchDetails: (id: string): Promise<{ matchGraphMeta: Match; liveScoringDoc: LiveScoringDoc }> => axios.get(`${API_BASE}/matches/${id}`).then(r => r.data),
  recordShot: (matchId: string, data: any) => axios.post(`${API_BASE}/matches/${matchId}/shot`, data).then(r => r.data),
  completeMatch: (matchId: string, winnerId?: string) => axios.post(`${API_BASE}/matches/${matchId}/complete`, { winnerId }).then(r => r.data),
  endFrame: (matchId: string) => axios.post(`${API_BASE}/matches/${matchId}/end-frame`).then(r => r.data),
  abandonMatch: (matchId: string) => axios.post(`${API_BASE}/matches/${matchId}/abandon`).then(r => r.data),

  // Players
  getPlayers: (): Promise<Player[]> => axios.get(`${API_BASE}/players`).then(r => r.data),
  createPlayer: (data: any): Promise<Player> => axios.post(`${API_BASE}/players`, data).then(r => r.data),
  getPlayerProfile: (id: string) => axios.get(`${API_BASE}/players/${id}/profile`).then(r => r.data),
  getPlayerHistory: (id: string) => axios.get(`${API_BASE}/players/${id}/history`).then(r => r.data),
  getHeadToHead: (idA: string, idB: string): Promise<HeadToHeadData> => axios.get(`${API_BASE}/players/${idA}/vs/${idB}`).then(r => r.data),

  // Venues & Admin Reset
  getVenues: () => axios.get(`${API_BASE}/venues`).then(r => r.data),
  createVenue: (data: any) => axios.post(`${API_BASE}/venues`, data).then(r => r.data),
  resetDatabase: () => axios.post(`${API_BASE}/admin/reset`).then(r => r.data),
  seedReportData: () => axios.post(`${API_BASE}/admin/seed-report`).then(r => r.data),

  // Analytics & Graph
  getRankings: (): Promise<Player[]> => axios.get(`${API_BASE}/analytics/rankings`).then(r => r.data),
  getRankingDecay: (lambda = 0.05) => axios.get(`${API_BASE}/analytics/ranking-decay?lambda=${lambda}`).then(r => r.data),
  getExplainablePath: (playerId: string) => axios.get(`${API_BASE}/analytics/explainable-path/${playerId}`).then(r => r.data),
  getGraphVisualization: (): Promise<GraphData> => axios.get(`${API_BASE}/analytics/graph`).then(r => r.data),
  getPageRank: (): Promise<PageRankItem[]> => axios.get(`${API_BASE}/analytics/gds/pagerank`).then(r => r.data),
  getLouvainCommunities: (): Promise<LouvainCommunity[]> => axios.get(`${API_BASE}/analytics/gds/louvain`).then(r => r.data),
  getNodeSimilarity: (): Promise<SimilarityPair[]> => axios.get(`${API_BASE}/analytics/gds/similarity`).then(r => r.data),
  getShortestPath: (p1: string, p2: string) => axios.get(`${API_BASE}/analytics/shortest-path?p1=${p1}&p2=${p2}`).then(r => r.data),
  getCypherSuite: () => axios.get(`${API_BASE}/analytics/cypher-suite`).then(r => r.data),
  runCypherQuery: (queryId: number) => axios.post(`${API_BASE}/analytics/cypher-run`, { queryId }).then(r => r.data),
  executeCustomCypher: (query: string) => axios.post(`${API_BASE}/analytics/cypher-custom`, { query }).then(r => r.data)
};
