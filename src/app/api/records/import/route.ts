export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

const COLUMN_MAP: Record<string, string> = {
  "készülékhely": "keszulekhely", "keszulekhely": "keszulekhely",
  "név": "nev", "nev": "nev", "name": "nev",
  "telefon": "telefon",
  "mobil": "mobil",
  "e-mail": "email", "email": "email",
  "mobiltel. (onuf)": "mobiltelOnuf", "mobiltelonuf": "mobiltelOnuf",
  "ir.szám": "irszam", "irszám": "irszam", "irszam": "irszam",
  "helység": "helyseg", "helyseg": "helyseg",
  "utca": "utca",
  "hsz.": "hazszam", "hazszam": "hazszam",
  "épület": "epulet", "epulet": "epulet",
  "lépcsőház": "lepcsohaz", "lepcsohaz": "lepcsohaz",
  "emelet": "emelet",
  "ajtó": "ajto", "ajto": "ajto",
  "mérő fajta": "meroFajta", "merofajta": "meroFajta",
  "gyári szám": "gyariSzam", "gyariszam": "gyariSzam",
  "sorszám": "sorszam", "sorszam": "sorszam",
  "hitelesítés éve": "hitelesitesEve", "hitelesiteseve": "hitelesitesEve",
  "átmérő (dn)": "atmero", "atmero": "atmero",
  "főmérő kh": "fomeroKh", "fomerokh": "fomeroKh",
  "anyagszám megnevezése": "anyagszamMegnevezese",
};

function normalizeKey(k: string) {
  return k.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string })?.role;
  if (role !== "ADMIN" && role !== "EDITOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  if (!rows.length) return NextResponse.json({ error: "Empty file" }, { status: 400 });

  const batchId = `import_${Date.now()}`;
  const data = rows.map((row) => {
    const record: Record<string, string> = {
      importBatch: batchId,
      keszulekhely: "", nev: "", telefon: "", mobil: "", email: "",
      mobiltelOnuf: "", irszam: "", helyseg: "", utca: "", hazszam: "",
      epulet: "", lepcsohaz: "", emelet: "", ajto: "", meroFajta: "",
      gyariSzam: "", sorszam: "", hitelesitesEve: "", atmero: "",
      fomeroKh: "", anyagszamMegnevezese: "",
    };
    for (const [k, v] of Object.entries(row)) {
      const mapped = COLUMN_MAP[normalizeKey(k)];
      if (mapped) record[mapped] = String(v ?? "").trim();
    }
    return record;
  });

  await prisma.meroRecord.createMany({ data });

  return NextResponse.json({ imported: data.length, batchId });
}
