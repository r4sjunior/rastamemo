import { NextRequest, NextResponse } from "next/server";
import { db } from "@/neynar-db-sdk/db";
import { rastaScores } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const fid = req.nextUrl.searchParams.get("fid");
  try {
    const top10 = await db
      .select()
      .from(rastaScores)
      .orderBy(desc(rastaScores.score))
      .limit(10);

    let personalBest = null;
    if (fid) {
      const pb = await db
        .select()
        .from(rastaScores)
        .where(eq(rastaScores.fid, parseInt(fid)))
        .orderBy(desc(rastaScores.score))
        .limit(1);
      personalBest = pb[0] ?? null;
    }

    return NextResponse.json({ top10, personalBest });
  } catch {
    return NextResponse.json({ top10: [], personalBest: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { fid, score, level } = await req.json();
    if (!fid || !score || !level) return NextResponse.json({ success: false });
    await db.insert(rastaScores).values({ fid, score, level });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
