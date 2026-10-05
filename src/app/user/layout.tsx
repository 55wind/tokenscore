import { and, eq, inArray } from "drizzle-orm";
import { AppShell } from "@/components/shell/app-shell";
import { requireCompanyMember } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";

export default async function UserLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, company } = await requireCompanyMember("user");
  const open = await db
    .select({ id: s.paymentRequests.id })
    .from(s.paymentRequests)
    .where(and(eq(s.paymentRequests.requestedBy, user.id), inArray(s.paymentRequests.status, ["requested", "approved"])));
  return (
    <AppShell portal="user" user={user} orgName={company.name} counts={{ requests: open.length }}>
      {children}
    </AppShell>
  );
}
