"use server";

import { db } from "@/neynar-db-sdk/db";
import { rastaScores } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export type ScoreEntry = {
  id: string;
  fid: number;
  score: number;
  level: number;
  createdAt: Date;
};

/**
 * Save a game score when player gets game over
 */
export async function saveScore(fid: number, score: number, level: number): Promise<{ success: boolean }> {
  try {
    await db.insert(rastaScores).values({ fid, score, level });
    return { success: true };
  } catch (error) {
    console.error("Failed to save score:", error);
    return { success: false };
  }
}

/**
 * Get top 10 scores globally
 */
export async function getTopScores(): Promise<ScoreEntry[]> {
  try {
    return await db
      .select()
      .from(rastaScores)
      .orderBy(desc(rastaScores.score))
      .limit(10);
  } catch (error) {
    console.error("Failed to get top scores:", error);
    return [];
  }
}

/**
 * Get the player's personal best score
 */
export async function getPersonalBest(fid: number): Promise<ScoreEntry | null> {
  try {
    const result = await db
      .select()
      .from(rastaScores)
      .where(eq(rastaScores.fid, fid))
      .orderBy(desc(rastaScores.score))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    console.error("Failed to get personal best:", error);
    return null;
  }
}
