import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [total, allRecords] = await Promise.all([
    prisma.meroRecord.count(),
    prisma.meroRecord.findMany({ select: { meroFajta: true, hitelesitesEve: true, anyagszamMegnevezese: true, helyseg: true } }),
  ]);

  const now = new Date().getFullYear();
  let lejart = 0, iden = 0, jovrelejar = 0, ervenyes = 0;

  const tipusMap = new Map<string, number>();
  const fajtaMap = new Map<string, number>();
  const evMap = new Map<string, number>();
  const helysegMap = new Map<string, number>();

  for (const r of allRecords) {
    const year = parseInt(r.hitelesitesEve);
    if (year) {
      const exp = year + 8;
      if (exp < now) lejart++;
      else if (exp === now) iden++;
      else if (exp === now + 1) jovrelejar++;
      else ervenyes++;
    }

    if (r.anyagszamMegnevezese) tipusMap.set(r.anyagszamMegnevezese, (tipusMap.get(r.anyagszamMegnevezese) ?? 0) + 1);
    if (r.meroFajta) fajtaMap.set(r.meroFajta, (fajtaMap.get(r.meroFajta) ?? 0) + 1);
    if (r.hitelesitesEve) evMap.set(r.hitelesitesEve, (evMap.get(r.hitelesitesEve) ?? 0) + 1);
    if (r.helyseg) helysegMap.set(r.helyseg, (helysegMap.get(r.helyseg) ?? 0) + 1);
  }

  const sortDesc = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

  const byEv = [...evMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  return NextResponse.json({
    total,
    expiryStats: { lejart, iden, jovrelejar, ervenyes },
    byTipus: sortDesc(tipusMap),
    byMeroFajta: sortDesc(fajtaMap),
    byEv,
    byHelyseg: sortDesc(helysegMap),
  });
}
