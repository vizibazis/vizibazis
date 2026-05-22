export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const from = new Date(dateStr + "T00:00:00");
  const to = new Date(dateStr + "T23:59:59");

  const workers = await prisma.worker.findMany({ orderBy: { name: "asc" } });
  const appointments = await prisma.appointment.findMany({
    where: { date: { gte: from, lte: to } },
    select: { workerId: true },
  });

  const counts = new Map<string, number>();
  for (const a of appointments) {
    if (a.workerId) counts.set(a.workerId, (counts.get(a.workerId) ?? 0) + 1);
  }

  const result = workers.map(w => ({
    id: w.id,
    name: w.name,
    email: w.email,
    count: counts.get(w.id) ?? 0,
  }));

  return NextResponse.json(result);
}
