import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CheckIcon, XIcon } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireCompanyMember } from "@/lib/auth/dal";
import { db, schema as s } from "@/lib/db";
import { dateKo, krw, pct } from "@/lib/format";
import { getLineSummary } from "@/lib/services/credit";
import { getCompanyScore } from "@/lib/services/scoring";
import { ApplyForm } from "./apply-form";

export const metadata = { title: "한도 신청" };

export default async function CreditPage() {
  const { company } = await requireCompanyMember("company");
  const [{ result, config, data }, line, apps] = await Promise.all([
    getCompanyScore(company.id),
    getLineSummary(company.id),
    db.select().from(s.applications).where(eq(s.applications.companyId, company.id)).orderBy(desc(s.applications.createdAt)),
  ]);
  const pending = apps.find((a) => a.status === "submitted");
  const bankConnected = data.connections.some((c) => c.category === "bank" && c.status === "connected");
  const scored = result.status === "scored";
  const checks = [
    { ok: scored, label: "유료 사용과 매출이 함께 있는 달 3개월 이상", fix: scored ? null : result.insufficientReason },
    { ok: bankConnected, label: "상환 계좌 연결", fix: bankConnected ? null : "데이터 연동에서 매출이 들어오는 계좌를 연결하세요." },
    { ok: !pending, label: "심사 중인 신청 없음", fix: pending ? "이전 신청의 심사가 끝난 뒤 다시 신청할 수 있습니다." : null },
  ];
  const canApply = checks.every((c) => c.ok);

  return (
    <>
      <PageHeader
        title="한도 신청"
        description="TokenScore로 산정한 한도 안에서 신청하면 심사역이 공급사 데이터를 확인한 뒤 승인합니다. 승인된 한도는 1년 동안 필요할 때마다 씁니다."
      />

      {line && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              지금 쓰고 있는 한도 <StatusBadge kind="line" status={line.line.status} />
            </CardTitle>
            <CardDescription>
              {line.line.partner} 제휴 상품입니다. {dateKo(line.line.approvedAt)} 승인, {dateKo(line.line.expiresAt)}까지 쓸 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-5 text-[13.5px] sm:grid-cols-4">
              <div>
                <dt className="text-ink-soft">승인 한도</dt>
                <dd className="num text-[20px] font-[720]">{krw(line.limit)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">남은 한도</dt>
                <dd className="num text-[20px] font-[720] text-money-strong">{krw(line.available)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">승인 당시 등급</dt>
                <dd className="text-[20px] font-[720]">
                  {line.line.grade}등급 <span className="num text-[13px] font-normal text-ink-soft">{line.line.score}점</span>
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">수수료, 상환 기간</dt>
                <dd className="num text-[20px] font-[720]">
                  {pct(line.line.feeRate)}, {line.line.termMonths}개월
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{line ? "한도 다시 신청" : "새로 신청"}</CardTitle>
            <CardDescription>
              {scored
                ? `지금 데이터로 산정한 한도는 ${krw(result.limit.amount)}입니다. ${result.grade}등급, 수수료 ${pct(result.feeRate)}가 적용됩니다.`
                : "점수가 나오면 신청할 수 있습니다."}
              {line ? " 새 한도가 승인되면 지금 한도는 닫히고, 남은 상환 일정은 그대로 이어집니다." : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canApply ? (
              <ApplyForm
                suggested={result.limit.amount}
                feeRate={result.feeRate}
                avgRevenue={result.kpis.avgRevenue3}
                defaultPurpose={result.flags.some((f) => f.message.includes("졸업 브릿지")) ? "정부 GPU 지원 종료 후 늘어나는 GPU·LLM 비용 선결제" : "LLM·GPU 클라우드 청구서 선결제"}
              />
            ) : (
              <ul className="flex flex-col gap-3 text-[13.5px]">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-2.5">
                    {c.ok ? (
                      <CheckIcon aria-label="충족" className="mt-0.5 size-4 shrink-0 text-money" />
                    ) : (
                      <XIcon aria-label="미충족" className="mt-0.5 size-4 shrink-0 text-risk" />
                    )}
                    <span>
                      <span className="font-medium">{c.label}</span>
                      {c.fix && <span className="block text-ink-soft">{c.fix}</span>}
                    </span>
                  </li>
                ))}
                {!bankConnected && (
                  <li>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/company/connections">계좌 연결하러 가기</Link>
                    </Button>
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>심사 기준</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-[13.5px] text-ink-soft">
            <p>
              한도 = min(최근 3개월 평균 유료 컴퓨트 × {config.computeMultiple} × 등급계수, 최근 3개월 평균 매출 × {config.revenueMultiple})
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>등급</TableHead>
                  <TableHead className="text-right">점수</TableHead>
                  <TableHead className="text-right">계수</TableHead>
                  <TableHead className="text-right">수수료</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(["A", "B", "C", "D", "E"] as const).map((g) => (
                  <TableRow key={g} className={scored && result.grade === g ? "bg-money-soft/60 font-semibold text-ink" : undefined}>
                    <TableCell>{g}</TableCell>
                    <TableCell className="num text-right">{g === "E" ? `${config.cutoffs.D} 미만` : `${config.cutoffs[g]} 이상`}</TableCell>
                    <TableCell className="num text-right">{config.coefficients[g].toFixed(2)}</TableCell>
                    <TableCell className="num text-right">{pct(config.feeRates[g])}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <SectionTitle className="mt-9">신청 내역</SectionTitle>
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          {apps.length ? (
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">신청일</TableHead>
                  <TableHead className="text-right">신청 금액</TableHead>
                  <TableHead className="text-right">산정 한도</TableHead>
                  <TableHead className="text-right">승인 한도</TableHead>
                  <TableHead>등급</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="pr-5">심사 의견</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="pl-5">{dateKo(a.createdAt)}</TableCell>
                    <TableCell className="num text-right">{krw(a.requestedAmount)}</TableCell>
                    <TableCell className="num text-right">{krw(a.suggestedLimit)}</TableCell>
                    <TableCell className="num text-right">{a.approvedLimit ? krw(a.approvedLimit) : "-"}</TableCell>
                    <TableCell>
                      {a.grade} <span className="num text-ink-soft">{a.score}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge kind="application" status={a.status} />
                    </TableCell>
                    <TableCell className="max-w-[280px] pr-5 text-[12.5px] whitespace-normal text-ink-soft">
                      {a.decisionNote ?? (a.status === "submitted" ? "심사역이 공급사 데이터를 확인하고 있습니다." : "-")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-5 py-6 text-[13.5px] text-ink-soft">아직 신청한 적이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
