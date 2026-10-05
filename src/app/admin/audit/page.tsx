import { desc } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { Num } from "@/components/metrics";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { dateTimeKo } from "@/lib/format";
import { getNameMaps } from "@/lib/services/admin-queries";

export const metadata = { title: "감사 로그" };

export default async function AuditPage() {
  await requireUser("admin");
  const [logs, names] = await Promise.all([db.select().from(s.auditLogs).orderBy(desc(s.auditLogs.createdAt)).limit(200), getNameMaps()]);
  return (
    <>
      <PageHeader title="감사 로그" description="연동 동의, 신청, 심사 결정, 결제 집행, 모델 변경까지 모든 처리를 시간순으로 남깁니다. 최근 200건입니다." />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">일시</TableHead>
              <TableHead>처리자</TableHead>
              <TableHead>기업</TableHead>
              <TableHead>작업</TableHead>
              <TableHead className="pr-4">내용</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="pl-4">
                  <Num className="text-ink-soft">{dateTimeKo(log.createdAt)}</Num>
                </TableCell>
                <TableCell>{log.actorName}</TableCell>
                <TableCell className="text-ink-soft">{log.companyId ? (names.company.get(log.companyId) ?? log.companyId) : "전체"}</TableCell>
                <TableCell className="font-medium">{log.action}</TableCell>
                <TableCell className="min-w-[24ch] pr-4 whitespace-normal text-ink-soft">{log.detail}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
