"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarPlus, ChevronLeft, ChevronRight, Phone, MapPin, Loader2, Trash2, Pencil } from "lucide-react";
import AppointmentFormModal from "@/components/appointments/AppointmentFormModal";

interface Appointment {
  id: string;
  date: string;
  endDate?: string;
  type: string;
  name: string;
  phone: string;
  address: string;
  quantity: number;
  locationId: string;
  price: number;
  notes: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  CSERE:        { label: "Csere",        color: "bg-blue-100 text-blue-700" },
  UJRAINDITAS:  { label: "Újraindítás",  color: "bg-green-100 text-green-700" },
  UJ_SZERZODES: { label: "Új szerződés", color: "bg-orange-100 text-orange-700" },
  KIEPITES:     { label: "Kiépítés",     color: "bg-purple-100 text-purple-700" },
};

const DAYS_LONG = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];

function startOfDay(d: Date) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

export default function AppointmentsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "READER";
  const canEdit = role === "ADMIN" || role === "EDITOR";
  const [currentDay, setCurrentDay] = useState(() => startOfDay(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);

  const dayEnd = new Date(currentDay);
  dayEnd.setHours(23, 59, 59);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/appointments?from=${currentDay.toISOString()}&to=${dayEnd.toISOString()}`);
    const data = await res.json();
    setAppointments(data);
    setLoading(false);
  }, [currentDay]);

  useEffect(() => { load(); }, [load]);

  const today = new Date();

  async function deleteAppt(id: string) {
    await fetch(`/api/appointments?id=${id}`, { method: "DELETE" });
    load();
    if (selected?.id === id) setSelected(null);
  }

  const isToday = currentDay.toDateString() === today.toDateString();

  return (
    <div className="flex h-full">
      {/* Calendar panel */}
      <div className="flex-1 flex flex-col border-r">
        {/* Day nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(currentDay); d.setDate(d.getDate() - 1); setCurrentDay(d); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h2 className={`font-semibold ${isToday ? "text-blue-600" : "text-slate-700"}`}>
              {DAYS_LONG[currentDay.getDay()]}, {currentDay.getFullYear()}. {MONTHS[currentDay.getMonth()].toLowerCase()} {currentDay.getDate()}.
            </h2>
            {isToday && <span className="text-xs text-blue-500">Ma</span>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(currentDay); d.setDate(d.getDate() + 1); setCurrentDay(d); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day list */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <CalendarPlus className="h-10 w-10 mb-3" />
              <p className="text-sm">Nincs időpont erre a napra</p>
            </div>
          ) : (
            <div className="space-y-2">
              {appointments
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((a) => {
                  const t = TYPE_LABELS[a.type] ?? TYPE_LABELS.EGYEB;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className={`w-full text-left px-4 py-3 rounded-lg border ${t.color} ${selected?.id === a.id ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">
                          {new Date(a.date).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                          {a.endDate && ` – ${new Date(a.endDate).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}`}
                        </span>
                        <Badge className={`${t.color} border-0 text-xs`}>{t.label}</Badge>
                      </div>
                      <div className="font-medium text-sm mt-0.5">{a.name || "–"}</div>
                      {a.address && <div className="text-xs opacity-70 truncate mt-0.5">{a.address}</div>}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* New button */}
        {canEdit && (
          <div className="p-4 border-t bg-white">
            <Button onClick={() => setShowForm(true)} className="w-full">
              <CalendarPlus className="h-4 w-4 mr-2" />
              Új időpont
            </Button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="w-80 bg-white overflow-auto">
        {selected ? (
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <Badge className={`${TYPE_LABELS[selected.type]?.color} border-0`}>
                  {TYPE_LABELS[selected.type]?.label}
                </Badge>
                <p className="font-bold text-lg mt-2">{selected.name || "–"}</p>
                <p className="text-sm text-slate-500">
                  {new Date(selected.date).toLocaleString("hu-HU", { dateStyle: "long", timeStyle: "short" })}
                  {selected.endDate && ` – ${new Date(selected.endDate).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}`}
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditTarget(selected)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => deleteAppt(selected.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="divide-y border rounded-lg text-sm">
              {selected.phone && (
                <div className="flex items-center gap-3 px-3 py-2">
                  <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <a href={`tel:${selected.phone}`} className="text-green-600">{selected.phone}</a>
                </div>
              )}
              {selected.address && (
                <div className="flex items-start gap-3 px-3 py-2">
                  <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{selected.address}</span>
                </div>
              )}
              {selected.locationId && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-slate-500">Készülékhely</span>
                  <span className="font-medium text-slate-800">{selected.locationId}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-slate-500">Darabszám</span>
                <span className="font-medium text-slate-800">{selected.quantity} db</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-slate-500">Ár</span>
                <span className="font-medium text-slate-800">{selected.price.toLocaleString("hu-HU")} Ft</span>
              </div>
              {selected.notes && (
                <div className="px-3 py-2">
                  <p className="text-slate-500 text-xs mb-1">Megjegyzés</p>
                  <p className="text-slate-700">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
            <CalendarPlus className="h-10 w-10 mb-3" />
            <p className="text-sm text-center">Kattints egy időpontra a részletekért</p>
          </div>
        )}
      </div>

      {showForm && (
        <AppointmentFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
      {editTarget && (
        <AppointmentFormModal
          editData={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load(); }}
        />
      )}
    </div>
  );
}
