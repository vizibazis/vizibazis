"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  List,
  BarChart2,
  CalendarClock,
  LogOut,
  Droplets,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface AppShellProps {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; role?: string };
}

const navItems = [
  { href: "/records", label: "Lista", icon: List },
  { href: "/statistics", label: "Statisztika", icon: BarChart2 },
  { href: "/appointments", label: "HopTO", icon: CalendarClock },
];

export default function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-60 bg-white border-r flex flex-col">
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          <Droplets className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-blue-700">Vizibázis</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </div>
            </Link>
          ))}

          {user.role === "ADMIN" && (
            <Link href="/admin">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </div>
            </Link>
          )}
        </nav>

        <div className="p-3 border-t relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name ?? user.email}</p>
              <p className="text-xs text-slate-400">
                {user.role === "ADMIN" ? "Admin" : user.role === "EDITOR" ? "Szerkesztő" : "Olvasó"}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute bottom-14 left-3 right-3 bg-white border rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Kijelentkezés
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
