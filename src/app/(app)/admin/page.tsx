"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Trash2, Edit2, Loader2, ShieldCheck } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "EDITOR" | "READER";
  createdAt: string;
}

const ROLE_LABELS = { ADMIN: "Admin", EDITOR: "Szerkesztő", READER: "Olvasó" };
const ROLE_COLORS = { ADMIN: "bg-red-100 text-red-700", EDITOR: "bg-blue-100 text-blue-700", READER: "bg-slate-100 text-slate-600" };

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteUser(id: string) {
    if (!confirm("Biztosan törlöd ezt a felhasználót?")) return;
    await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-bold">Felhasználók kezelése</h1>
        </div>
        <Button onClick={() => { setEditUser(null); setShowForm(true); }}>
          <UserPlus className="h-4 w-4 mr-2" />
          Új felhasználó
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="divide-y">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                    {(u.name ?? u.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.name ?? "–"}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  <Badge className={`${ROLE_COLORS[u.role]} border-0 text-xs`}>
                    {ROLE_LABELS[u.role]}
                  </Badge>
                  <p className="text-xs text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString("hu-HU")}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditUser(u); setShowForm(true); }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => deleteUser(u.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <UserFormModal
          user={editUser}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function UserFormModal({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role ?? "READER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/users", {
      method: user ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user?.id, name, email, password: password || undefined, role }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      const d = await res.json();
      setError(d.error ?? "Hiba történt");
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{user ? "Felhasználó szerkesztése" : "Új felhasználó"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Név</label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="Teljes név" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" disabled={!!user} />
          </div>
          <div>
            <label className="text-sm font-medium">{user ? "Új jelszó (opcionális)" : "Jelszó"}</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1" placeholder={user ? "Hagyja üresen a megtartáshoz" : "Minimum 8 karakter"} />
          </div>
          <div>
            <label className="text-sm font-medium">Jogosultság</label>
            <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "EDITOR" | "READER")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin — teljes hozzáférés</SelectItem>
                <SelectItem value="EDITOR">Szerkesztő — import + módosítás</SelectItem>
                <SelectItem value="READER">Olvasó — csak megtekintés</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Mégse</Button>
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Mentés
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
