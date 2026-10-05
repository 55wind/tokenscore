import Link from "next/link";
import { desc } from "drizzle-orm";
import { ClipboardCheckIcon } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Num } from "@/components/metrics";
import { GradeMark } from "@/components/score-meter";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { dateKo, krw } from "@/lib/format";
import { getNameMaps } from "@/lib/services/admin-queries";
import { RecommendationBadge } from "../_components/recommendation-badge";

export const metadata = { title: "심사" };

export default async function ReviewsPage() {
  await requireUser("admin");
  const [apps, names] = await Promise.all([db.select().from(s.applications).orderBy(desc(s.applications.createdAt)), getNameMaps()]);
  const pending = apps.filter((a) => a.status === "submitted");
  const decided = apps.filter((a) => a.status !== "submitted");

  return (
    <>
      <PageHeader
        title="심사"
        description="신청이 들어오면 시스템이 점수와 산정 한도를 먼저 계산합니다. 심사역은 공급사 데이터와 분류 결과를 확인하고 승인 한도를 정합니다."
      />

      <SectionTitle aside={`${pending.length}건`}>심사 대기</SectionTitle>
      {pending.length === 0 ? (
        <Empty className="border border-line bg-surface">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardCheckIcon />
            </EmptyMedia>
            <EmptyTitle>심사할 신청이 없습니다</EmptyTitle>
            <EmptyDescription>회사가 한도를 신청하면 여기에 바로 올라옵니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">기업</TableHead>
                <TableHead>신청일</TableHead>
                <TableHead className="text-right">신청 금액</TableHead>
                <TableHead className="text-right">산정 한도</TableHead>
                <TableHead>신청 시 점수</TableHead>
                <TableHead>시스템 의견</TableHead>
                <TableHead className="pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="pl-4">
                    <span className="font-semibold">{names.company.get(a.companyId) ?? a.companyId}</span>
                    <span className="block max-w-[28ch] truncate text-[12.5px] text-ink-soft">{a.purpose}</span>
                  </TableCell>
                  <TableCell>
                    <Num>{dateKo(a.createdAt)}</Num>
                  </TableCell>
                  <TableCell className="text-right">
                    <Num className="font-semibold">{krw(a.requestedAmount)}</Num>
                    <span className="block text-[12.5px] text-ink-soft">{a.termMonths}개월 상환</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Num className={a.requestedAmount > a.suggestedLimit ? "text-risk" : undefined}>{krw(a.suggestedLimit)}</Num>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <GradeMark grade={a.grade} />
                      <Num className="text-ink-soft">{a.score}점</Num>
                    </span>
                  </TableCell>
                  <TableCell>
                    <RecommendationBadge value={a.recommendation} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button asChild size="sm">
                      <Link href={`/admin/reviews/${a.id}`}>심사하기</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <SectionTitle className="mt-9" aside={`${decided.length}건`}>
        처리 내역
      </SectionTitle>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">기업</TableHead>
              <TableHead>결정일</TableHead>
              <TableHead>결과</TableHead>
              <TableHead className="text-right">신청 금액</TableHead>
              <TableHead className="text-right">승인 한도</TableHead>
              <TableHead>등급</TableHead>
              <TableHead className="pr-4">처리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {decided.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="pl-4">
                  <Link href={`/admin/reviews/${a.id}`} className="font-semibold underline-offset-4 hover:underline">
                    {names.company.get(a.companyId) ?? a.companyId}
                  </Link>
                </TableCell>
                <TableCell>
                  <Num>{dateKo(a.decidedAt)}</Num>
                </TableCell>
                <TableCell>
                  <StatusBadge kind="application" status={a.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Num>{krw(a.requestedAmount)}</Num>
                </TableCell>
                <TableCell className="text-right">
                  <Num>{a.approvedLimit ? krw(a.approvedLimit) : "-"}</Num>
                </TableCell>
                <TableCell>
                  <Num>
                    {a.grade}등급 {a.score}점
                  </Num>
                </TableCell>
                <TableCell className="pr-4 text-ink-soft">
                  {a.autoDecided ? "자동 승인" : a.decidedBy ? (names.user.get(a.decidedBy) ?? "심사역") : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
