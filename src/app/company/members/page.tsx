import { eq } from "drizzle-orm";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireCompanyMember } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { dateKo } from "@/lib/format";
import { InviteForm } from "./invite-form";

export const metadata = { title: "구성원" };

export default async function MembersPage() {
  const { company, user } = await requireCompanyMember("company");
  const members = await db.select().from(s.users).where(eq(s.users.companyId, company.id));
  members.sort((a, b) => (a.role === b.role ? a.createdAt.getTime() - b.createdAt.getTime() : a.role === "company" ? -1 : 1));

  return (
    <>
      <PageHeader
        title="구성원"
        description="구성원은 AI 비용을 보고 청구서 결제를 요청할 수 있습니다. 한도 신청과 결제 승인은 회사 관리자만 할 수 있습니다."
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SectionTitle aside={`${members.length}명`}>구성원 목록</SectionTitle>
          <Card className="py-0">
            <CardContent className="overflow-x-auto px-0">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>권한</TableHead>
                    <TableHead className="pr-5">추가한 날</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="pl-5">
                        <span className="font-medium">{m.name}</span>
                        {m.id === user.id && <span className="text-ink-soft"> (나)</span>}
                        <span className="block text-[12px] text-ink-soft">{m.title}</span>
                      </TableCell>
                      <TableCell className="text-ink-soft">{m.email}</TableCell>
                      <TableCell>
                        <Badge variant={m.role === "company" ? "money" : "neutral"}>{m.role === "company" ? "회사 관리자" : "사용자"}</Badge>
                      </TableCell>
                      <TableCell className="pr-5 text-ink-soft">{dateKo(m.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>구성원 초대</CardTitle>
            <CardDescription>초대한 구성원은 사용자 화면으로 들어옵니다. 시연용이라 임시 비밀번호가 바로 정해집니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
