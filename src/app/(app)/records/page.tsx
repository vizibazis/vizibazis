"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Upload, X, Phone, Mail, MapPin, Gauge, Loader2, ChevronLeft, ChevronRight, CalendarPlus, SlidersHorizontal, ArrowUpDown, User, Tag } from "lucide-react";
import AppointmentFormModal from "@/components/appointments/AppointmentFormModal";

interface MeroRecord {
  id: string;
  keszulekhely: string;
  nev: string;
  telefon: string;
  mobil: string;
  email: string;
  irszam: string;
  helyseg: string;
  utca: string;
  hazszam: string;
  emelet: string;
  ajto: string;
  meroFajta: string;
  gyariSzam: string;
  sorszam: string;
  hitelesitesEve: string;
  atmero: string;
  fomeroKh: string;
  anyagszamMegnevezese: string;
}

export default function RecordsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "READER";
  const canEdit = role === "ADMIN" || role === "EDITOR";
  const [records, setRecords] = useState<MeroRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [nameSearch, setNameSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [lejáratiEv, setLejáratiEv] = useState("all");
  const [cimSearch, setCimSearch] = useState("");
  const [keszulekhely, setKeszulekhely] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedTipusok, setSelectedTipusok] = useState<string[]>([]);
  const [sort, setSort] = useState("nev");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MeroRecord | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [apptTarget, setApptTarget] = useState<MeroRecord | null>(null);
  const [lejáratiEvek, setLejáratiEvek] = useState<number[]>([]);
  const [tipusok, setTipusok] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/records/meta").then(r => r.json()).then(d => {
      setLejáratiEvek(d.lejáratiEvek ?? []);
      setTipusok(d.tipusok ?? []);
    });
  }, []);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50", sort, sortDir });
    if (nameSearch) params.set("name", nameSearch);
    if (cimSearch) params.set("cim", cimSearch);
    if (keszulekhely) params.set("keszulekhely", keszulekhely);
    if (globalSearch) params.set("global", globalSearch);
    if (lejáratiEv !== "all") params.set("lejáratiEv", lejáratiEv);
    selectedTipusok.forEach(t => params.append("tipus", t));
    const res = await fetch(`/api/records?${params}`);
    const data = await res.json();
    setRecords(data.records ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [page, nameSearch, cimSearch, keszulekhely, globalSearch, lejáratiEv, selectedTipusok, sort, sortDir]);

  useEffect(() => { fetch_(); }, [fetch_]);

  useEffect(() => { setPage(1); }, [nameSearch, cimSearch, keszulekhely, globalSearch, lejáratiEv, selectedTipusok]);

  function toggleTipus(t: string) {
    setSelectedTipusok(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  function toggleSort(field: string) {
    if (sort === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSort(field); setSortDir("asc"); }
  }

  const COLUMN_MAP: Record<string, string> = {
    "keszulekhely": "keszulekhely",
    "telefon": "telefon", "telefon standard": "telefon",
    "mobil": "mobil", "mobil standard": "mobil",
    "e-mail": "email", "email": "email", "email standard": "email",
    "mobiltelefon onuf": "mobiltelOnuf", "telefon onuf": "mobiltelOnuf", "mobiltel. (onuf)": "mobiltelOnuf",
    "ir.szam": "irszam", "irszam": "irszam", "fh irszam": "irszam",
    "helyseg": "helyseg", "fh helyseg": "helyseg",
    "utca": "utca", "fh utca": "utca",
    "hazszam": "hazszam", "hsz.": "hazszam", "fh hazszam": "hazszam",
    "epulet": "epulet", "fh epulet": "epulet",
    "lepcsohaz": "lepcsohaz", "fh lepcsohaz": "lepcsohaz",
    "emelet": "emelet", "fh emelet": "emelet",
    "ajto": "ajto", "fh ajto": "ajto",
    "mero fajta": "meroFajta",
    "gyari szam": "gyariSzam",
    "sorszam": "sorszam",
    "hitelesites eve": "hitelesitesEve",
    "atmero (dn)": "atmero", "atmero": "atmero",
    "fomero kh": "fomeroKh",
    "anyagszam megnevezese": "anyagszamMegnevezese",
  };

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("Fájl olvasása...");
    setImportProgress(0);
    e.target.value = "";

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      if (!rows.length) { setImportMsg("Üres fájl"); setImporting(false); return; }

      const batchId = `import_${Date.now()}`;
      const BATCH = 200;
      function normalizeCol(k: string) {
        return k.normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .replace(/[   ]/g, " ")
          .replace(/_/g, " ")
          .trim()
          .replace(/\s+/g, " ");
      }

      const mapped = rows.map((row) => {
        const rec: Record<string, string> = {
          importBatch: batchId,
          keszulekhely: "", nev: "", telefon: "", mobil: "", email: "",
          mobiltelOnuf: "", irszam: "", helyseg: "", utca: "", hazszam: "",
          epulet: "", lepcsohaz: "", emelet: "", ajto: "", meroFajta: "",
          gyariSzam: "", sorszam: "", hitelesitesEve: "", atmero: "",
          fomeroKh: "", anyagszamMegnevezese: "",
        };
        let csaladnev = "";
        let utonev = "";
        for (const [k, v] of Object.entries(row)) {
          const n = normalizeCol(k);
          const val = String(v ?? "").trim();
          if (n === "csaladnev") { csaladnev = val; continue; }
          if (n === "utonev") { utonev = val; continue; }
          const key = COLUMN_MAP[n];
          if (key) rec[key] = val;
        }
        if (csaladnev || utonev) rec.nev = [csaladnev, utonev].filter(Boolean).join(" ");
        if (rec.mobiltelOnuf) {
          rec.mobil = [rec.mobil, rec.mobiltelOnuf].filter(Boolean).join(", ");
          rec.mobiltelOnuf = "";
        }
        return rec;
      });

      // Deduplication: group by name + address, merge meter-specific fields
      const PERSONAL = new Set(["nev", "telefon", "mobil", "email", "mobiltelOnuf", "irszam", "helyseg", "utca", "hazszam", "emelet", "ajto", "importBatch"]);
      const METER = ["keszulekhely", "meroFajta", "gyariSzam", "sorszam", "hitelesitesEve", "atmero", "fomeroKh", "anyagszamMegnevezese"];

      const groups = new Map<string, Record<string, string>>();
      for (const rec of mapped) {
        const key = [rec.nev, rec.helyseg, rec.utca, rec.hazszam, rec.emelet, rec.ajto]
          .map(v => v.trim().toLowerCase()).join("|");
        if (!key.replace(/\|/g, "").trim()) { groups.set(Math.random().toString(), rec); continue; }
        if (!groups.has(key)) {
          groups.set(key, { ...rec });
        } else {
          const base = groups.get(key)!;
          // personal: fill empty fields from duplicate
          for (const f of PERSONAL) {
            if (!base[f] && rec[f]) base[f] = rec[f];
          }
          // meter: append unique non-empty values
          for (const f of METER) {
            if (!rec[f]) continue;
            const existing = base[f] ? base[f].split(", ") : [];
            if (!existing.includes(rec[f])) base[f] = [...existing, rec[f]].filter(Boolean).join(", ");
          }
        }
      }
      const deduped = [...groups.values()];

      let imported = 0;
      for (let i = 0; i < deduped.length; i += BATCH) {
        const chunk = deduped.slice(i, i + BATCH);
        const res = await fetch("/api/records/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: chunk, batchId }),
        });
        if (!res.ok) { const d = await res.json(); setImportMsg(`Hiba: ${d.error}`); setImporting(false); return; }
        imported += chunk.length;
        setImportProgress(Math.round((imported / deduped.length) * 100));
        setImportMsg(`Importálás... ${imported} / ${deduped.length}`);
      }

      const dupes = mapped.length - deduped.length;
      setImportMsg(`✓ ${imported} rekord importálva${dupes > 0 ? ` (${dupes} duplikátum összevonva)` : ""}`);
      fetch_();
    } catch (err) {
      setImportMsg(`Hiba: ${String(err)}`);
    }
    setImporting(false);
    setImportProgress(0);
  }

  const meroColor = (fajta: string) => {
    const f = fajta.toLowerCase();
    if (f.includes("hideg")) return "text-blue-600";
    if (f.includes("meleg")) return "text-orange-500";
    return "text-slate-500";
  };

  const expiryStatus = (ev: string) => {
    const year = parseInt(ev);
    const now = new Date().getFullYear();
    if (!year) return null;
    const expires = year + 8;
    if (expires < now) return <Badge variant="destructive" className="text-xs">Lejárt</Badge>;
    if (expires === now) return <Badge className="bg-orange-500 text-xs">Idén jár le</Badge>;
    if (expires === now + 1) return <Badge className="bg-yellow-500 text-xs">Jövőre jár le</Badge>;
    return null;
  };

  return (
    <div className="flex h-full">
      {/* List panel */}
      <div className="flex flex-col w-96 border-r bg-white">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-slate-800">Mérők <span className="text-slate-400 font-normal text-sm">({total})</span></h1>
            {canEdit && (
              <>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
                <Button size="sm" variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span className="ml-1">Import</span>
                </Button>
              </>
            )}
          </div>
          {importMsg && <p className="text-xs text-slate-600">{importMsg}</p>}
          {importing && importProgress > 0 && (
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${importProgress}%` }} />
            </div>
          )}
          {/* Name search + filter/sort buttons */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="pl-8 h-9" placeholder="Keresés névben..." value={nameSearch} onChange={(e) => setNameSearch(e.target.value)} />
              {nameSearch && <button onClick={() => setNameSearch("")} className="absolute right-2.5 top-2.5 text-slate-400"><X className="h-4 w-4" /></button>}
            </div>
            <Button size="sm" variant={showFilters ? "default" : "outline"} onClick={() => setShowFilters(v => !v)} className="h-9 px-3">
              <SlidersHorizontal className="h-4 w-4 mr-1" />Szűrők
            </Button>
            <Button size="sm" variant="outline" onClick={() => toggleSort(sort)} className="h-9 px-2">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Expandable filters */}
          {showFilters && (
            <div className="space-y-2 pt-1">
              {/* Lejárati év */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-20 flex-shrink-0">Lejárati év</span>
                <Select value={lejáratiEv} onValueChange={(v) => setLejáratiEv(v ?? "all")}>
                  <SelectTrigger className="h-8 flex-1 text-sm">
                    <SelectValue placeholder="Mind" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Mind</SelectItem>
                    {lejáratiEvek.map((e) => (
                      <SelectItem key={e} value={String(e)}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Cím */}
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                <Input className="pl-8 h-8 text-sm" placeholder="Cím keresése..." value={cimSearch} onChange={(e) => setCimSearch(e.target.value)} />
                {cimSearch && <button onClick={() => setCimSearch("")} className="absolute right-2.5 top-2 text-slate-400"><X className="h-4 w-4" /></button>}
              </div>
              {/* Készülékhely */}
              <div className="relative">
                <Gauge className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                <Input className="pl-8 h-8 text-sm" placeholder="Készülékhely szám..." value={keszulekhely} onChange={(e) => setKeszulekhely(e.target.value)} />
                {keszulekhely && <button onClick={() => setKeszulekhely("")} className="absolute right-2.5 top-2 text-slate-400"><X className="h-4 w-4" /></button>}
              </div>
              {/* Mindenhol */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                <Input className="pl-8 h-8 text-sm" placeholder="Keresés mindenhol..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
                {globalSearch && <button onClick={() => setGlobalSearch("")} className="absolute right-2.5 top-2 text-slate-400"><X className="h-4 w-4" /></button>}
              </div>
              {/* Típus chips */}
              {tipusok.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500">Típus</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tipusok.map((t) => (
                      <button key={t} onClick={() => toggleTipus(t)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          selectedTipusok.includes(t)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Records */}
        <div className="flex-1 overflow-y-auto divide-y">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Gauge className="h-10 w-10 mb-3" />
              <p className="text-sm">Nincs rekord</p>
              <p className="text-xs">Importálj Excel fájlt</p>
            </div>
          ) : (
            records.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === r.id ? "bg-blue-50 border-r-2 border-blue-500" : ""}`}
              >
                <p className="font-medium text-sm text-slate-900 truncate">{r.nev || "–"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-medium ${meroColor(r.meroFajta)}`}>{r.meroFajta || "–"}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500 truncate">{r.helyseg}</span>
                </div>
                {expiryStatus(r.hitelesitesEve)}
              </button>
            ))
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t text-sm text-slate-600">
            <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>{page} / {pages}</span>
            <Button variant="ghost" size="sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-auto">
        {selected ? (
          <RecordDetail record={selected} onAppointment={() => setApptTarget(selected)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Gauge className="h-14 w-14 mb-4" />
            <p className="text-lg">Válasszon ki egy mérőt</p>
          </div>
        )}
      </div>

      {apptTarget && (
        <AppointmentFormModal
          prefill={{
            name: apptTarget.nev,
            phone: apptTarget.telefon || apptTarget.mobil,
            address: [apptTarget.helyseg, apptTarget.utca, apptTarget.hazszam].filter(Boolean).join(", "),
            locationId: apptTarget.keszulekhely,
          }}
          onClose={() => setApptTarget(null)}
          onSaved={() => setApptTarget(null)}
        />
      )}
    </div>
  );
}

function RecordDetail({ record, onAppointment }: { record: MeroRecord; onAppointment: () => void }) {
  const meroColor = record.meroFajta.toLowerCase().includes("hideg") ? "text-blue-600" : "text-orange-500";

  const cim = [record.helyseg, record.utca, record.hazszam, record.emelet ? `${record.emelet}. em.` : "", record.ajto ? `${record.ajto}. ajtó` : ""]
    .filter(Boolean).join(" ");

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{record.nev || "Ismeretlen"}</h2>
              <p className={`text-sm font-medium mt-1 ${meroColor}`}>{record.meroFajta}</p>
            </div>
            <Button onClick={onAppointment} size="sm">
              <CalendarPlus className="h-4 w-4 mr-1" />
              Időpont
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Section title="Személyes adatok" icon={<Phone className="h-4 w-4" />}>
        <Row label="Telefon" value={record.telefon} type="phone" />
        <Row label="Mobil" value={record.mobil} type="phone" />
        <Row label="E-mail" value={record.email} type="email" />
      </Section>

      {/* Location */}
      <Section title="Helyszín" icon={<MapPin className="h-4 w-4" />}>
        <Row label="Cím" value={cim} />
        <Row label="Irányítószám" value={record.irszam} />
      </Section>

      {/* Meter */}
      <Section title="Mérő adatok" icon={<Gauge className="h-4 w-4" />}>
        <Row label="Készülékhely" value={record.keszulekhely} />
        <Row label="Mérő fajta" value={record.meroFajta} highlight={meroColor} />
        <Row label="Gyári szám" value={record.gyariSzam} />
        <Row label="Hitelesítés éve" value={record.hitelesitesEve} />
        <Row label="Átmérő (DN)" value={record.atmero} />
        <Row label="Típus" value={record.anyagszamMegnevezese} />
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b text-blue-600">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</span>
        </div>
        <div className="divide-y">{children}</div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, type, highlight }: { label: string; value: string; type?: "phone" | "email"; highlight?: string }) {
  return (
    <div className="flex items-center px-4 py-2.5 gap-4">
      <span className="text-sm text-slate-500 w-36 flex-shrink-0">{label}</span>
      {value ? (
        <span className={`text-sm flex-1 ${highlight ?? "text-slate-900"}`}>{value}</span>
      ) : (
        <span className="text-sm text-slate-300 flex-1">–</span>
      )}
      {type === "phone" && value && (
        <a href={`tel:${value}`} className="text-green-600 hover:text-green-700">
          <Phone className="h-3.5 w-3.5" />
        </a>
      )}
      {type === "email" && value && (
        <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-700">
          <Mail className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
