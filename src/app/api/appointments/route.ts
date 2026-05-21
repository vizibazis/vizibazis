export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const workerId = searchParams.get("workerId");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }
  if (workerId) where.workerId = workerId;

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { date: "asc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json(appointments);
}

async function checkOverlap(startTime: Date, endTime: Date, workerId?: string, excludeId?: string) {
  return prisma.appointment.findFirst({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      ...(workerId ? { workerId } : {}),
      date: { lt: endTime },
      OR: [
        { endDate: { gt: startTime } },
        { endDate: null, date: { gt: new Date(startTime.getTime() - 60 * 60 * 1000) } },
      ],
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string })?.role;
  if (role === "READER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const userId = (session.user as { id?: string })?.id;

  const startTime = new Date(body.date);
  const endTime = body.endDate ? new Date(body.endDate) : new Date(startTime.getTime() + 60 * 60 * 1000);
  const overlap = await checkOverlap(startTime, endTime, body.workerId ?? undefined);
  if (overlap) return NextResponse.json({ error: "Ebben az időben már dolgozik a szerelő!" }, { status: 409 });

  const appointment = await prisma.appointment.create({
    data: {
      date: new Date(body.date),
      endDate: body.endDate ? new Date(body.endDate) : null,
      type: body.type ?? "CSERE",
      name: body.name ?? "",
      phone: body.phone ?? "",
      address: body.address ?? "",
      quantity: body.quantity ?? 1,
      locationId: body.locationId ?? "",
      price: body.price ?? 0,
      notes: body.notes ?? "",
      createdBy: userId,
      workerId: body.workerId ?? null,
    },
  });

  return NextResponse.json(appointment);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string })?.role;
  if (role === "READER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  const startTime = new Date(data.date);
  const endTime = data.endDate ? new Date(data.endDate) : new Date(startTime.getTime() + 60 * 60 * 1000);
  const overlap = await checkOverlap(startTime, endTime, data.workerId ?? undefined, id);
  if (overlap) return NextResponse.json({ error: "Ebben az időben már dolgozik a szerelő!" }, { status: 409 });

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { ...data, date: new Date(data.date), endDate: data.endDate ? new Date(data.endDate) : null },
  });

  return NextResponse.json(appointment);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string })?.role;
  if (role === "READER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
