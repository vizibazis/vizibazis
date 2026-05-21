"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HardHat } from "lucide-react";

interface Worker {
  id: string;
  name: string;
}

export default function WorkerNav() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/workers")
      .then(r => r.json())
      .then(d => Array.isArray(d) && setWorkers(d));
  }, []);

  if (workers.length === 0) return null;

  return (
    <div className="mt-1">
      <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Szerelők</p>
      <div className="space-y-0.5">
        {workers.map(w => (
          <Link key={w.id} href={`/appointments/${w.id}`}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === `/appointments/${w.id}`
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <HardHat className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{w.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
