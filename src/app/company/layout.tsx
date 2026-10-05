import { and, eq } from "drizzle-orm";
import { AppShell } from "@/components/shell/app-shell";
import { requireCompanyMember } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";

export default async function CompanyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, company } = await requireCompanyMember("company");
  const pending = await db
    .select({ id: s.paymentRequests.id })
    .from(s.paymentRequests)
    .where(and(eq(s.paymentRequests.companyId, company.id), eq(s.paymentRequests.status, "requested")));
  return (
    <AppShell portal="company" user={user} orgName={company.name} counts={{ pay: pending.length }}>
      {children}
    </AppShell>
  );
}
