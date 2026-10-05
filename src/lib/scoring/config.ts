import type { Grade, ScoreConfig } from "./types";

export const GRADES: Grade[] = ["A", "B", "C", "D", "E"];

/** 기획안 4-3의 규칙 기반 심사 모델 기본값. 관리자 콘솔에서 바꿀 수 있습니다. */
export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  weights: {
    efficiency: 0.35,
    growth: 0.2,
    stability: 0.15,
    business: 0.2,
    concentration: 0.1,
  },
  bonus: { govProgram: 25, investment: 15 },
  cutoffs: { A: 780, B: 680, C: 580, D: 480 },
  coefficients: { A: 1.0, B: 0.8, C: 0.6, D: 0.45, E: 0.3 },
  feeRates: { A: 0.018, B: 0.024, C: 0.03, D: 0.038, E: 0.045 },
  computeMultiple: 3,
  revenueMultiple: 2,
  autoApproveGrade: null,
  rejectBelow: 430,
  minPaidMonths: 3,
};

export function gradeFor(score: number, config: ScoreConfig): Grade {
  const { cutoffs } = config;
  if (score >= cutoffs.A) return "A";
  if (score >= cutoffs.B) return "B";
  if (score >= cutoffs.C) return "C";
  if (score >= cutoffs.D) return "D";
  return "E";
}

/** a가 b보다 같거나 높은 등급인지 (A가 가장 높음) */
export function gradeAtLeast(a: Grade, b: Grade) {
  return GRADES.indexOf(a) <= GRADES.indexOf(b);
}

export function mergeConfig(partial: unknown): ScoreConfig {
  if (!partial || typeof partial !== "object") return DEFAULT_SCORE_CONFIG;
  const p = partial as Partial<ScoreConfig>;
  return {
    ...DEFAULT_SCORE_CONFIG,
    ...p,
    weights: { ...DEFAULT_SCORE_CONFIG.weights, ...p.weights },
    bonus: { ...DEFAULT_SCORE_CONFIG.bonus, ...p.bonus },
    cutoffs: { ...DEFAULT_SCORE_CONFIG.cutoffs, ...p.cutoffs },
    coefficients: { ...DEFAULT_SCORE_CONFIG.coefficients, ...p.coefficients },
    feeRates: { ...DEFAULT_SCORE_CONFIG.feeRates, ...p.feeRates },
  };
}
