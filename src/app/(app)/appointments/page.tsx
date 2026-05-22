"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Lock, CheckCircle2, AlertCircle, HardHat } from "lucide-react";

interface WorkerStatus {
  id: string;
  name: string;
  email: string;
  count: number;
}

const MONTHS = ["január","február","március","április","május","június","július","augusztus","szeptember","október","november","december"];

export default function AppointmentsPage() {
  const [view, setView] = useState<"none" | "status" | "close">("none");
  const [workers, setWorkers] = useState<WorkerStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [closeDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [closing, setClosing] = useState(false);
  const [closeResult, setCloseResult] = useState<{ worker: string; ok: boolean; error?: string }[] | null>(null);

  const today = new Date();
  const todayLabel = `${today.getFullYear()}. ${MONTHS[today.getMonth()]} ${today.getDate()}.`;

  async function loadStatus() {
    setLoading(true);
    const res = await fetch(`/api/appointments/status?date=${closeDate}`);
    const data = await res.json();
    setWorkers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    if (view === "status") loadStatus();
  }, [view]);

  async function handleClose() {
    setClosing(true);
    setCloseResult(null);
    const res = await fetch("/api/appointments/daily-close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: closeDate }),
    });
    const data = await res.json();
    setCloseResult(data.results ?? [{ worker: "–", ok: false, error: data.error }]);
    setClosing(false);
  }

  return (
    <div className="flex flex-col h-full p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">HopTO</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
      </div>

      <div className="flex gap-3 mb-8">
        <Button
          variant={view === "status" ? "default" : "outline"}
          onClick={() => setView(view === "status" ? "none" : "status")}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Státusz
        </Button>
        <Button
          variant={view === "close" ? "default" : "outline"}
          onClick={() => setView(view === "close" ? "none" : "close")}
          className="gap-2"
        >
          <Lock className="h-4 w-4" />
          Napi zárás
        </Button>
      </div>

      {/* Status view */}
      {view === "status" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Szerelők – {todayLabel}</h3>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-2">
              {workers.map(w => (
                <div
                  key={w.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                    w.count > 0
                      ? "border-blue-800 bg-blue-950/40"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${w.count > 0 ? "bg-blue-400" : "bg-muted-foreground/30"}`} />
                    <span className="font-medium text-foreground">{w.name}</span>
                  </div>
                  <span className={`text-sm font-semibold ${w.count > 0 ? "text-blue-400" : "text-muted-foreground"}`}>
                    {w.count > 0 ? `${w.count} időpont` : "Szabad"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Daily close view */}
      {view === "close" && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Napi zárás – {todayLabel}</h3>
          <p className="text-sm text-muted-foreground">
            Az összes szerelő mai időpontjait összefoglaló e-mailben elküldi a megadott e-mail címekre.
          </p>

          {!closeResult ? (
            <Button onClick={handleClose} disabled={closing} className="gap-2">
              {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {closing ? "Küldés..." : "Küldés megerősítése"}
            </Button>
          ) : (
            <div className="space-y-2">
              {closeResult.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${r.ok ? "border-green-800 bg-green-950/30" : "border-red-800 bg-red-950/30"}`}>
                  {r.ok
                    ? <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                    : <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  }
                  <span className="text-sm font-medium text-foreground">{r.worker}</span>
                  {!r.ok && <span className="text-xs text-red-400 ml-auto truncate max-w-xs">{r.error}</span>}
                  {r.ok && <span className="text-xs text-green-400 ml-auto">Elküldve</span>}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => { setCloseResult(null); }} className="mt-2">
                Újra küldés
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Default hint */}
      {view === "none" && (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
          <HardHat className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm">Válassz egy szerelőt a bal oldali listából,</p>
          <p className="text-sm">vagy használd a fenti gombokat.</p>
        </div>
      )}
    </div>
  );
}
