import { daysInMonth, monthDiff, monthsEnding } from "@/lib/months";
import { krw, num, pct, signedPct } from "@/lib/format";
import { gradeAtLeast, gradeFor } from "./config";
import type {
  ClassifiedWorkload,
  GpuWorkloadRecord,
  MonthlyCompute,
  ScoreConfig,
  ScoreResult,
  ScoringInput,
  SubScore,
} from "./types";

/* ---------- 1. 데이터 정제: 추론/학습 판별과 인정 범위 ---------- */

/**
 * 기획안 4-3(1)·8-1의 규칙 기반 판별.
 * 엔드포인트 트래픽이 있고 한 달의 60% 이상 상시 가동하면 추론,
 * 엔드포인트 없이 한 달의 절반 미만 동안 몰아서 돌면 학습으로 봅니다.
 * 둘 다 아니면 판별 불가로 두고 보수적으로 한도 산정에서 뺍니다.
 */
export function classifyWorkload(w: GpuWorkloadRecord): ClassifiedWorkload {
  const days = daysInMonth(w.month);
  const continuity = w.activeDays / days;
  let classification: ClassifiedWorkload["classification"];
  let reason: string;

  if (w.hasEndpoint && continuity >= 0.6) {
    classification = "inference";
    reason = `엔드포인트 트래픽, ${w.activeDays}/${days}일 상시 가동`;
  } else if (!w.hasEndpoint && continuity < 0.5) {
    classification = "training";
    reason = `엔드포인트 없음, ${w.activeDays}일 동안 GPU ${w.gpuCount}장 집중 사용`;
  } else {
    classification = "ambiguous";
    reason = w.hasEndpoint
      ? `엔드포인트는 있으나 ${w.activeDays}/${days}일만 가동`
      : `엔드포인트 없이 ${w.activeDays}/${days}일 가동`;
  }

  let excludedBecause: string | null = null;
  if (w.source === "self_reported") excludedBecause = "기업 자체 신고 데이터";
  else if (w.funding === "government") excludedBecause = "정부 지원 사용분";
  else if (w.funding === "free_credit") excludedBecause = "무료 크레딧 사용분";
  else if (classification === "training") excludedBecause = "학습용(R&D) 사용";
  else if (classification === "ambiguous") excludedBecause = "추론·학습 판별 불가";

  return { ...w, classification, reason, counted: excludedBecause === null, excludedBecause };
}

export function buildMonthly(input: ScoringInput, months: string[], workloads: ClassifiedWorkload[]) {
  return months.map<MonthlyCompute>((month) => {
    const m: MonthlyCompute = {
      month,
      llmCost: 0,
      inferenceGpuCost: 0,
      computeCost: 0,
      tokensM: 0,
      inferenceGpuHours: 0,
      revenue: input.revenue.find((r) => r.month === month)?.revenue ?? 0,
      excluded: { training: 0, free: 0, government: 0, selfReported: 0, ambiguous: 0 },
    };
    for (const u of input.llm) {
      if (u.month !== month) continue;
      if (u.source === "self_reported") m.excluded.selfReported += u.cost;
      else if (u.funding === "free_credit") m.excluded.free += u.cost;
      else if (u.funding === "government") m.excluded.government += u.cost;
      else {
        m.llmCost += u.cost;
        m.tokensM += u.tokensM;
      }
    }
    for (const w of workloads) {
      if (w.month !== month) continue;
      if (w.counted) {
        m.inferenceGpuCost += w.cost;
        m.inferenceGpuHours += w.gpuHours;
      } else if (w.source === "self_reported") m.excluded.selfReported += w.cost;
      else if (w.funding === "government") m.excluded.government += w.cost;
      else if (w.funding === "free_credit") m.excluded.free += w.cost;
      else if (w.classification === "training") m.excluded.training += w.cost;
      else m.excluded.ambiguous += w.cost;
    }
    m.computeCost = m.llmCost + m.inferenceGpuCost;
    return m;
  });
}

/* ---------- 2. 지표 계산 ---------- */

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);

/** 구간 선형 보간. points는 x 오름차순이어야 합니다. */
export function piecewise(x: number, points: [number, number][]) {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

/** 월 복리 성장률. 0인 달은 건너뜁니다. */
export function cmgr(values: number[]) {
  const start = values.findIndex((v) => v > 0);
  if (start < 0) return 0;
  const first = values[start];
  const last = values[values.length - 1];
  const periods = values.length - 1 - start;
  if (periods <= 0 || last <= 0) return last <= 0 && first > 0 ? -1 : 0;
  return Math.pow(last / first, 1 / periods) - 1;
}

export function volatility(values: number[]) {
  const changes: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) changes.push(values[i] / values[i - 1] - 1);
  }
  if (changes.length < 2) return 0;
  const mean = avg(changes);
  return Math.sqrt(avg(changes.map((c) => (c - mean) ** 2)));
}

/* ---------- 3. 점수·등급·한도 ---------- */

export function scoreCompany(input: ScoringInput, config: ScoreConfig): ScoreResult {
  const months12 = monthsEnding(input.asOfMonth, 12);
  const months6 = months12.slice(-6);
  const months3 = months12.slice(-3);

  const workloads = input.gpu
    .filter((w) => months12.includes(w.month))
    .map(classifyWorkload)
    .sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : b.cost - a.cost));
  const monthly = buildMonthly(input, months12, workloads);
  const byMonth = new Map(monthly.map((m) => [m.month, m]));
  const last3 = months3.map((m) => byMonth.get(m)!);
  const last6 = months6.map((m) => byMonth.get(m)!);

  const avgCompute3 = avg(last3.map((m) => m.computeCost));
  const avgRevenue3 = avg(last3.map((m) => m.revenue));
  const avgLlmCost3 = avg(last3.map((m) => m.llmCost));
  const avgInferenceGpuCost3 = avg(last3.map((m) => m.inferenceGpuCost));
  const computeEfficiency = avgCompute3 > 0 ? avgRevenue3 / avgCompute3 : 0;

  // 매출을 비용 비중대로 토큰과 GPU에 나눠 단위당 매출을 구합니다.
  const tokenRevenue = sum(last3.map((m) => (m.computeCost ? (m.revenue * m.llmCost) / m.computeCost : 0)));
  const gpuRevenue = sum(last3.map((m) => (m.computeCost ? (m.revenue * m.inferenceGpuCost) / m.computeCost : 0)));
  const tokens3 = sum(last3.map((m) => m.tokensM));
  const gpuHours3 = sum(last3.map((m) => m.inferenceGpuHours));
  const revenuePerMTokens = tokens3 > 0 ? tokenRevenue / tokens3 : null;
  const revenuePerGpuHour = gpuHours3 > 0 ? gpuRevenue / gpuHours3 : null;

  const counted3 = workloads.filter((w) => w.counted && months3.includes(w.month));
  const countedHours = sum(counted3.map((w) => w.gpuHours));
  const gpuUtilization = countedHours > 0 ? sum(counted3.map((w) => w.avgUtilization * w.gpuHours)) / countedHours : null;
  const continuity =
    countedHours > 0 ? sum(counted3.map((w) => (w.activeDays / daysInMonth(w.month)) * w.gpuHours)) / countedHours : null;

  // 단가 하락을 보정하려고 금액이 아니라 '고정 단가로 환산한 사용량'으로 성장성을 봅니다.
  const tokTotal = sum(last6.map((m) => m.tokensM));
  const hourTotal = sum(last6.map((m) => m.inferenceGpuHours));
  const pTok = tokTotal > 0 ? sum(last6.map((m) => m.llmCost)) / tokTotal : 0;
  const pHour = hourTotal > 0 ? sum(last6.map((m) => m.inferenceGpuCost)) / hourTotal : 0;
  const volumeIndex = last6.map((m) => m.tokensM * pTok + m.inferenceGpuHours * pHour);
  const usageGrowth = cmgr(volumeIndex);
  const revenueGrowth = cmgr(last6.map((m) => m.revenue));
  const vol = volatility(volumeIndex);

  const rev3 = input.revenue.filter((r) => months3.includes(r.month));
  const retention = avg(rev3.map((r) => r.retentionPct));
  const grossMargin = avg(rev3.map((r) => r.grossMarginPct));

  const providerCost = new Map<string, number>();
  for (const u of input.llm) {
    if (!months3.includes(u.month) || u.source !== "provider" || u.funding !== "paid") continue;
    providerCost.set(u.provider, (providerCost.get(u.provider) ?? 0) + u.cost);
  }
  for (const w of counted3) providerCost.set(w.provider, (providerCost.get(w.provider) ?? 0) + w.cost);
  const totalProvider = sum([...providerCost.values()]);
  let topProvider = "-";
  let topProviderShare = 0;
  for (const [p, c] of providerCost) {
    const share = totalProvider ? c / totalProvider : 0;
    if (share > topProviderShare) {
      topProviderShare = share;
      topProvider = p;
    }
  }

  const gpuShare = avgCompute3 > 0 ? avgInferenceGpuCost3 / avgCompute3 : 0;

  // --- 하위 점수 (0~100)
  const ratioScore = piecewise(computeEfficiency, [[1, 0], [1.5, 30], [2.5, 70], [4, 100]]);
  const utilScore = gpuUtilization === null ? null : piecewise(gpuUtilization, [[0.3, 0], [0.55, 50], [0.85, 100]]);
  const efficiency = utilScore === null ? ratioScore : ratioScore * (1 - 0.3 * gpuShare) + utilScore * 0.3 * gpuShare;

  const growth = piecewise(usageGrowth, [[-0.1, 0], [0, 30], [0.05, 55], [0.1, 75], [0.2, 100]]);

  const volScore = piecewise(vol, [[0.03, 100], [0.1, 70], [0.2, 35], [0.35, 0]]);
  const contScore = continuity === null ? null : piecewise(continuity, [[0.5, 0], [0.8, 60], [0.97, 100]]);
  const stability = contScore === null ? volScore : volScore * 0.65 + contScore * 0.35;

  const revGScore = piecewise(revenueGrowth, [[-0.05, 0], [0, 35], [0.05, 60], [0.1, 80], [0.2, 100]]);
  const retScore = piecewise(retention, [[70, 0], [85, 55], [95, 100]]);
  const gmScore = piecewise(grossMargin, [[20, 0], [45, 55], [70, 100]]);
  const business = revGScore * 0.4 + retScore * 0.35 + gmScore * 0.25;

  const concentration = piecewise(topProviderShare, [[0.4, 100], [0.6, 75], [0.8, 45], [1, 15]]);

  const w = config.weights;
  const wSum = w.efficiency + w.growth + w.stability + w.business + w.concentration || 1;
  const scale = 960;
  const mk = (key: SubScore["key"], label: string, score: number, metrics: SubScore["metrics"]): SubScore => ({
    key,
    label,
    score: Math.round(score),
    weight: w[key] / wSum,
    points: Math.round((score / 100) * (w[key] / wSum) * scale),
    metrics,
  });

  const subScores: SubScore[] = [
    mk("efficiency", "효율성", efficiency, [
      { label: "컴퓨트 1원당 매출", value: `${num(computeEfficiency, 2)}원`, note: "최근 3개월 매출 ÷ 유료 추론 컴퓨트" },
      ...(revenuePerMTokens !== null ? [{ label: "토큰 100만 개당 매출", value: krw(revenuePerMTokens) }] : []),
      ...(revenuePerGpuHour !== null ? [{ label: "추론 GPU 1시간당 매출", value: krw(revenuePerGpuHour) }] : []),
      ...(gpuUtilization !== null ? [{ label: "추론 GPU 가동률", value: pct(gpuUtilization, 0) }] : []),
    ]),
    mk("growth", "성장성", growth, [
      { label: "사용량 월 성장률", value: signedPct(usageGrowth), note: "최근 6개월, 단가 변화 보정" },
    ]),
    mk("stability", "안정성", stability, [
      { label: "사용량 변동성", value: pct(vol), note: "월간 증감률의 표준편차" },
      ...(continuity !== null ? [{ label: "서빙 연속성", value: pct(continuity, 0) }] : []),
    ]),
    mk("business", "사업의 질", business, [
      { label: "매출 월 성장률", value: signedPct(revenueGrowth) },
      { label: "고객 리텐션", value: `${num(retention, 1)}%` },
      { label: "매출총이익률", value: `${num(grossMargin, 1)}%` },
    ]),
    mk("concentration", "공급사 분산", concentration, [
      { label: "최대 공급사 비중", value: pct(topProviderShare, 0), note: topProvider },
    ]),
  ];

  const bonusPoints: ScoreResult["bonusPoints"] = [];
  const gov = input.signals.govPrograms.find((g) => monthDiff(g.startMonth, input.asOfMonth) >= 0);
  if (gov) bonusPoints.push({ label: `정부 지원 선정: ${gov.name}`, points: config.bonus.govProgram });
  const inv = input.signals.investments.find((i) => {
    const d = monthDiff(i.month, input.asOfMonth);
    return d >= 0 && d <= 24;
  });
  if (inv) bonusPoints.push({ label: `투자 유치: ${inv.round}`, points: config.bonus.investment });

  const base = sum(subScores.map((s) => (s.score / 100) * s.weight)) * scale;
  const score = Math.max(0, Math.min(1000, Math.round(base + sum(bonusPoints.map((b) => b.points)))));
  const grade = gradeFor(score, config);
  const coefficient = config.coefficients[grade];

  const byCompute = avgCompute3 * config.computeMultiple * coefficient;
  const byRevenue = avgRevenue3 * config.revenueMultiple;
  const amount = Math.max(0, Math.floor(Math.min(byCompute, byRevenue) / 1_000_000) * 1_000_000);

  // --- 데이터 충분성
  const paidMonths = last6.filter((m) => m.computeCost > 0 && m.revenue > 0).length;
  const insufficient = paidMonths < config.minPaidMonths;

  // --- 플래그
  const flags: ScoreResult["flags"] = [];
  const ex3 = last3.reduce(
    (acc, m) => {
      acc.training += m.excluded.training;
      acc.free += m.excluded.free;
      acc.government += m.excluded.government;
      acc.selfReported += m.excluded.selfReported;
      acc.ambiguous += m.excluded.ambiguous;
      return acc;
    },
    { training: 0, free: 0, government: 0, selfReported: 0, ambiguous: 0 },
  );
  if (ex3.training > 0)
    flags.push({ severity: "info", message: `학습용 GPU ${krw(ex3.training / 3)}/월은 한도 산정에서 뺐습니다.` });
  if (ex3.government + ex3.free > 0)
    flags.push({
      severity: "info",
      message: `정부 지원·무료 크레딧 사용분 ${krw((ex3.government + ex3.free) / 3)}/월은 지표에 넣지 않았습니다.`,
    });
  if (ex3.selfReported > 0)
    flags.push({ severity: "warning", message: `자체 신고 데이터 ${krw(ex3.selfReported / 3)}/월은 반영하지 않았습니다. 공급사 연동이 필요합니다.` });
  const ambiguousCount = workloads.filter((x) => x.classification === "ambiguous" && months3.includes(x.month)).length;
  if (ambiguousCount > 0)
    flags.push({ severity: "warning", message: `추론·학습 판별이 안 된 워크로드 ${ambiguousCount}건이 있습니다. 공급사 작업 유형 정보를 확인하세요.` });
  if (!insufficient && computeEfficiency < 1)
    flags.push({ severity: "critical", message: "유료 컴퓨트 비용이 매출보다 큽니다." });
  const [prev, last] = [volumeIndex[volumeIndex.length - 2], volumeIndex[volumeIndex.length - 1]];
  if (prev > 0 && last / prev - 1 < -0.25)
    flags.push({ severity: "critical", message: `최근 달 사용량이 ${pct(1 - last / prev, 0)} 줄었습니다.` });
  const lastRev = last3[2]?.revenue ?? 0;
  const prevRev = last3[1]?.revenue ?? 0;
  if (prevRev > 0 && lastRev / prevRev - 1 < -0.2)
    flags.push({ severity: "critical", message: `최근 달 매출이 ${pct(1 - lastRev / prevRev, 0)} 줄었습니다.` });
  if (topProviderShare > 0.85)
    flags.push({ severity: "warning", message: `${topProvider} 비중이 ${pct(topProviderShare, 0)}입니다. 공급사 의존도가 높습니다.` });
  const ending = input.signals.govPrograms.find((g) => {
    const d = monthDiff(input.asOfMonth, g.endMonth);
    return d >= 0 && d <= 2;
  });
  if (ending) flags.push({ severity: "info", message: `${ending.name} 지원이 곧 끝납니다. 졸업 브릿지 대상입니다.` });

  let recommendation: ScoreResult["recommendation"];
  if (insufficient) recommendation = "review";
  else if (score < config.rejectBelow) recommendation = "reject";
  else if (config.autoApproveGrade && gradeAtLeast(grade, config.autoApproveGrade)) recommendation = "approve";
  else recommendation = "review";

  return {
    status: insufficient ? "insufficient_data" : "scored",
    insufficientReason: insufficient
      ? `공급사 청구 기준 유료 사용과 매출이 함께 있는 달이 ${paidMonths}개월뿐입니다. ${config.minPaidMonths}개월 이상 필요합니다.`
      : undefined,
    score,
    grade,
    coefficient,
    feeRate: config.feeRates[grade],
    subScores,
    bonusPoints,
    monthly,
    workloads,
    kpis: {
      avgCompute3,
      avgRevenue3,
      avgLlmCost3,
      avgInferenceGpuCost3,
      computeEfficiency,
      revenuePerMTokens,
      revenuePerGpuHour,
      gpuUtilization,
      usageGrowth,
      revenueGrowth,
      volatility: vol,
      retention,
      grossMargin,
      topProviderShare,
      topProvider,
    },
    limit: {
      byCompute,
      byRevenue,
      amount: insufficient ? 0 : amount,
      binding: byCompute <= byRevenue ? "compute" : "revenue",
    },
    recommendation,
    flags,
  };
}

/* ---------- 4. 졸업 브릿지: 정부 지원 종료 후 비용 예측 ---------- */

export function bridgeProjection(input: ScoringInput, result: ScoreResult) {
  const program = input.signals.govPrograms
    .filter((g) => monthDiff(input.asOfMonth, g.endMonth) >= 0)
    .sort((a, b) => monthDiff(b.endMonth, a.endMonth))[0];
  if (!program) return null;
  const last = result.monthly[result.monthly.length - 1];
  const govGpu = last.excluded.government;
  const growth = Math.max(0, result.kpis.usageGrowth);
  const projectedNext = Math.round((last.computeCost + govGpu) * (1 + growth) * 1.12);
  return {
    program,
    currentPaid: last.computeCost,
    governmentCovered: govGpu,
    projectedNext,
    increase: projectedNext - last.computeCost,
  };
}

/* ---------- 5. Compute Pay 상환 계획 ---------- */

export function planRepayment(amount: number, feeRate: number, expectedMonthlyRevenue: number, termMonths: number) {
  const fee = Math.round(amount * feeRate);
  const total = amount + fee;
  const monthly = Math.ceil(total / termMonths);
  const revenueShare = expectedMonthlyRevenue > 0 ? Math.min(0.4, monthly / expectedMonthlyRevenue) : 0;
  return { fee, total, monthly, revenueShare, termMonths };
}
