"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Loader2, BarChart2, CalendarClock } from "lucide-react";

interface Stats {
  total: number;
  expiryStats: { lejart: number; iden: number; jovrelejar: number; ervenyes: number };
  byTipus: { name: string; count: number }[];
  byMeroFajta: { name: string; count: number }[];
  byEv: { name: string; count: number }[];
  byHelyseg: { name: string; count: number }[];
}

interface ApptStats {
  total: number;
  byType: { type: string; count: number }[];
  byMonth: { month: string; count: number }[];
  totalRevenue: number;
  avgPrice: number;
}

interface Worker {
  id: string;
  name: string;
}

const TYPE_LABELS: Record<string, string> = {
  CSERE: "Csere", UJRAINDITAS: "Újraindítás", UJ_SZERZODES: "Új szerződés", KIEPITES: "Kiépítés"
};

export default function StatisticsPage() {
  const [tab, setTab] = useState<"lista" | "hopto">("lista");
  const [stats, setStats] = useState<Stats | null>(null);
  const [apptStats, setApptStats] = useState<ApptStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string>("");

  useEffect(() => {
    fetch("/api/workers")
      .then(r => r.json())
      .then(d => Array.isArray(d) && setWorkers(d));
  }, []);

  useEffect(() => {
    if (tab === "lista") {
      setLoading(true);
      fetch("/api/statistics")
        .then(r => r.json())
        .then(d => { setStats(d); setLoading(false); });
    } else {
      setLoading(true);
      const url = selectedWorker
        ? `/api/statistics/appointments?workerId=${selectedWorker}`
        : "/api/statistics/appointments";
      fetch(url)
        .then(r => r.json())
        .then(d => { setApptStats(d); setLoading(false); });
    }
  }, [tab, selectedWorker]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Tab selector + worker dropdown */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setTab("lista")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === "lista" ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
          >
            <BarChart2 className="h-4 w-4" />
            Lista statisztika
          </button>
          <button
            onClick={() => setTab("hopto")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === "hopto" ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
          >
            <CalendarClock className="h-4 w-4" />
            HopTO statisztika
          </button>
        </div>

        {tab === "hopto" && workers.length > 0 && (
          <select
            value={selectedWorker}
            onChange={e => setSelectedWorker(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Összes szerelő</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      ) : tab === "lista" && stats ? (
        <ListaStats stats={stats} />
      ) : apptStats ? (
        <HoptoStats stats={apptStats} />
      ) : null}
    </div>
  );
}

function ListaStats({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Összes rekord" value={stats.total} color="blue" />
        <StatCard title="Lejárt" value={stats.expiryStats.lejart} color="red" />
        <StatCard title="Idén jár le" value={stats.expiryStats.iden} color="orange" />
        <StatCard title="Érvényes" value={stats.expiryStats.ervenyes} color="green" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        {stats.byMeroFajta.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Mérő fajta</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.byMeroFajta} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={4}>
                    {stats.byMeroFajta.map((e, i) => (
                      <Cell key={i} fill={e.name.toLowerCase().includes("hideg") ? "#3b82f6" : "#f97316"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {stats.byEv.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Hitelesítés éve</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.byEv}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top helységek */}
      {stats.byHelyseg.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Top 10 helység</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.byHelyseg.slice(0, 10).map((h, i) => {
                const max = stats.byHelyseg[0]?.count ?? 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-5 text-right">{i + 1}.</span>
                    <span className="text-sm w-36 truncate">{h.name}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(h.count / max) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{h.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HoptoStats({ stats }: { stats: ApptStats }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Összes időpont" value={stats.total} color="blue" />
        <StatCard title="Bevétel" value={`${stats.totalRevenue.toLocaleString("hu-HU")} Ft`} color="green" />
        <StatCard title="Átl. ár" value={`${stats.avgPrice.toLocaleString("hu-HU")} Ft`} color="purple" />
        <StatCard title="Típusok" value={stats.byType.length} color="orange" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {stats.byType.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Típus szerinti megoszlás</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.byType.map(t => ({ ...t, name: TYPE_LABELS[t.type] ?? t.type }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {stats.byMonth.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Havi bontás</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.byMonth}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700", red: "bg-red-50 text-red-700",
    orange: "bg-orange-50 text-orange-700", green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <Card>
      <CardContent className={`p-4 text-center ${colors[color]}`}>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs mt-1 opacity-75">{title}</p>
      </CardContent>
    </Card>
  );
}
