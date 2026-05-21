import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = {
    name: session.user?.name,
    email: session.user?.email,
    role: (session.user as { role?: string })?.role ?? "READER",
  };

  return <AppShell user={user}>{children}</AppShell>;
}
