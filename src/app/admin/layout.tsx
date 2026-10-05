import { eq } from "drizzle-orm";
import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { computeAllAlerts } from "@/lib/services/alerts";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("admin");
  const [reviews, payments, alerts] = await Promise.all([
    db.select({ id: s.applications.id }).from(s.applications).where(eq(s.applications.status, "submitted")),
    db.select({ id: s.paymentRequests.id }).from(s.paymentRequests).where(eq(s.paymentRequests.status, "approved")),
    computeAllAlerts(),
  ]);
  const openAlerts = alerts.filter((a) => !a.acked && a.severity !== "info").length;
  return (
    <AppShell
      portal="admin"
      user={user}
      orgName="TokenScore"
      counts={{ reviews: reviews.length, payments: payments.length, alerts: openAlerts }}
    >
      {children}
    </AppShell>
  );
}
