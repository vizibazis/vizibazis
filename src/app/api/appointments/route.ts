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

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { date: "asc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const userId = (session.user as { id?: string })?.id;

  const appointment = await prisma.appointment.create({
    data: {
      date: new Date(body.date),
      type: body.type ?? "CSERE",
      name: body.name ?? "",
      phone: body.phone ?? "",
      address: body.address ?? "",
      quantity: body.quantity ?? 1,
      locationId: body.locationId ?? "",
      price: body.price ?? 0,
      notes: body.notes ?? "",
      createdBy: userId,
    },
  });

  return NextResponse.json(appointment);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { ...data, date: new Date(data.date) },
  });

  return NextResponse.json(appointment);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
