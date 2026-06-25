import { NextRequest, NextResponse } from "next/server";
import { getPlayerDetail } from "@/lib/playerService";
export async function GET(_: NextRequest, { params }: { params: Promise<{ playerId: string }> }) { try { return NextResponse.json(await getPlayerDetail((await params).playerId)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "UNKNOWN" }, { status: 404 }); } }
