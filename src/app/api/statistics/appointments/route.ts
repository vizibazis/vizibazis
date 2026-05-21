import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointments = await prisma.appointment.findMany({
    select: { type: true, price: true, date: true },
  });

  const total = appointments.length;
  const totalRevenue = appointments.reduce((s, a) => s + a.price, 0);
  const avgPrice = total ? Math.round(totalRevenue / total) : 0;

  const typeMap = new Map<string, number>();
  const monthMap = new Map<string, number>();

  for (const a of appointments) {
    typeMap.set(a.type, (typeMap.get(a.type) ?? 0) + 1);
    const key = `${a.date.getFullYear()}.${String(a.date.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }

  const byType = [...typeMap.entries()].map(([type, count]) => ({ type, count }));
  const byMonth = [...monthMap.entries()].sort().map(([month, count]) => ({ month, count }));

  return NextResponse.json({ total, totalRevenue, avgPrice, byType, byMonth });
}
