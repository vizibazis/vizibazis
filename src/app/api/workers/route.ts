export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workers = await prisma.worker.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(workers);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, name, email } = await req.json();
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  const worker = await prisma.worker.update({
    where: { id },
    data: { ...(name !== undefined && { name }), ...(email !== undefined && { email }) },
  });
  return NextResponse.json(worker);
}
