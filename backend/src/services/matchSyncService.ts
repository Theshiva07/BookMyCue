import { isMongoConnected } from '../config/db';
import { LiveScoringModel, embeddedMongoDocs, ILiveScoringDoc } from '../models/LiveScoring';
import { Neo4jService } from '../graph/neo4jService';

export class MatchSyncService {
  /**
   * Appends a shot event to the live scoring document in MongoDB/Embedded Store
   */
  static async recordShot(
    matchId: string,
    playerId: string,
    shotType: 'pot' | 'safety' | 'foul' | 'miss',
    ballsPotted: string[] = [],
    breakValue: number = 0,
    foulInfo: { type: string; pointsAwarded: number } | null = null
  ): Promise<ILiveScoringDoc> {
    let doc: ILiveScoringDoc | null = null;

    if (isMongoConnected) {
      doc = await LiveScoringModel.findOne({ matchId });
    } else {
      doc = embeddedMongoDocs.get(matchId) as ILiveScoringDoc;
    }

    if (!doc) {
      throw new Error(`Match scoring document not found for matchId: ${matchId}`);
    }

    if (doc.status === 'completed') {
      throw new Error('Cannot record shot on a completed match');
    }

    // Ensure active frame exists
    if (!doc.frames || doc.frames.length === 0) {
      doc.frames = [
        {
          frameNumber: 1,
          startedAt: new Date().toISOString(),
          shots: [],
          breaks: [],
          frameScoreA: 0,
          frameScoreB: 0
        }
      ];
    }

    const currentFrameObj = doc.frames[doc.frames.length - 1];
    const shotNumber = currentFrameObj.shots.length + 1;

    currentFrameObj.shots.push({
      shotNumber,
      playerId,
      timestamp: new Date().toISOString(),
      type: shotType,
      ballsPotted,
      breakValue,
      foul: foulInfo
    });

    // Update frame points
    const isPlayerA = playerId === doc.playerA.id;
    if (shotType === 'pot') {
      let points = 0;
      if (doc.format === 'Snooker') {
        const ballPoints: Record<string, number> = {
          red: 1, yellow: 2, green: 3, brown: 4, blue: 5, pink: 6, black: 7
        };
        ballsPotted.forEach(b => { points += ballPoints[b.toLowerCase()] || 1; });
      } else {
        points = ballsPotted.length > 0 ? ballsPotted.length : 1;
      }
      if (isPlayerA) currentFrameObj.frameScoreA += points;
      else currentFrameObj.frameScoreB += points;
    } else if (shotType === 'foul' && foulInfo) {
      // Points for foul go to opponent
      if (isPlayerA) currentFrameObj.frameScoreB += foulInfo.pointsAwarded;
      else currentFrameObj.frameScoreA += foulInfo.pointsAwarded;
    }

    // Track running breaks
    if (breakValue > 0) {
      const existingBreak = currentFrameObj.breaks.find(b => b.playerId === playerId);
      if (existingBreak) {
        if (breakValue > existingBreak.value) existingBreak.value = breakValue;
      } else {
        currentFrameObj.breaks.push({
          playerId,
          value: breakValue,
          timestamp: new Date().toISOString()
        });
      }
    }

    if (isMongoConnected) {
      await (doc as any).save();
    } else {
      embeddedMongoDocs.set(matchId, doc);
    }

    return doc;
  }

  /**
   * Section 5 Core Orchestration Sync Transaction
   * Marks MongoDB doc as completed & synchronizes aggregated outcomes back into Neo4j
   */
  static async finalizeMatch(matchId: string, winnerId?: string): Promise<{ doc: ILiveScoringDoc; syncSuccess: boolean }> {
    let doc: ILiveScoringDoc | null = null;

    if (isMongoConnected) {
      doc = await LiveScoringModel.findOne({ matchId });
    } else {
      doc = embeddedMongoDocs.get(matchId) as ILiveScoringDoc;
    }

    if (!doc) throw new Error(`Scoring doc not found for matchId: ${matchId}`);

    // Compute frame scores if not explicitly provided
    let winsA = 0;
    let winsB = 0;
    doc.frames.forEach(f => {
      if (f.frameScoreA > f.frameScoreB) {
        f.winnerId = doc!.playerA.id;
        winsA++;
      } else if (f.frameScoreB > f.frameScoreA) {
        f.winnerId = doc!.playerB.id;
        winsB++;
      }
    });

    doc.runningScoreA = winsA;
    doc.runningScoreB = winsB;
    doc.status = 'completed';

    const finalWinnerId = winnerId || (winsA >= winsB ? doc.playerA.id : doc.playerB.id);

    if (isMongoConnected) {
      await (doc as any).save();
    } else {
      embeddedMongoDocs.set(matchId, doc);
    }

    // Collect all breaks in match per player
    const breaksA: number[] = [];
    const breaksB: number[] = [];
    doc.frames.forEach(f => {
      f.breaks.forEach(b => {
        if (b.playerId === doc!.playerA.id) breaksA.push(b.value);
        if (b.playerId === doc!.playerB.id) breaksB.push(b.value);
      });
    });

    // Execute polyglot orchestration sync into Neo4j graph
    let syncSuccess = false;
    try {
      await Neo4jService.completeMatchSync(
        matchId,
        winsA,
        winsB,
        finalWinnerId,
        breaksA,
        breaksB
      );
      syncSuccess = true;
      console.log(`✅ Polyglot Sync Completed for match ${matchId}: Neo4j graph updated.`);
    } catch (err) {
      console.error(`❌ Polyglot Sync Failed for match ${matchId}:`, err);
    }

    return { doc, syncSuccess };
  }

  /**
   * Concludes the current frame, determines frame winner, and advances to the next frame
   */
  static async endFrame(matchId: string): Promise<ILiveScoringDoc> {
    let doc: ILiveScoringDoc | null = null;
    if (isMongoConnected) {
      doc = await LiveScoringModel.findOne({ matchId });
    } else {
      doc = embeddedMongoDocs.get(matchId) as ILiveScoringDoc;
    }

    if (!doc) throw new Error(`Scoring doc not found for matchId: ${matchId}`);
    if (doc.status === 'completed') throw new Error('Match is already completed');

    const curFrame = doc.frames[doc.frames.length - 1];
    if (curFrame.frameScoreA > curFrame.frameScoreB) {
      curFrame.winnerId = doc.playerA.id;
      doc.runningScoreA++;
    } else if (curFrame.frameScoreB > curFrame.frameScoreA) {
      curFrame.winnerId = doc.playerB.id;
      doc.runningScoreB++;
    }

    // Check match completion
    const bestOf = 7;
    const framesNeeded = Math.ceil(bestOf / 2);
    if (doc.runningScoreA >= framesNeeded || doc.runningScoreB >= framesNeeded) {
      await this.finalizeMatch(matchId);
    } else {
      doc.currentFrame++;
      doc.frames.push({
        frameNumber: doc.currentFrame,
        startedAt: new Date().toISOString(),
        shots: [],
        breaks: [],
        frameScoreA: 0,
        frameScoreB: 0
      });

      if (isMongoConnected) {
        await (doc as any).save();
      } else {
        embeddedMongoDocs.set(matchId, doc);
      }
    }

    return doc;
  }

  /**
   * Abandons or forfeits an active match
   */
  static async abandonMatch(matchId: string): Promise<ILiveScoringDoc> {
    let doc: ILiveScoringDoc | null = null;
    if (isMongoConnected) {
      doc = await LiveScoringModel.findOne({ matchId });
    } else {
      doc = embeddedMongoDocs.get(matchId) as ILiveScoringDoc;
    }

    if (!doc) throw new Error(`Scoring doc not found for matchId: ${matchId}`);
    doc.status = 'completed';

    if (isMongoConnected) {
      await (doc as any).save();
    } else {
      embeddedMongoDocs.set(matchId, doc);
    }

    return doc;
  }
}
