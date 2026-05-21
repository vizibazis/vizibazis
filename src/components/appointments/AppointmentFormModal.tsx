"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2 } from "lucide-react";

interface Prefill {
  name?: string;
  phone?: string;
  address?: string;
  locationId?: string;
}

interface EditData {
  id: string;
  date: string;
  endDate?: string;
  type: string;
  name: string;
  phone: string;
  address: string;
  locationId: string;
  quantity: number;
  price: number;
  notes: string;
}

interface Props {
  prefill?: Prefill;
  editData?: EditData;
  workerId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const TYPES = [
  { value: "CSERE",        label: "Csere",          color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "UJRAINDITAS",  label: "Újraindítás",    color: "bg-green-100 text-green-700 border-green-300" },
  { value: "UJ_SZERZODES", label: "Új szerződés",   color: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "KIEPITES",     label: "Kiépítés",       color: "bg-purple-100 text-purple-700 border-purple-300" },
];

export default function AppointmentFormModal({ prefill, editData, workerId, onClose, onSaved }: Props) {
  const isEdit = !!editData;
  const [type, setType] = useState(editData?.type ?? "CSERE");
  const [date, setDate] = useState(() => {
    if (editData?.date) return new Date(editData.date).toISOString().slice(0, 16);
    const d = new Date(); d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [endDate, setEndDate] = useState(() => {
    if (editData?.endDate) return new Date(editData.endDate).toISOString().slice(0, 16);
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [name, setName] = useState(editData?.name ?? prefill?.name ?? "");
  const [phone, setPhone] = useState(editData?.phone ?? prefill?.phone ?? "");
  const [address, setAddress] = useState(editData?.address ?? prefill?.address ?? "");
  const [locationId, setLocationId] = useState(editData?.locationId ?? prefill?.locationId ?? "");
  const [quantity, setQuantity] = useState(editData?.quantity ?? 1);
  const [price, setPrice] = useState(editData?.price ? String(editData.price) : "");
  const [notes, setNotes] = useState(editData?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/appointments", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editData?.id, date, endDate, type, name, phone, address, locationId, quantity, price: parseInt(price) || 0, notes, workerId: workerId ?? null }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Hiba történt");
      return;
    }
    setSaved(true);
    setTimeout(() => { onSaved(); }, 900);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Időpont szerkesztése" : "Új időpont"}</DialogTitle>
        </DialogHeader>

        {saved ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <p className="font-semibold text-lg">Mentve!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Időpont</label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="datetime-local" value={date} onChange={e => {
                  setDate(e.target.value);
                  // auto-set end to +1h if end hasn't been manually changed past start
                  const start = new Date(e.target.value);
                  const end = new Date(endDate);
                  if (end <= start) {
                    start.setHours(start.getHours() + 1);
                    setEndDate(start.toISOString().slice(0, 16));
                  }
                }} className="flex-1" />
                <span className="text-slate-400 text-sm flex-shrink-0">–</span>
                <Input type="time" value={endDate.slice(11, 16)} onChange={e => {
                  setEndDate(date.slice(0, 11) + e.target.value + ":00");
                }} className="w-28" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Típus</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${type === t.value ? t.color + " border-2" : "bg-white border-slate-200 text-slate-600"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Ügyfél neve</label>
                <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="Pl. Kiss János" />
              </div>
              <div>
                <label className="text-sm font-medium">Telefon</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" placeholder="+36 30..." />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Cím</label>
              <Input value={address} onChange={e => setAddress(e.target.value)} className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Helyazonosító</label>
                <Input value={locationId} onChange={e => setLocationId(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Darabszám</label>
                <div className="flex items-center gap-2 mt-1">
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</Button>
                  <span className="w-8 text-center font-bold">{quantity}</span>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(q => q + 1)}>+</Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Ár (Ft)</label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="mt-1" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium">Megjegyzés</label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Mégse</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Mentés
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
