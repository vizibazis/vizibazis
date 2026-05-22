"use client";

import { useState, useEffect, useCallback, useRef, type RefObject } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  workerId?: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string; border: string }> = {
  CSERE:        { label: "Csere",        color: "bg-blue-950/80 text-blue-300",   border: "border-blue-700" },
  UJRAINDITAS:  { label: "Újraindítás",  color: "bg-green-950/80 text-green-300", border: "border-green-700" },
  UJ_SZERZODES: { label: "Új szerződés", color: "bg-orange-950/80 text-orange-300", border: "border-orange-700" },
  KIEPITES:     { label: "Kiépítés",     color: "bg-purple-950/80 text-purple-300", border: "border-purple-700" },
};

const DAYS_LONG = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
const MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];

const START_HOUR = 7;
const END_HOUR = 20;
const SLOT_HEIGHT = 48; // px per 30 min

function startOfDay(d: Date) {
  const s = new Date(d); s.setHours(0, 0, 0, 0); return s;
}

function minutesFromStart(date: Date) {
  return (date.getHours() - START_HOUR) * 60 + date.getMinutes();
}

function apptStyle(appt: Appointment) {
  const start = new Date(appt.date);
  const end = appt.endDate ? new Date(appt.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
  const topMin = minutesFromStart(start);
  const heightMin = (end.getTime() - start.getTime()) / 60000;
  return {
    top: Math.max(0, (topMin / 30) * SLOT_HEIGHT),
    height: Math.max(SLOT_HEIGHT, (heightMin / 30) * SLOT_HEIGHT),
  };
}

const totalSlots = (END_HOUR - START_HOUR) * 2;
const slots: string[] = [];
for (let h = START_HOUR; h < END_HOUR; h++) {
  slots.push(`${String(h).padStart(2, "0")}:00`);
  slots.push(`${String(h).padStart(2, "0")}:30`);
}
slots.push(`${String(END_HOUR).padStart(2, "0")}:00`);

function CurrentTimeLine({ scrollRef }: { scrollRef: RefObject<HTMLDivElement> }) {
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    function update() {
      const now = new Date();
      const min = minutesFromStart(now);
      if (min >= 0 && min <= (END_HOUR - START_HOUR) * 60) {
        setTop((min / 30) * SLOT_HEIGHT);
      } else {
        setTop(null);
      }
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (top !== null && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, top - 120);
    }
  }, [top]);

  if (top === null) return null;
  return (
    <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top }}>
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
        <div className="flex-1 border-t border-red-500" />
      </div>
    </div>
  );
}

export default function WorkerAppointmentsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const workerId = params.workerId as string;
  const role = (session?.user as { role?: string })?.role ?? "READER";
  const canEdit = role === "ADMIN" || role === "EDITOR";
  const [currentDay, setCurrentDay] = useState(() => startOfDay(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayEnd = new Date(currentDay);
  dayEnd.setHours(23, 59, 59);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/appointments?from=${currentDay.toISOString()}&to=${dayEnd.toISOString()}&workerId=${workerId}`
    );
    const data = await res.json();
    setAppointments(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [currentDay, workerId]);

  useEffect(() => { load(); }, [load]);

  const today = new Date();
  const isToday = currentDay.toDateString() === today.toDateString();

  async function deleteAppt(id: string) {
    await fetch(`/api/appointments?id=${id}`, { method: "DELETE" });
    load();
    if (selected?.id === id) setSelected(null);
  }

  const gridHeight = totalSlots * SLOT_HEIGHT;

  return (
    <div className="flex h-full">
      {/* Calendar panel */}
      <div className="flex-1 flex flex-col border-r min-w-0">
        {/* Day nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(currentDay); d.setDate(d.getDate() - 1); setCurrentDay(d); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h2 className={`font-semibold text-sm ${isToday ? "text-blue-400" : "text-foreground"}`}>
              {DAYS_LONG[currentDay.getDay()]}, {currentDay.getFullYear()}. {MONTHS[currentDay.getMonth()].toLowerCase()} {currentDay.getDate()}.
            </h2>
            {isToday && <span className="text-xs text-blue-500">Ma</span>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(currentDay); d.setDate(d.getDate() + 1); setCurrentDay(d); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Time grid */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="flex" style={{ minHeight: gridHeight + SLOT_HEIGHT }}>
              {/* Time column */}
              <div className="w-14 flex-shrink-0 border-r select-none">
                {slots.map((slot, i) => (
                  <div
                    key={slot}
                    className="flex items-start justify-end pr-2"
                    style={{ height: i < slots.length - 1 ? SLOT_HEIGHT : 0 }}
                  >
                    <span className={`text-xs -mt-2 ${slot.endsWith(":00") ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                      {slot.endsWith(":00") ? slot : ""}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grid + events */}
              <div className="flex-1 relative" style={{ height: gridHeight }}>
                {/* Grid lines */}
                {slots.slice(0, -1).map((slot, i) => (
                  <div
                    key={slot}
                    className={`absolute left-0 right-0 border-t ${slot.endsWith(":00") ? "border-border/60" : "border-border/20"}`}
                    style={{ top: i * SLOT_HEIGHT }}
                  />
                ))}

                {/* Current time */}
                {isToday && <CurrentTimeLine scrollRef={scrollRef} />}

                {/* Appointments */}
                {appointments.map(a => {
                  const t = TYPE_LABELS[a.type] ?? TYPE_LABELS.CSERE;
                  const { top, height } = apptStyle(a);
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelected(a)}
                      style={{ top, height, position: "absolute", left: 4, right: 4 }}
                      className={`rounded-lg border-l-4 px-2 py-1 text-left overflow-hidden transition-all ${t.color} ${t.border} ${selected?.id === a.id ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-background" : "hover:brightness-110"}`}
                    >
                      <div className="text-xs font-bold leading-tight">
                        {new Date(a.date).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                        {a.endDate && ` – ${new Date(a.endDate).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}`}
                      </div>
                      {height >= SLOT_HEIGHT && (
                        <div className="text-xs font-medium truncate leading-tight mt-0.5 opacity-90">{a.name || "–"}</div>
                      )}
                      {height >= SLOT_HEIGHT * 2 && a.address && (
                        <div className="text-xs opacity-60 truncate leading-tight">{a.address}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* New button */}
        {canEdit && (
          <div className="p-3 border-t bg-card flex-shrink-0">
            <Button onClick={() => setShowForm(true)} className="w-full" size="sm">
              <CalendarPlus className="h-4 w-4 mr-2" />
              Új időpont
            </Button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="w-72 bg-card overflow-auto flex-shrink-0">
        {selected ? (
          <div className="p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <Badge className={`${TYPE_LABELS[selected.type]?.color} border-0 text-xs`}>
                  {TYPE_LABELS[selected.type]?.label}
                </Badge>
                <p className="font-bold mt-2">{selected.name || "–"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(selected.date).toLocaleString("hu-HU", { dateStyle: "long", timeStyle: "short" })}
                  {selected.endDate && ` – ${new Date(selected.endDate).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}`}
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTarget(selected)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400" onClick={() => deleteAppt(selected.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
            <div className="divide-y divide-border border border-border rounded-lg text-sm">
              {selected.phone && (
                <div className="flex items-center gap-3 px-3 py-2">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a href={`tel:${selected.phone}`} className="text-green-400">{selected.phone}</a>
                </div>
              )}
              {selected.address && (
                <div className="flex items-start gap-3 px-3 py-2">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{selected.address}</span>
                </div>
              )}
              {selected.locationId && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground">Készülékhely</span>
                  <span className="font-medium">{selected.locationId}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Darabszám</span>
                <span className="font-medium">{selected.quantity} db</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Ár</span>
                <span className="font-medium">{selected.price.toLocaleString("hu-HU")} Ft</span>
              </div>
              {selected.notes && (
                <div className="px-3 py-2">
                  <p className="text-muted-foreground text-xs mb-1">Megjegyzés</p>
                  <p>{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
            <CalendarPlus className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm text-center">Kattints egy időpontra a részletekért</p>
          </div>
        )}
      </div>

      {showForm && (
        <AppointmentFormModal
          workerId={workerId}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
      {editTarget && (
        <AppointmentFormModal
          workerId={workerId}
          editData={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load(); }}
        />
      )}
    </div>
  );
}
