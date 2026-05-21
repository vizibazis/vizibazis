export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string })?.role;
  if (role !== "ADMIN" && role !== "EDITOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { records: Record<string, string>[]; batchId: string };
  if (!body.records?.length) return NextResponse.json({ error: "No records" }, { status: 400 });

  await prisma.meroRecord.createMany({ data: body.records });

  return NextResponse.json({ imported: body.records.length });
}
