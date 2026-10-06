import { Num } from "@/components/metrics";
import { SeverityBadge, StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Company, Connection } from "@/lib/db/schema";
import { dateKo, hours, krw, num, pct } from "@/lib/format";
import { monthLabel, shortMonthLabel } from "@/lib/months";
import type { ScoreConfig, ScoreResult } from "@/lib/scoring/types";
import { BUSINESS_MODEL_LABEL } from "@/lib/services/admin-queries";
import { CATEGORY_LABEL } from "@/lib/services/connections";
import { cn } from "@/lib/utils";

/** 하위 점수 다섯 개와 가점. 각 점수가 1000점 중 몇 점을 만들었는지 보여 줍니다. */
export function ScoreBreakdown({ result }: { result: ScoreResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>점수 구성</CardTitle>
        <CardDescription>하위 점수(0~100)에 가중치를 곱해 960점 만점으로 환산하고, 가점을 더합니다.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {result.subScores.map((sub) => (
          <div key={sub.key} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold">
                {sub.label} <span className="font-normal text-ink-soft">가중치 {pct(sub.weight, 0)}</span>
              </p>
              <p className="num text-sm">
                <span className="font-semibold">{sub.score}</span>
                <span className="text-ink-soft"> / 100, {sub.points}점 반영</span>
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-ink/70" style={{ width: `${sub.score}%` }} />
            </div>
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {sub.metrics.map((m) => (
                <div key={m.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-soft">
                    {m.label}
                    {m.note && <span className="block text-xs text-ink-soft">{m.note}</span>}
                  </dt>
                  <dd className="num shrink-0 font-medium">{m.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        <div className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
          <p className="font-semibold">가점</p>
          {result.bonusPoints.length ? (
            result.bonusPoints.map((b) => (
              <p key={b.label} className="flex justify-between gap-3">
                <span className="text-ink-soft">{b.label}</span>
                <Num className="font-medium">+{b.points}점</Num>
              </p>
            ))
          ) : (
            <p className="text-ink-soft">해당하는 정부 지원 선정이나 최근 2년 투자 유치 이력이 없습니다.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** 한도 산정식: 컴퓨트 기준과 매출 기준 중 작은 쪽이 한도가 됩니다. */
export function LimitFormula({ result, config }: { result: ScoreResult; config: ScoreConfig }) {
  const k = result.kpis;
  const rows = [
    {
      key: "compute" as const,
      label: "컴퓨트 기준",
      formula: `평균 유료 컴퓨트 ${krw(k.avgCompute3)} × ${num(config.computeMultiple, 1)} × 계수 ${num(result.coefficient, 2)}`,
      value: result.limit.byCompute,
    },
    {
      key: "revenue" as const,
      label: "매출 기준",
      formula: `평균 매출 ${krw(k.avgRevenue3)} × ${num(config.revenueMultiple, 1)}`,
      value: result.limit.byRevenue,
    },
  ];
  return (
    <div className="flex flex-col gap-2 text-sm">
      {rows.map((r) => (
        <div
          key={r.key}
          className={cn(
            "flex flex-col gap-1 rounded-md border px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4",
            result.limit.binding === r.key ? "border-primary bg-primary-soft" : "border-line",
          )}
        >
          <span>
            <span className="font-semibold">{r.label}</span>
            {result.limit.binding === r.key && <span className="font-semibold text-ink"> (적용)</span>}
            <span className="block text-xs text-ink-soft">{r.formula}</span>
          </span>
          <Num className="shrink-0 font-semibold">{krw(r.value)}</Num>
        </div>
      ))}
      <p className="text-xs text-ink-soft">작은 쪽을 100만원 단위로 내림해 산정 한도로 씁니다.</p>
    </div>
  );
}

export function FlagList({ flags }: { flags: ScoreResult["flags"] }) {
  if (!flags.length) return <p className="text-sm text-ink-soft">특이사항이 없습니다.</p>;
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {flags.map((f) => (
        <li key={f.message} className="flex items-start gap-2">
          <SeverityBadge severity={f.severity} />
          <span>{f.message}</span>
        </li>
      ))}
    </ul>
  );
}

const CLASS_LABEL = { inference: "추론", training: "학습", ambiguous: "판별 불가" } as const;

/** 최근 3개월 GPU 워크로드 판별 결과. 무엇이 한도에 들어가고 무엇이 빠졌는지 근거와 함께 보여 줍니다. */
export function WorkloadTable({ result, months }: { result: ScoreResult; months: string[] }) {
  const rows = result.workloads.filter((w) => months.includes(w.month));
  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>GPU 워크로드 판별</CardTitle>
        <CardDescription>엔드포인트 트래픽과 가동 일수로 추론과 학습을 나눕니다. 한도에는 유료 추론만 들어갑니다.</CardDescription>
      </CardHeader>
      {rows.length === 0 ? (
        <CardContent className="pb-4 text-sm text-ink-soft">GPU 사용 기록이 없습니다. API형 기업입니다.</CardContent>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">월</TableHead>
              <TableHead>워크로드</TableHead>
              <TableHead>판별</TableHead>
              <TableHead>근거</TableHead>
              <TableHead className="text-right">GPU 시간</TableHead>
              <TableHead className="text-right">비용</TableHead>
              <TableHead className="pr-4">한도 반영</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="pl-4">
                  <Num>{shortMonthLabel(w.month)}</Num>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{w.name}</span>
                  <span className="block text-xs text-ink-soft">
                    {w.provider}, {w.gpuType} × {w.gpuCount}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={w.classification === "inference" ? "compute" : w.classification === "training" ? "neutral" : "caution"}>
                    {CLASS_LABEL[w.classification]}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[30ch] text-xs whitespace-normal text-ink-soft">{w.reason}</TableCell>
                <TableCell className="text-right">
                  <Num>{hours(w.gpuHours)}</Num>
                </TableCell>
                <TableCell className="text-right">
                  <Num>{krw(w.cost)}</Num>
                </TableCell>
                <TableCell className="pr-4">
                  {w.counted ? <span className="font-semibold text-ink">반영</span> : <span className="text-xs text-ink-soft">제외: {w.excludedBecause}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

/** 월별 원천 데이터와 제외 내역 */
export function MonthlyTable({ result }: { result: ScoreResult }) {
  const rows = [...result.monthly].reverse();
  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>월별 데이터</CardTitle>
        <CardDescription>공급사 청구와 PG 정산 기준입니다. 제외 금액은 지표 계산에 쓰지 않았습니다.</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">월</TableHead>
            <TableHead className="text-right">LLM API</TableHead>
            <TableHead className="text-right">추론 GPU</TableHead>
            <TableHead className="text-right">유료 컴퓨트</TableHead>
            <TableHead className="text-right">매출</TableHead>
            <TableHead className="text-right">학습·판별 불가</TableHead>
            <TableHead className="text-right">정부·무료</TableHead>
            <TableHead className="pr-4 text-right">자체 신고</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((m) => (
            <TableRow key={m.month}>
              <TableCell className="pl-4">
                <Num>{monthLabel(m.month, true)}</Num>
              </TableCell>
              <TableCell className="text-right">
                <Num>{krw(m.llmCost)}</Num>
              </TableCell>
              <TableCell className="text-right">
                <Num>{krw(m.inferenceGpuCost)}</Num>
              </TableCell>
              <TableCell className="text-right">
                <Num className="font-semibold text-ink">{krw(m.computeCost)}</Num>
              </TableCell>
              <TableCell className="text-right">
                <Num className="font-semibold text-ink">{krw(m.revenue)}</Num>
              </TableCell>
              <TableCell className="text-right">
                <Num className="text-ink-soft">{krw(m.excluded.training + m.excluded.ambiguous)}</Num>
              </TableCell>
              <TableCell className="text-right">
                <Num className="text-ink-soft">{krw(m.excluded.government + m.excluded.free)}</Num>
              </TableCell>
              <TableCell className="pr-4 text-right">
                <Num className="text-ink-soft">{krw(m.excluded.selfReported)}</Num>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function CompanyProfile({
  company,
  govPrograms,
  investments,
  connections,
}: {
  company: Company;
  govPrograms: { id: string; name: string; agency: string; startMonth: string; endMonth: string }[];
  investments: { id: string; round: string; amount: number; month: string; investor: string }[];
  connections: Connection[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>기업 정보</CardTitle>
        <CardDescription>{company.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 text-sm">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          <dt className="text-ink-soft">대표</dt>
          <dd>{company.ceoName}</dd>
          <dt className="text-ink-soft">사업자번호</dt>
          <dd className="num">{company.bizNo}</dd>
          <dt className="text-ink-soft">사업 유형</dt>
          <dd>{BUSINESS_MODEL_LABEL[company.model]}</dd>
          <dt className="text-ink-soft">설립, 인원</dt>
          <dd className="num">
            {company.foundedYear}년, {company.employees}명
          </dd>
        </dl>

        <div>
          <p className="mb-2 font-semibold">정부 지원 이력</p>
          {govPrograms.length ? (
            <ul className="flex flex-col gap-1">
              {govPrograms.map((g) => (
                <li key={g.id} className="flex justify-between gap-3">
                  <span>
                    {g.name} <span className="text-ink-soft">{g.agency}</span>
                  </span>
                  <Num className="shrink-0 text-ink-soft">
                    {shortMonthLabel(g.startMonth)}~{shortMonthLabel(g.endMonth)}
                  </Num>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">없음</p>
          )}
        </div>

        <div>
          <p className="mb-2 font-semibold">투자 유치</p>
          {investments.length ? (
            <ul className="flex flex-col gap-1">
              {investments.map((i) => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span>
                    {i.round} <span className="text-ink-soft">{i.investor}</span>
                  </span>
                  <Num className="shrink-0">
                    {krw(i.amount)} <span className="text-ink-soft">{shortMonthLabel(i.month)}</span>
                  </Num>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">없음</p>
          )}
        </div>

        <div>
          <p className="mb-2 font-semibold">데이터 연동</p>
          <ul className="flex flex-col gap-2">
            {connections.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  {c.provider} <span className="text-ink-soft">{CATEGORY_LABEL[c.category]}</span>
                  {c.lastSyncAt && c.status === "connected" && <span className="block text-xs text-ink-soft">마지막 동기화 {dateKo(c.lastSyncAt)}</span>}
                </span>
                <StatusBadge kind="connection" status={c.status} />
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
