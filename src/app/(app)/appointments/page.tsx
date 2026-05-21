"use client";

import { HardHat } from "lucide-react";

export default function AppointmentsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <HardHat className="h-12 w-12 mb-4 opacity-40" />
      <p className="text-sm">Válassz egy szerelőt a bal oldali listából</p>
    </div>
  );
}
