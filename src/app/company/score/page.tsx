import { PageHeader, SectionTitle } from "@/components/page-header";
import { GradeMark, ScoreMeter } from "@/components/score-meter";
import { CostTrendChart } from "@/components/charts";
import { Num } from "@/components/metrics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireCompanyMember } from "@/lib/auth/dal";
import { hours, krw, num, pct, tokens } from "@/lib/format";
import { monthLabel, monthsEnding, shortMonthLabel } from "@/lib/months";
import { getCompanyScore } from "@/lib/services/scoring";

export const metadata = { title: "TokenScore 리포트" };

const TIPS: Record<string, string> = {
  efficiency: "매출로 이어지지 않는 추론 호출을 줄이고, 놀고 있는 GPU를 정리하면 효율 점수가 오릅니다.",
  growth: "유료 사용량이 꾸준히 늘면 오릅니다. 단가가 내려가도 사용량 기준으로 계산하므로 불리하지 않습니다.",
  stability: "서빙을 끊김 없이 유지하고, 사용량이 한 달에 크게 출렁이지 않으면 오릅니다.",
  business: "고객 리텐션과 매출총이익률이 핵심입니다. 컴퓨트 원가가 매출의 절반을 넘지 않게 관리하세요.",
  concentration: "LLM이나 GPU를 한 공급사에만 의존하면 깎입니다. 두 곳 이상으로 나누면 오릅니다.",
};

export default async function ScoreReportPage() {
  const { company } = await requireCompanyMember("company");
  const { result, config, asOf } = await getCompanyScore(company.id);
  const scored = result.status === "scored";
  const months3 = monthsEnding(asOf, 3);
  const recentWorkloads = result.workloads.filter((w) => months3.includes(w.month));

  return (
    <>
      <PageHeader
        title="TokenScore 리포트"
        description={`${monthLabel(asOf, true)}까지 공급사 청구 데이터로 계산했습니다. 점수가 왜 이렇게 나왔는지, 무엇을 뺐는지 모두 보여 드립니다.`}
      />

      <Card>
        <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
          <div className="flex items-center gap-4 lg:w-60 lg:shrink-0">
            <GradeMark grade={scored ? result.grade : "-"} className="size-12 text-2xl" />
            <div>
              <p className="text-6xl leading-none font-medium tracking-[-0.04em]">{scored ? result.score : "보류"}</p>
              <p className="mt-1 text-sm text-ink-soft">{scored ? `1000점 만점, 등급계수 ${num(result.coefficient, 2)}` : result.insufficientReason}</p>
            </div>
          </div>
          <ScoreMeter className="flex-1" score={scored ? result.score : 0} grade={result.grade} cutoffs={config.cutoffs} muted={!scored} />
        </CardContent>
      </Card>

      <SectionTitle className="mt-9">점수 구성</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {result.subScores.map((sub) => (
          <Card key={sub.key} size="sm">
            <CardHeader>
              <CardTitle className="flex items-baseline justify-between gap-3">
                <span>
                  {sub.label} <span className="text-xs font-normal text-ink-soft">비중 {pct(sub.weight, 0)}</span>
                </span>
                <span className="num text-sm font-medium text-ink-soft">
                  <span className="text-xl font-semibold text-ink">{sub.score}</span> / 100, {sub.points}점 반영
                </span>
              </CardTitle>
              <CardDescription>{TIPS[sub.key]}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col text-sm">
                {sub.metrics.map((m) => (
                  <div key={m.label} className="flex items-baseline justify-between gap-3 border-t border-line/70 py-2">
                    <dt className="text-ink-soft">
                      {m.label}
                      {m.note && <span className="block text-xs">{m.note}</span>}
                    </dt>
                    <dd className="num shrink-0 font-semibold">{m.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
        <Card size="sm">
          <CardHeader>
            <CardTitle>가점</CardTitle>
            <CardDescription>정부 지원 사업 선정과 투자 유치는 외부에서 검증받은 신호로 따로 더합니다.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {result.bonusPoints.length ? (
              result.bonusPoints.map((b) => (
                <div key={b.label} className="flex justify-between border-t border-line/70 py-2">
                  <span>{b.label}</span>
                  <Num className="font-semibold text-ink">+{b.points}</Num>
                </div>
              ))
            ) : (
              <p className="text-ink-soft">해당 사항이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <SectionTitle className="mt-9">한도 계산</SectionTitle>
      <Card>
        <CardContent className="grid gap-5 text-sm md:grid-cols-3">
          <div>
            <p className="text-ink-soft">컴퓨트 기준</p>
            <p className="num text-xl font-semibold">{krw(result.limit.byCompute)}</p>
            <p className="text-xs text-ink-soft">
              평균 유료 컴퓨트 {krw(result.kpis.avgCompute3)} × {config.computeMultiple} × 계수 {num(result.coefficient, 2)}
            </p>
          </div>
          <div>
            <p className="text-ink-soft">매출 기준 (상한)</p>
            <p className="num text-xl font-semibold">{krw(result.limit.byRevenue)}</p>
            <p className="text-xs text-ink-soft">
              평균 매출 {krw(result.kpis.avgRevenue3)} × {config.revenueMultiple}
            </p>
          </div>
          <div>
            <p className="text-ink-soft">산정 한도 (둘 중 작은 값, 100만원 단위 내림)</p>
            <p className="num text-2xl font-semibold text-ink">{krw(result.limit.amount)}</p>
            <p className="text-xs text-ink-soft">{result.limit.binding === "compute" ? "컴퓨트 기준이 한도를 정했습니다." : "매출 기준이 한도를 정했습니다."}</p>
          </div>
        </CardContent>
      </Card>

      <SectionTitle className="mt-9" aside="최근 12개월, 공급사 청구 기준">
        월별 컴퓨트 비용
      </SectionTitle>
      <Card>
        <CardContent>
          <CostTrendChart
            data={result.monthly.map((m) => ({
              month: m.month,
              llm: m.llmCost,
              inference: m.inferenceGpuCost,
              training: m.excluded.training + m.excluded.ambiguous,
            }))}
          />
          <div className="mt-4 overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>월</TableHead>
                  <TableHead className="text-right">유료 토큰</TableHead>
                  <TableHead className="text-right">유료 추론 GPU</TableHead>
                  <TableHead className="text-right">학습·판별 불가</TableHead>
                  <TableHead className="text-right">정부 지원·무료</TableHead>
                  <TableHead className="text-right">자체 신고</TableHead>
                  <TableHead className="text-right">매출</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...result.monthly].reverse().slice(0, 6).map((m) => (
                  <TableRow key={m.month}>
                    <TableCell>{shortMonthLabel(m.month)}</TableCell>
                    <TableCell className="num text-right">
                      {krw(m.llmCost)}
                      <span className="block text-xs text-ink-soft">{tokens(m.tokensM)}</span>
                    </TableCell>
                    <TableCell className="num text-right">
                      {krw(m.inferenceGpuCost)}
                      <span className="block text-xs text-ink-soft">{hours(m.inferenceGpuHours)}</span>
                    </TableCell>
                    <TableCell className="num text-right text-ink-soft">{krw(m.excluded.training + m.excluded.ambiguous)}</TableCell>
                    <TableCell className="num text-right text-ink-soft">{krw(m.excluded.government + m.excluded.free)}</TableCell>
                    <TableCell className="num text-right text-ink-soft">{krw(m.excluded.selfReported)}</TableCell>
                    <TableCell className="num text-right font-medium text-ink">{krw(m.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SectionTitle className="mt-9" aside="최근 3개월">
        GPU 워크로드 판별
      </SectionTitle>
      <p className="-mt-1 mb-3 max-w-[72ch] text-sm text-ink-soft">
        API 엔드포인트로 트래픽을 받으며 한 달 내내 도는 작업은 추론, 엔드포인트 없이 며칠 동안 몰아서 도는 작업은 학습으로 봅니다. 학습은 연구개발 비용이라 한도에 넣지 않습니다.
      </p>
      <Card className="py-0">
        <CardContent className="overflow-x-auto px-0">
          {recentWorkloads.length ? (
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">워크로드</TableHead>
                  <TableHead>판별</TableHead>
                  <TableHead>근거</TableHead>
                  <TableHead className="text-right">비용</TableHead>
                  <TableHead className="pr-5">심사 반영</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentWorkloads.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="pl-5">
                      <span className="font-medium">{w.name}</span>
                      <span className="block text-xs text-ink-soft">
                        {shortMonthLabel(w.month)}, {w.provider}, {w.gpuType} × {w.gpuCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={w.classification === "inference" ? "compute" : w.classification === "training" ? "neutral" : "caution"}>
                        {w.classification === "inference" ? "추론" : w.classification === "training" ? "학습" : "판별 불가"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[260px] text-xs whitespace-normal text-ink-soft">{w.reason}</TableCell>
                    <TableCell className="num text-right">{krw(w.cost)}</TableCell>
                    <TableCell className="pr-5 text-xs">
                      {w.counted ? <span className="font-semibold text-ink">반영</span> : <span className="text-ink-soft">제외: {w.excludedBecause}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-5 py-6 text-sm text-ink-soft">GPU 클라우드 사용 기록이 없습니다. API형 기업은 토큰 사용량으로만 평가합니다.</p>
          )}
        </CardContent>
      </Card>

      {result.flags.length > 0 && (
        <>
          <SectionTitle className="mt-9">심사 메모</SectionTitle>
          <ul className="flex max-w-[72ch] flex-col gap-2 text-sm">
            {result.flags.map((f) => (
              <li key={f.message} className="flex items-start gap-2">
                <Badge variant={f.severity === "critical" ? "risk" : f.severity === "warning" ? "caution" : "neutral"} className="mt-1">
                  {f.severity === "critical" ? "위험" : f.severity === "warning" ? "주의" : "참고"}
                </Badge>
                {f.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
