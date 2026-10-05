import { describe, expect, it } from "vitest";
import { DEFAULT_SCORE_CONFIG, gradeFor } from "./config";
import { classifyWorkload, cmgr, piecewise, planRepayment, scoreCompany } from "./engine";
import type { GpuWorkloadRecord, ScoringInput } from "./types";
import { monthsEnding } from "@/lib/months";

const base: GpuWorkloadRecord = {
  id: "w",
  month: "2026-09",
  provider: "NHN클라우드",
  name: "서빙",
  gpuType: "H100",
  gpuCount: 2,
  gpuHours: 1440,
  cost: 6_480_000,
  funding: "paid",
  source: "provider",
  activeDays: 30,
  avgUtilization: 0.8,
  hasEndpoint: true,
};

describe("classifyWorkload", () => {
  it("엔드포인트가 있고 상시 가동하면 추론으로 보고 한도에 넣는다", () => {
    const w = classifyWorkload(base);
    expect(w.classification).toBe("inference");
    expect(w.counted).toBe(true);
  });

  it("엔드포인트 없이 며칠만 몰아 쓰면 학습으로 보고 뺀다", () => {
    const w = classifyWorkload({ ...base, hasEndpoint: false, activeDays: 4, gpuCount: 8 });
    expect(w.classification).toBe("training");
    expect(w.counted).toBe(false);
    expect(w.excludedBecause).toBe("학습용(R&D) 사용");
  });

  it("패턴이 애매하면 판별 불가로 두고 보수적으로 뺀다", () => {
    const w = classifyWorkload({ ...base, hasEndpoint: true, activeDays: 10 });
    expect(w.classification).toBe("ambiguous");
    expect(w.counted).toBe(false);
  });

  it("정부 지원·무료 크레딧·자체 신고 사용분은 추론이어도 빼고, 자체 신고가 가장 먼저 걸린다", () => {
    expect(classifyWorkload({ ...base, funding: "government" }).excludedBecause).toBe("정부 지원 사용분");
    expect(classifyWorkload({ ...base, funding: "free_credit" }).excludedBecause).toBe("무료 크레딧 사용분");
    expect(classifyWorkload({ ...base, source: "self_reported", funding: "government" }).excludedBecause).toBe(
      "기업 자체 신고 데이터",
    );
  });
});

describe("helpers", () => {
  it("piecewise는 구간 사이를 선형 보간하고 양 끝을 고정한다", () => {
    const pts: [number, number][] = [[0, 0], [10, 100]];
    expect(piecewise(-5, pts)).toBe(0);
    expect(piecewise(5, pts)).toBe(50);
    expect(piecewise(50, pts)).toBe(100);
  });

  it("cmgr는 월 복리 성장률을 구한다", () => {
    expect(cmgr([100, 110, 121])).toBeCloseTo(0.1, 5);
    expect(cmgr([0, 0, 100, 121])).toBeCloseTo(0.21, 5);
  });

  it("등급 컷오프", () => {
    expect(gradeFor(780, DEFAULT_SCORE_CONFIG)).toBe("A");
    expect(gradeFor(779, DEFAULT_SCORE_CONFIG)).toBe("B");
    expect(gradeFor(100, DEFAULT_SCORE_CONFIG)).toBe("E");
  });

  it("상환 계획은 수수료를 더해 기간으로 나눈다", () => {
    const plan = planRepayment(10_000_000, 0.02, 40_000_000, 4);
    expect(plan.fee).toBe(200_000);
    expect(plan.total).toBe(10_200_000);
    expect(plan.monthly).toBe(2_550_000);
    expect(plan.revenueShare).toBeCloseTo(0.06375, 5);
  });
});

/** 기획안 10장 데모 페르소나와 같은 모양의 입력 */
function personaInput(): ScoringInput {
  const months = monthsEnding("2026-09", 12);
  const compute = [14_090_000, 15_060_000, 16_100_000];
  const revenue = [37_000_000, 39_890_000, 43_000_000];
  const llm: ScoringInput["llm"] = [];
  const gpu: ScoringInput["gpu"] = [];
  const rev: ScoringInput["revenue"] = [];
  months.forEach((month, i) => {
    const k = i - 9; // 마지막 3개월은 고정값, 그 이전은 7% 성장 역산
    const c = k >= 0 ? compute[k] : compute[0] / Math.pow(1.07, -k);
    const r = k >= 0 ? revenue[k] : revenue[0] / Math.pow(1.078, -k);
    llm.push({ month, provider: "Anthropic", model: "Claude Sonnet 4.5", tokensM: (c * 0.4) / 8500, cost: c * 0.4, funding: "paid", source: "provider" });
    gpu.push({ ...base, id: `inf-${i}`, month, cost: c * 0.6, gpuHours: (c * 0.6) / 4500, avgUtilization: 0.78 });
    gpu.push({ ...base, id: `train-${i}`, month, cost: 2_000_000, hasEndpoint: false, activeDays: 4, gpuCount: 8 });
    gpu.push({ ...base, id: `gov-${i}`, month, cost: 6_770_000, funding: "government" });
    rev.push({ month, revenue: r, grossMarginPct: 62, customers: 140, retentionPct: 92 });
  });
  return {
    asOfMonth: "2026-09",
    llm,
    gpu,
    revenue: rev,
    signals: {
      govPrograms: [{ name: "고성능 컴퓨팅 지원사업", startMonth: "2026-02", endMonth: "2026-10" }],
      investments: [{ round: "시리즈 A", amount: 3_000_000_000, month: "2025-11" }],
    },
  };
}

describe("scoreCompany", () => {
  it("학습용·정부 지원 GPU를 빼고 '유료 토큰 + 유료 추론 GPU'로 한도를 계산한다", () => {
    const r = scoreCompany(personaInput(), DEFAULT_SCORE_CONFIG);
    expect(r.kpis.avgCompute3).toBeCloseTo((14_090_000 + 15_060_000 + 16_100_000) / 3, 0);
    expect(r.monthly.at(-1)!.excluded.training).toBe(2_000_000);
    expect(r.monthly.at(-1)!.excluded.government).toBe(6_770_000);
  });

  it("데모 페르소나는 A등급, 한도 4,500만원(컴퓨트 기준)이 나온다", () => {
    const r = scoreCompany(personaInput(), DEFAULT_SCORE_CONFIG);
    expect(r.grade).toBe("A");
    expect(r.limit.amount).toBe(45_000_000);
    expect(r.limit.binding).toBe("compute");
    expect(r.flags.some((f) => f.message.includes("졸업 브릿지"))).toBe(true);
  });

  it("한도는 매출 기준(최근 3개월 평균 매출 × 2)을 넘지 않는다", () => {
    const input = personaInput();
    input.revenue = input.revenue.map((x) => ({ ...x, revenue: x.revenue / 4 }));
    const r = scoreCompany(input, DEFAULT_SCORE_CONFIG);
    expect(r.limit.binding).toBe("revenue");
    expect(r.limit.amount).toBeLessThanOrEqual(r.kpis.avgRevenue3 * 2);
  });

  it("유료 사용과 매출이 함께 있는 달이 부족하면 평가를 보류하고 한도를 0으로 둔다", () => {
    const input = personaInput();
    input.llm = input.llm.map((x) => ({ ...x, funding: "free_credit" as const }));
    input.gpu = input.gpu.map((x) => ({ ...x, funding: "free_credit" as const }));
    const r = scoreCompany(input, DEFAULT_SCORE_CONFIG);
    expect(r.status).toBe("insufficient_data");
    expect(r.limit.amount).toBe(0);
  });

  it("자체 신고 데이터는 아무리 커도 지표에 반영하지 않는다", () => {
    const input = personaInput();
    const before = scoreCompany(input, DEFAULT_SCORE_CONFIG);
    input.gpu.push({ ...base, id: "fake", month: "2026-09", cost: 500_000_000, source: "self_reported" });
    const after = scoreCompany(input, DEFAULT_SCORE_CONFIG);
    expect(after.kpis.avgCompute3).toBe(before.kpis.avgCompute3);
    expect(after.flags.some((f) => f.message.includes("자체 신고"))).toBe(true);
  });
});
