export type Funding = "paid" | "free_credit" | "government";
export type DataSource = "provider" | "self_reported";

/** LLM API 월별 사용량 (공급사 빌링 기준). tokensM = 100만 토큰 단위 */
export interface LlmUsageRecord {
  month: string; // YYYY-MM
  provider: string;
  model: string;
  tokensM: number;
  cost: number; // KRW
  funding: Funding;
  source: DataSource;
}

/** GPU 클라우드 월별 워크로드 (공급사 사용 기록·청구 기준) */
export interface GpuWorkloadRecord {
  id: string;
  month: string;
  provider: string;
  name: string;
  gpuType: string;
  gpuCount: number;
  gpuHours: number;
  cost: number;
  funding: Funding;
  source: DataSource;
  /** 그 달에 작업이 돈 날 수 */
  activeDays: number;
  /** 0~1 */
  avgUtilization: number;
  /** 외부 API 엔드포인트로 트래픽을 받는지 */
  hasEndpoint: boolean;
}

export interface RevenueRecord {
  month: string;
  revenue: number;
  grossMarginPct: number; // 0~100
  customers: number;
  retentionPct: number; // 0~100
}

export interface CompanySignals {
  govPrograms: { name: string; startMonth: string; endMonth: string }[];
  investments: { round: string; amount: number; month: string }[];
}

export interface ScoringInput {
  asOfMonth: string; // 마지막으로 마감된 달 (YYYY-MM)
  llm: LlmUsageRecord[];
  gpu: GpuWorkloadRecord[];
  revenue: RevenueRecord[];
  signals: CompanySignals;
}

export type Grade = "A" | "B" | "C" | "D" | "E";

export interface ScoreConfig {
  weights: {
    efficiency: number;
    growth: number;
    stability: number;
    business: number;
    concentration: number;
  };
  bonus: { govProgram: number; investment: number };
  cutoffs: Record<Exclude<Grade, "E">, number>;
  coefficients: Record<Grade, number>;
  feeRates: Record<Grade, number>;
  /** 한도 = min(평균 컴퓨트 × computeMultiple × 계수, 평균 매출 × revenueMultiple) */
  computeMultiple: number;
  revenueMultiple: number;
  /** 이 등급 이상이면 신청 금액이 한도 이내일 때 자동 승인 */
  autoApproveGrade: Grade | null;
  /** 이 점수 미만은 거절 권고 */
  rejectBelow: number;
  /** 유료 데이터가 이 개월 수보다 적으면 평가 보류 */
  minPaidMonths: number;
}

export type WorkloadClass = "inference" | "training" | "ambiguous";

export interface ClassifiedWorkload extends GpuWorkloadRecord {
  classification: WorkloadClass;
  reason: string;
  counted: boolean; // 한도 산정에 들어가는지
  excludedBecause: string | null;
}

export interface MonthlyCompute {
  month: string;
  llmCost: number;
  inferenceGpuCost: number;
  computeCost: number; // 유료 토큰 + 유료 추론 GPU
  tokensM: number;
  inferenceGpuHours: number;
  revenue: number;
  /** 제외된 비용 */
  excluded: { training: number; free: number; government: number; selfReported: number; ambiguous: number };
}

export interface SubScore {
  key: keyof ScoreConfig["weights"];
  label: string;
  score: number; // 0~100
  weight: number;
  points: number; // 가중 반영 점수 (1000점 만점 기준)
  metrics: { label: string; value: string; note?: string }[];
}

export interface ScoreResult {
  status: "scored" | "insufficient_data";
  insufficientReason?: string;
  score: number; // 0~1000
  grade: Grade;
  coefficient: number;
  feeRate: number;
  subScores: SubScore[];
  bonusPoints: { label: string; points: number }[];
  monthly: MonthlyCompute[];
  workloads: ClassifiedWorkload[];
  kpis: {
    avgCompute3: number;
    avgRevenue3: number;
    avgLlmCost3: number;
    avgInferenceGpuCost3: number;
    computeEfficiency: number; // 매출 ÷ 컴퓨트
    revenuePerMTokens: number | null;
    revenuePerGpuHour: number | null;
    gpuUtilization: number | null;
    usageGrowth: number; // 월 복리 성장률
    revenueGrowth: number;
    volatility: number;
    retention: number;
    grossMargin: number;
    topProviderShare: number;
    topProvider: string;
  };
  limit: {
    byCompute: number;
    byRevenue: number;
    amount: number;
    binding: "compute" | "revenue";
  };
  recommendation: "approve" | "review" | "reject";
  flags: { severity: "info" | "warning" | "critical"; message: string }[];
}
