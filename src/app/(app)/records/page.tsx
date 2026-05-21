"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Upload, X, Phone, Mail, MapPin, Gauge, Loader2, ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
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
  const [records, setRecords] = useState<MeroRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [meroFajta, setMeroFajta] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MeroRecord | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [apptTarget, setApptTarget] = useState<MeroRecord | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) params.set("search", search);
    if (meroFajta && meroFajta !== "all") params.set("meroFajta", meroFajta);
    const res = await fetch(`/api/records?${params}`);
    const data = await res.json();
    setRecords(data.records ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [page, search, meroFajta]);

  useEffect(() => { fetch_(); }, [fetch_]);

  useEffect(() => { setPage(1); }, [search, meroFajta]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/records/import", { method: "POST", body: fd });
    const data = await res.json();
    setImporting(false);
    if (res.ok) {
      setImportMsg(`✓ ${data.imported} rekord importálva`);
      fetch_();
    } else {
      setImportMsg(`Hiba: ${data.error}`);
    }
    e.target.value = "";
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
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            <Button size="sm" variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="ml-1">Import</span>
            </Button>
          </div>
          {importMsg && <p className="text-xs text-slate-600">{importMsg}</p>}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-8 h-9"
              placeholder="Keresés..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={meroFajta} onValueChange={(v) => setMeroFajta(v ?? "all")}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Mérő fajta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Minden fajta</SelectItem>
              <SelectItem value="hideg">Hidegvíz</SelectItem>
              <SelectItem value="meleg">Melegvíz</SelectItem>
            </SelectContent>
          </Select>
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
              <p className="text-sm text-slate-500">KH: {record.fomeroKh}</p>
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
        <Row label="Készülékhely" value={record.keszulekhely} />
        <Row label="Cím" value={cim} />
        <Row label="Irányítószám" value={record.irszam} />
      </Section>

      {/* Meter */}
      <Section title="Mérő adatok" icon={<Gauge className="h-4 w-4" />}>
        <Row label="Mérő fajta" value={record.meroFajta} highlight={meroColor} />
        <Row label="Gyári szám" value={record.gyariSzam} />
        <Row label="Sorszám" value={record.sorszam} />
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
