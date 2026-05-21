export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [meroFajtak, evek] = await Promise.all([
    prisma.meroRecord.findMany({
      select: { meroFajta: true },
      distinct: ["meroFajta"],
      where: { meroFajta: { not: "" } },
      orderBy: { meroFajta: "asc" },
    }),
    prisma.meroRecord.findMany({
      select: { hitelesitesEve: true },
      distinct: ["hitelesitesEve"],
      where: { hitelesitesEve: { not: "" } },
      orderBy: { hitelesitesEve: "asc" },
    }),
  ]);

  return NextResponse.json({
    meroFajtak: meroFajtak.map((r) => r.meroFajta),
    evek: evek.map((r) => r.hitelesitesEve),
  });
}
