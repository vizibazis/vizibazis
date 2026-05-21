export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "dobos.tamas@nemos.eu" },
    });
    if (!user) return NextResponse.json({ error: "user not found" });

    const valid = await bcrypt.compare("Neuromancer1974", user.password ?? "");
    return NextResponse.json({
      found: true,
      hasPassword: !!user.password,
      passwordValid: valid,
      role: user.role,
      passwordPrefix: user.password?.slice(0, 10),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
