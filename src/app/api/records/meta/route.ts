export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [evek, tipusok] = await Promise.all([
    prisma.meroRecord.findMany({
      select: { hitelesitesEve: true },
      distinct: ["hitelesitesEve"],
      where: { hitelesitesEve: { not: "" } },
      orderBy: { hitelesitesEve: "asc" },
    }),
    prisma.meroRecord.findMany({
      select: { anyagszamMegnevezese: true },
      distinct: ["anyagszamMegnevezese"],
      where: { anyagszamMegnevezese: { not: "" } },
      orderBy: { anyagszamMegnevezese: "asc" },
    }),
  ]);

  const lejáratiEvek = [...new Set(
    evek.map((r) => parseInt(r.hitelesitesEve)).filter(Boolean).map((y) => y + 8)
  )].sort((a, b) => a - b);

  return NextResponse.json({
    lejáratiEvek,
    tipusok: tipusok.map((r) => r.anyagszamMegnevezese),
  });
}
