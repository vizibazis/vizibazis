export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const meroFajta = searchParams.get("meroFajta") ?? "";
  const helyseg = searchParams.get("helyseg") ?? "";
  const ev = searchParams.get("ev") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { nev: { contains: search, mode: "insensitive" } },
      { keszulekhely: { contains: search, mode: "insensitive" } },
      { gyariSzam: { contains: search, mode: "insensitive" } },
      { helyseg: { contains: search, mode: "insensitive" } },
      { utca: { contains: search, mode: "insensitive" } },
    ];
  }
  if (meroFajta) where.meroFajta = { contains: meroFajta, mode: "insensitive" };
  if (helyseg) where.helyseg = { contains: helyseg, mode: "insensitive" };
  if (ev) where.hitelesitesEve = ev;

  const [records, total] = await Promise.all([
    prisma.meroRecord.findMany({ where, skip, take: limit, orderBy: { nev: "asc" } }),
    prisma.meroRecord.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, pages: Math.ceil(total / limit) });
}
