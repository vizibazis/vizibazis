export const dynamic = "force-dynamic";



import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "";
  const cim = searchParams.get("cim") ?? "";
  const keszulekhely = searchParams.get("keszulekhely") ?? "";
  const global = searchParams.get("global") ?? "";
  const lejáratiEv = searchParams.get("lejáratiEv") ?? "";
  const tipusok = searchParams.getAll("tipus");
  const sort = searchParams.get("sort") ?? "nev";
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  const AND: Record<string, unknown>[] = [];

  if (name) AND.push({ nev: { contains: name, mode: "insensitive" } });
  if (cim) AND.push({
    OR: [
      { helyseg: { contains: cim, mode: "insensitive" } },
      { utca: { contains: cim, mode: "insensitive" } },
      { hazszam: { contains: cim, mode: "insensitive" } },
    ],
  });
  if (keszulekhely) AND.push({ keszulekhely: { contains: keszulekhely, mode: "insensitive" } });
  if (global) AND.push({
    OR: [
      { nev: { contains: global, mode: "insensitive" } },
      { keszulekhely: { contains: global, mode: "insensitive" } },
      { helyseg: { contains: global, mode: "insensitive" } },
      { utca: { contains: global, mode: "insensitive" } },
      { gyariSzam: { contains: global, mode: "insensitive" } },
      { telefon: { contains: global, mode: "insensitive" } },
      { email: { contains: global, mode: "insensitive" } },
    ],
  });
  if (lejáratiEv) AND.push({ hitelesitesEve: String(parseInt(lejáratiEv) - 8) });
  if (tipusok.length > 0) AND.push({ anyagszamMegnevezese: { in: tipusok } });

  const where = AND.length > 0 ? { AND } : {};

  const [records, total] = await Promise.all([
    prisma.meroRecord.findMany({ where, skip, take: limit, orderBy: { [sort]: sortDir } }),
    prisma.meroRecord.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, pages: Math.ceil(total / limit) });
}
