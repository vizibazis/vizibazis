"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarPlus, ChevronLeft, ChevronRight, Phone, MapPin, Loader2, Trash2, Edit2 } from "lucide-react";
import AppointmentFormModal from "@/components/appointments/AppointmentFormModal";

interface Appointment {
  id: string;
  date: string;
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
  CSERE:   { label: "Csere",      color: "bg-blue-100 text-blue-700" },
  LEOLVAS: { label: "Leolvasás",  color: "bg-green-100 text-green-700" },
  VIZSGAL: { label: "Vizsgálat",  color: "bg-orange-100 text-orange-700" },
  EGYEB:   { label: "Egyéb",      color: "bg-slate-100 text-slate-600" },
};

const DAYS = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];
const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function AppointmentsPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/appointments?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`);
    const data = await res.json();
    setAppointments(data);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const dayAppointments = (day: Date) =>
    appointments.filter((a) => {
      const d = new Date(a.date);
      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
    });

  const today = new Date();

  async function deleteAppt(id: string) {
    await fetch(`/api/appointments?id=${id}`, { method: "DELETE" });
    load();
    if (selected?.id === id) setSelected(null);
  }

  return (
    <div className="flex h-full">
      {/* Calendar panel */}
      <div className="flex-1 flex flex-col border-r">
        {/* Week nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold text-slate-700">
            {MONTHS[weekStart.getMonth()]} {weekStart.getDate()} – {weekEnd.getDate()}, {weekStart.getFullYear()}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Week grid */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, i) => {
                const isToday = day.toDateString() === today.toDateString();
                const appts = dayAppointments(day);
                return (
                  <div key={i} className="min-h-32">
                    <div className={`text-center py-1.5 rounded-lg mb-1 text-sm font-medium ${isToday ? "bg-blue-600 text-white" : "text-slate-500"}`}>
                      <div className="text-xs">{DAYS[i]}</div>
                      <div className={`text-lg font-bold ${isToday ? "" : "text-slate-800"}`}>{day.getDate()}</div>
                    </div>
                    <div className="space-y-1">
                      {appts.map((a) => {
                        const t = TYPE_LABELS[a.type] ?? TYPE_LABELS.EGYEB;
                        return (
                          <button
                            key={a.id}
                            onClick={() => setSelected(a)}
                            className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-medium ${t.color} ${selected?.id === a.id ? "ring-2 ring-blue-500" : ""}`}
                          >
                            <div>{new Date(a.date).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}</div>
                            <div className="truncate">{a.name || t.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* New button */}
        <div className="p-4 border-t bg-white">
          <Button onClick={() => setShowForm(true)} className="w-full">
            <CalendarPlus className="h-4 w-4 mr-2" />
            Új időpont
          </Button>
        </div>
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
                </p>
              </div>
              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => deleteAppt(selected.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {selected.phone && (
              <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-sm text-green-600">
                <Phone className="h-4 w-4" />{selected.phone}
              </a>
            )}
            {selected.address && (
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />{selected.address}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{selected.quantity}</p>
                <p className="text-xs text-slate-500">darab</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{selected.price.toLocaleString("hu-HU")}</p>
                <p className="text-xs text-slate-500">Ft</p>
              </div>
            </div>
            {selected.notes && <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selected.notes}</p>}
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
    </div>
  );
}
