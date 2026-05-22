export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const TYPE_LABELS: Record<string, string> = {
  CSERE: "Csere",
  UJRAINDITAS: "Újraindítás",
  UJ_SZERZODES: "Új szerződés",
  KIEPITES: "Kiépítés",
};

function fmt(date: string) {
  return new Date(date).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
}

function buildHtml(dateStr: string, workers: {
  name: string;
  appts: {
    date: string; endDate: string | null; type: string; name: string;
    phone: string; address: string; locationId: string; quantity: number; price: number; notes: string;
  }[];
}[]) {
  const workerSections = workers.map(({ name, appts }) => {
    const total = appts.reduce((s, a) => s + a.price, 0);
    const rows = appts.map(a => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #333;white-space:nowrap;color:#94a3b8">
          ${fmt(a.date)}${a.endDate ? ` – ${fmt(a.endDate)}` : ""}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #333;color:#e2e8f0">${TYPE_LABELS[a.type] ?? a.type}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #333;color:#e2e8f0">${a.name || "–"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #333;color:#e2e8f0">${a.address || "–"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #333;color:#e2e8f0">${a.phone || "–"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #333;color:#e2e8f0">${a.locationId || "–"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #333;color:#e2e8f0;text-align:right">${a.quantity} db</td>
        <td style="padding:8px 12px;border-bottom:1px solid #333;color:#e2e8f0;text-align:right">${a.price.toLocaleString("hu-HU")} Ft</td>
        <td style="padding:8px 12px;border-bottom:1px solid #333;color:#94a3b8">${a.notes || ""}</td>
      </tr>`).join("");

    const tableOrEmpty = appts.length === 0
      ? `<p style="color:#94a3b8;padding:16px;margin:0">Ezen a napon nem volt időpont.</p>`
      : `<table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#334155">
              <th style="padding:10px 12px;text-align:left;color:#94a3b8;font-weight:600">Időpont</th>
              <th style="padding:10px 12px;text-align:left;color:#94a3b8;font-weight:600">Típus</th>
              <th style="padding:10px 12px;text-align:left;color:#94a3b8;font-weight:600">Ügyfél</th>
              <th style="padding:10px 12px;text-align:left;color:#94a3b8;font-weight:600">Cím</th>
              <th style="padding:10px 12px;text-align:left;color:#94a3b8;font-weight:600">Telefon</th>
              <th style="padding:10px 12px;text-align:left;color:#94a3b8;font-weight:600">Készülékhely</th>
              <th style="padding:10px 12px;text-align:right;color:#94a3b8;font-weight:600">Db</th>
              <th style="padding:10px 12px;text-align:right;color:#94a3b8;font-weight:600">Ár</th>
              <th style="padding:10px 12px;text-align:left;color:#94a3b8;font-weight:600">Megjegyzés</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#334155">
              <td colspan="7" style="padding:10px 12px;color:#94a3b8;font-weight:600">Összesen</td>
              <td style="padding:10px 12px;text-align:right;color:#60a5fa;font-weight:700">${total.toLocaleString("hu-HU")} Ft</td>
              <td></td>
            </tr>
          </tfoot>
        </table>`;

    return `
      <div style="background:#1e293b;border-radius:12px;overflow:hidden;margin-bottom:24px">
        <div style="background:#334155;padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
          <span style="color:#e2e8f0;font-weight:700;font-size:15px">${name}</span>
          ${appts.length > 0 ? `<span style="color:#60a5fa;font-weight:600;font-size:13px">${appts.length} időpont</span>` : `<span style="color:#64748b;font-size:13px">Szabad nap</span>`}
        </div>
        ${tableOrEmpty}
      </div>`;
  }).join("");

  const grandTotal = workers.reduce((s, w) => s + w.appts.reduce((ss, a) => ss + a.price, 0), 0);
  const totalAppts = workers.reduce((s, w) => s + w.appts.length, 0);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif">
  <div style="max-width:960px;margin:0 auto;padding:32px 16px">
    <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:24px">
      <h1 style="margin:0 0 4px;color:#60a5fa;font-size:22px">Napi zárás</h1>
      <p style="margin:0;color:#94a3b8;font-size:14px">${dateStr} · ${totalAppts} időpont · ${grandTotal.toLocaleString("hu-HU")} Ft összesen</p>
    </div>
    ${workerSections}
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string })?.role;
  if (role === "READER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { date } = await req.json();
  const dateStr = date ?? new Date().toISOString().slice(0, 10);
  const from = new Date(dateStr + "T00:00:00");
  const to = new Date(dateStr + "T23:59:59");

  const workers = await prisma.worker.findMany({ orderBy: { name: "asc" } });
  const appointments = await prisma.appointment.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY nincs beállítva" }, { status: 500 });

  const recipientEmail = process.env.DAILY_CLOSE_EMAIL ?? "dobos.tamas@nemos.eu";

  const workerData = workers.map(worker => ({
    name: worker.name,
    appts: appointments
      .filter(a => a.workerId === worker.id)
      .map(a => ({
        date: a.date.toISOString(),
        endDate: a.endDate?.toISOString() ?? null,
        type: a.type,
        name: a.name,
        phone: a.phone,
        address: a.address,
        locationId: a.locationId,
        quantity: a.quantity,
        price: a.price,
        notes: a.notes,
      })),
  }));

  const localeDateStr = new Date(dateStr).toLocaleDateString("hu-HU", { dateStyle: "long" });
  const html = buildHtml(localeDateStr, workerData);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "HopTO <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Napi zárás – ${localeDateStr}`,
      html,
    }),
  });

  if (res.ok) {
    return NextResponse.json({ results: [{ worker: "Összefoglaló", ok: true }] });
  } else {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ results: [{ worker: "Összefoglaló", ok: false, error: JSON.stringify(err) }] });
  }
}
