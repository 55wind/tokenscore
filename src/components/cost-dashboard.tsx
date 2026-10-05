import { eq } from "drizzle-orm";
import { CostTrendChart, DailyCostChart } from "@/components/charts";
import { Delta, Num, Stat, StatRow, UsageMeter } from "@/components/metrics";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db, schema as s } from "@/lib/db";
import { krw, num, pct } from "@/lib/format";
import { monthLabel } from "@/lib/months";
import { getCostDashboard, type CostLine } from "@/lib/services/insights";
import { cn } from "@/lib/utils";

const KIND_BADGE: Record<CostLine["kind"], { label: string; variant: "compute" | "neutral" | "caution" }> = {
  llm: { label: "LLM", variant: "compute" },
  inference: { label: "추론", variant: "compute" },
  training: { label: "학습", variant: "neutral" },
  covered: { label: "지원·크레딧", variant: "neutral" },
  ambiguous: { label: "판별 필요", variant: "caution" },
};

/**
 * AI 비용 대시보드 (무료 기능). 사용자 포털과 회사 포털이 함께 씁니다.
 * 심사와 달리 실제로 나간 돈을 모두 보여 주고, 심사에서 빠지는 사용분은 따로 표시합니다.
 */
export async function CostDashboard({ companyId, showRevenue = false }: { companyId: string; showRevenue?: boolean }) {
  const [dash, [company]] = await Promise.all([
    getCostDashboard(companyId),
    db.select().from(s.companies).where(eq(s.companies.id, companyId)).limit(1),
  ]);
  const { asOf, trend, lines, last, totalSpend, prevSpend, daily, kpis } = dash;
  const spendDelta = prevSpend > 0 ? totalSpend / prevSpend - 1 : 0;

  // 이번 달 예상 지출: 지난달 지출에 최근 사용량 성장률을 반영합니다.
  const growth = Math.max(-0.3, Math.min(0.3, kpis.usageGrowth));
  const projected = Math.round(totalSpend * (1 + growth));
  const budget = company?.monthlyBudget ?? null;
  const overBudget = budget !== null && projected > budget;

  return (
    <div className="flex flex-col gap-5">
      <StatRow>
        <Stat
          lead
          label={`${monthLabel(asOf, true)} 지출`}
          value={krw(totalSpend)}
          tone="compute"
          sub={
            <span className="inline-flex items-center gap-1.5">
              전월 대비 <Delta ratio={spendDelta} goodWhenUp={false} />
            </span>
          }
        />
        <Stat label="LLM API" value={krw(last.llm)} />
        <Stat label="추론 GPU" value={krw(last.inference)} />
        <Stat label="학습·기타 GPU" value={krw(last.training)} sub="심사 제외" />
        <Stat label="지원·크레딧으로 충당" value={krw(last.covered)} sub="회사가 내지 않은 금액" />
      </StatRow>

      {showRevenue && (
        <StatRow>
          <Stat label="컴퓨트 1원당 매출" value={`${num(kpis.computeEfficiency, 2)}원`} tone="money" sub="최근 3개월 평균" />
          {kpis.revenuePerMTokens !== null && <Stat label="토큰 100만 개당 매출" value={krw(kpis.revenuePerMTokens)} />}
          {kpis.revenuePerGpuHour !== null && <Stat label="추론 GPU 1시간당 매출" value={krw(kpis.revenuePerGpuHour)} />}
          {kpis.gpuUtilization !== null && <Stat label="추론 GPU 가동률" value={pct(kpis.gpuUtilization, 0)} />}
        </StatRow>
      )}

      {budget !== null && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>이번 달 예산</CardTitle>
            <CardDescription>
              지난달 지출에 최근 사용량 증가율 {pct(growth)}를 반영한 예상치입니다.
            </CardDescription>
            <CardAction>
              {overBudget ? <Badge variant="risk">예산 초과 예상</Badge> : <Badge variant="neutral">예산 안</Badge>}
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13.5px]">
              <span className="text-ink-soft">
                예상 지출 <Num className={cn("text-[17px] font-semibold text-ink", overBudget && "text-risk")}>{krw(projected)}</Num>
              </span>
              <span className="text-ink-soft">
                예산 <Num className="font-medium text-ink">{krw(budget)}</Num>
              </span>
            </div>
            <UsageMeter value={projected} max={budget} tone={overBudget ? "risk" : "compute"} label="이번 달 예산 대비 예상 지출" />
            {overBudget && (
              <p className="text-[13px] text-ink-soft">
                예산보다 {krw(projected - budget)} 더 나갈 전망입니다. 절감 제안을 확인하거나 Compute Pay로 결제 시점을 늦출 수 있습니다.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>월별 컴퓨트 지출</CardTitle>
            <CardDescription>최근 12개월. 학습·기타 GPU는 심사에서 빠지지만 지출에는 포함됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <CostTrendChart data={trend.map((t) => ({ month: t.month, llm: t.llm, inference: t.inference, training: t.training }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>최근 30일 일별 지출</CardTitle>
            <CardDescription>
              {monthLabel(asOf)}까지는 공급사 사용 기록, 이번 달은 사용량 추세로 계산한 추정치입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DailyCostChart data={daily} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>항목별 비용</CardTitle>
          <CardDescription>{monthLabel(asOf, true)} 공급사 청구 기준. 큰 금액부터 정렬했습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="sm:min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>항목</TableHead>
                <TableHead className="hidden sm:table-cell">구분</TableHead>
                <TableHead className="hidden sm:table-cell">사용량</TableHead>
                <TableHead className="text-right">이번 달</TableHead>
                <TableHead className="text-right">전월 대비</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const badge = KIND_BADGE[line.kind];
                return (
                  <TableRow key={line.key}>
                    <TableCell className="max-w-[180px] whitespace-normal sm:max-w-[280px] sm:whitespace-nowrap">
                      <p className="font-medium text-ink sm:truncate">{line.label}</p>
                      <p className="text-[12.5px] text-ink-soft sm:truncate">{line.sub}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-ink-soft sm:hidden">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span>{line.usage}</span>
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-[13px] text-ink-soft sm:table-cell">{line.usage}</TableCell>
                    <TableCell className="text-right">
                      <Num className="font-medium">{krw(line.cost)}</Num>
                    </TableCell>
                    <TableCell className="text-right">
                      {line.prevCost > 0 ? (
                        <Delta ratio={line.cost / line.prevCost - 1} goodWhenUp={false} />
                      ) : (
                        <span className="text-[12.5px] text-ink-soft">신규</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
