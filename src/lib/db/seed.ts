/**
 * 데모용 가상 데이터. 모든 기업·인물·수치는 가상입니다.
 * 날짜는 실행 시점 기준으로 만들어서, 언제 실행해도 '최근 12개월' 데이터가 됩니다.
 */
import { eq } from "drizzle-orm";
import type { DB } from "./index";
import * as s from "./schema";
import { hashPassword } from "@/lib/auth/password";
import { addMonths, currentMonth, daysInMonth, lastClosedMonth, monthsEnding } from "@/lib/months";
import { DEFAULT_SCORE_CONFIG } from "@/lib/scoring/config";
import { planRepayment, scoreCompany } from "@/lib/scoring/engine";
import { scoringInputFrom } from "@/lib/scoring/input";

export { DEMO_PASSWORD } from "@/lib/demo-accounts";
import { DEMO_PASSWORD } from "@/lib/demo-accounts";

/* ---------- 결정적 난수 ---------- */
function seedFrom(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 프로필 ---------- */
interface LlmLine {
  provider: string;
  model: string;
  share: number;
  pricePerM: number;
}
interface GpuLine {
  provider: string;
  name: string;
  gpuType: string;
  gpuCount: number;
  pricePerHour: number;
  share: number;
  util: number;
}
interface TrainingJob {
  provider: string;
  name: string;
  gpuType: string;
  gpuCount: number;
  pricePerHour: number;
  days: number;
  every: number;
  offset: number;
}
interface ExtraWorkload {
  provider: string;
  name: string;
  gpuType: string;
  gpuCount: number;
  pricePerHour: number;
  activeDays: number;
  hasEndpoint: boolean;
  util: number;
  fromIdx: number;
  funding?: "paid" | "free_credit" | "government";
  source?: "provider" | "self_reported";
}
interface Profile {
  id: string;
  company: Omit<typeof s.companies.$inferInsert, "id" | "createdAt">;
  revenue: { end: number; growth: number; gm: number; retention: number; customers: number; fromIdx?: number };
  llm?: { end: number; growth: number; lines: LlmLine[]; paidFromIdx?: number };
  inference?: { end: number; growth: number; lines: GpuLine[] };
  training?: TrainingJob[];
  extra?: ExtraWorkload[];
  gov?: { line: Omit<GpuLine, "share">; fromIdx: number };
  shock?: { usage: number; revenue: number };
  noise: number;
  exactLast3?: boolean;
  connections: { provider: string; category: s.ConnectionCategory; connected: boolean; account?: string }[];
  govPrograms?: { name: string; agency: string; kind: "gpu" | "voucher" | "guarantee"; start: number; end: number; amount: number }[];
  investments?: { round: string; amount: number; at: number; investor: string }[];
}

const PROFILES: Profile[] = [
  {
    id: "replylab",
    company: {
      name: "리플라이랩",
      bizNo: "214-87-10231",
      industry: "AI 고객상담 SaaS",
      model: "hybrid",
      description: "쇼핑몰·보험사 상담 채널에 붙는 AI 상담원과 상담 요약 서비스를 제공합니다.",
      foundedYear: 2023,
      employees: 24,
      ceoName: "한지수",
      status: "active",
      monthlyBudget: 18_000_000,
    },
    revenue: { end: 43_000_000, growth: 0.078, gm: 62, retention: 92, customers: 140 },
    llm: {
      end: 6_400_000,
      growth: 0.069,
      lines: [
        { provider: "Anthropic", model: "Claude Sonnet 4.5", share: 0.5, pricePerM: 8_500 },
        { provider: "OpenAI", model: "GPT-4.1 mini", share: 0.35, pricePerM: 1_100 },
        { provider: "Anthropic", model: "Claude Haiku 4.5", share: 0.15, pricePerM: 2_800 },
      ],
    },
    inference: {
      end: 9_700_000,
      growth: 0.069,
      lines: [
        { provider: "NHN클라우드", name: "상담 요약 모델 서빙", gpuType: "H100", gpuCount: 2, pricePerHour: 4_500, share: 0.72, util: 0.78 },
        { provider: "gcube", name: "음성 인식(STT) 서빙", gpuType: "L40S", gpuCount: 3, pricePerHour: 1_250, share: 0.28, util: 0.74 },
      ],
    },
    training: [
      { provider: "엘리스클라우드", name: "상담 모델 파인튜닝", gpuType: "A100", gpuCount: 8, pricePerHour: 2_600, days: 4, every: 2, offset: 1 },
    ],
    gov: {
      line: { provider: "KT클라우드", name: "NIPA 지원 추론 서버", gpuType: "H100", gpuCount: 2, pricePerHour: 4_700, util: 0.76 },
      fromIdx: 4,
    },
    noise: 0.03,
    exactLast3: true,
    connections: [
      { provider: "OpenAI", category: "llm", connected: true },
      { provider: "Anthropic", category: "llm", connected: true },
      { provider: "NHN클라우드", category: "gpu", connected: true },
      { provider: "gcube", category: "gpu", connected: true },
      { provider: "엘리스클라우드", category: "gpu", connected: true },
      { provider: "KT클라우드", category: "gpu", connected: true },
      { provider: "토스페이먼츠", category: "pg", connected: true },
      { provider: "기업은행", category: "bank", connected: false, account: "기업 운영계좌" },
    ],
    govPrograms: [
      { name: "고성능 컴퓨팅 지원사업", agency: "정보통신산업진흥원(NIPA)", kind: "gpu", start: -7, end: 1, amount: 54_000_000 },
    ],
    investments: [{ round: "시리즈 A", amount: 3_000_000_000, at: -10, investor: "새솔벤처스" }],
  },
  {
    id: "pixelforge",
    company: {
      name: "픽셀포지",
      bizNo: "105-86-55120",
      industry: "AI 영상·이미지 생성",
      model: "gpu",
      description: "광고·커머스용 상품 영상과 이미지를 생성하는 자체 모델을 운영합니다.",
      foundedYear: 2022,
      employees: 41,
      ceoName: "오민재",
      status: "active",
      monthlyBudget: 60_000_000,
    },
    revenue: { end: 92_000_000, growth: 0.05, gm: 58, retention: 89, customers: 2_400 },
    llm: { end: 1_600_000, growth: 0.05, lines: [{ provider: "OpenAI", model: "GPT-4.1 mini", share: 1, pricePerM: 1_100 }] },
    inference: {
      end: 31_000_000,
      growth: 0.045,
      lines: [
        { provider: "엘리스클라우드", name: "영상 생성 추론 클러스터", gpuType: "H100", gpuCount: 6, pricePerHour: 4_300, share: 0.68, util: 0.71 },
        { provider: "네이버클라우드", name: "이미지 업스케일 서빙", gpuType: "L40S", gpuCount: 4, pricePerHour: 1_500, share: 0.32, util: 0.66 },
      ],
    },
    training: [
      { provider: "엘리스클라우드", name: "영상 모델 학습", gpuType: "H100", gpuCount: 16, pricePerHour: 4_300, days: 6, every: 1, offset: 0 },
      { provider: "KT클라우드", name: "LoRA 실험", gpuType: "A100", gpuCount: 4, pricePerHour: 2_700, days: 3, every: 2, offset: 0 },
    ],
    extra: [
      { provider: "네이버클라우드", name: "A/B 테스트 서버", gpuType: "L40S", gpuCount: 2, pricePerHour: 1_500, activeDays: 11, hasEndpoint: true, util: 0.4, fromIdx: 10 },
    ],
    noise: 0.05,
    connections: [
      { provider: "OpenAI", category: "llm", connected: true },
      { provider: "엘리스클라우드", category: "gpu", connected: true },
      { provider: "네이버클라우드", category: "gpu", connected: true },
      { provider: "KT클라우드", category: "gpu", connected: true },
      { provider: "토스페이먼츠", category: "pg", connected: true },
      { provider: "신한은행", category: "bank", connected: true, account: "신한 140-***-552107" },
    ],
    investments: [{ round: "시리즈 B", amount: 12_000_000_000, at: -14, investor: "한결인베스트먼트" }],
  },
  {
    id: "codemate",
    company: {
      name: "코드메이트",
      bizNo: "220-88-90412",
      industry: "AI 코딩 어시스턴트",
      model: "api",
      description: "사내 코드베이스를 이해하는 코딩 어시스턴트를 개발팀 좌석 단위로 판매합니다.",
      foundedYear: 2024,
      employees: 15,
      ceoName: "정하윤",
      status: "active",
      monthlyBudget: 50_000_000,
    },
    revenue: { end: 52_000_000, growth: 0.12, gm: 22, retention: 88, customers: 3_100 },
    llm: {
      end: 43_000_000,
      growth: 0.15,
      lines: [
        { provider: "Anthropic", model: "Claude Sonnet 4.5", share: 0.82, pricePerM: 8_500 },
        { provider: "Anthropic", model: "Claude Opus 4.1", share: 0.18, pricePerM: 42_000 },
      ],
    },
    noise: 0.06,
    connections: [
      { provider: "Anthropic", category: "llm", connected: true },
      { provider: "나이스페이", category: "pg", connected: true },
      { provider: "국민은행", category: "bank", connected: true, account: "국민 811-***-004129" },
    ],
    investments: [{ round: "시드", amount: 1_500_000_000, at: -9, investor: "온새미파트너스" }],
  },
  {
    id: "lawyernote",
    company: {
      name: "로이어노트",
      bizNo: "120-87-33016",
      industry: "법률 문서 검토 AI",
      model: "api",
      description: "로펌과 기업 법무팀의 계약서 검토 시간을 줄여 주는 문서 분석 서비스입니다.",
      foundedYear: 2023,
      employees: 9,
      ceoName: "윤서연",
      status: "active",
      monthlyBudget: 5_000_000,
    },
    revenue: { end: 19_500_000, growth: 0.1, gm: 78, retention: 96, customers: 64 },
    llm: {
      end: 4_100_000,
      growth: 0.1,
      lines: [
        { provider: "OpenAI", model: "GPT-4.1", share: 0.5, pricePerM: 4_200 },
        { provider: "Anthropic", model: "Claude Sonnet 4.5", share: 0.35, pricePerM: 8_500 },
        { provider: "Upstage", model: "Solar Pro 2", share: 0.15, pricePerM: 1_400 },
      ],
    },
    noise: 0.04,
    connections: [
      { provider: "OpenAI", category: "llm", connected: true },
      { provider: "Anthropic", category: "llm", connected: true },
      { provider: "Upstage", category: "llm", connected: true },
      { provider: "토스페이먼츠", category: "pg", connected: true },
      { provider: "하나은행", category: "bank", connected: true, account: "하나 357-***-118802" },
    ],
    govPrograms: [{ name: "AI 바우처 지원사업", agency: "정보통신산업진흥원(NIPA)", kind: "voucher", start: -11, end: -3, amount: 150_000_000 }],
    investments: [{ round: "프리 A", amount: 2_000_000_000, at: -5, investor: "다온벤처스" }],
  },
  {
    id: "mediscan",
    company: {
      name: "메디스캔AI",
      bizNo: "314-81-77450",
      industry: "의료영상 판독 보조 AI",
      model: "gpu",
      description: "흉부 X-ray와 CT 판독을 보조하는 모델을 병원 전용 추론 노드로 운영합니다.",
      foundedYear: 2021,
      employees: 52,
      ceoName: "김도현",
      status: "active",
      monthlyBudget: 32_000_000,
    },
    revenue: { end: 118_000_000, growth: 0.03, gm: 71, retention: 98, customers: 46 },
    llm: { end: 900_000, growth: 0.03, lines: [{ provider: "Upstage", model: "Solar Pro 2", share: 1, pricePerM: 1_400 }] },
    inference: {
      end: 26_000_000,
      growth: 0.03,
      lines: [
        { provider: "NHN클라우드", name: "판독 보조 추론 서버", gpuType: "A100", gpuCount: 6, pricePerHour: 2_700, share: 0.55, util: 0.82 },
        { provider: "네이버클라우드", name: "병원 전용 추론 노드", gpuType: "A100", gpuCount: 4, pricePerHour: 2_800, share: 0.45, util: 0.79 },
      ],
    },
    training: [
      { provider: "NHN클라우드", name: "판독 모델 재학습", gpuType: "A100", gpuCount: 8, pricePerHour: 2_700, days: 5, every: 3, offset: 2 },
    ],
    noise: 0.02,
    connections: [
      { provider: "Upstage", category: "llm", connected: true },
      { provider: "NHN클라우드", category: "gpu", connected: true },
      { provider: "네이버클라우드", category: "gpu", connected: true },
      { provider: "나이스페이", category: "pg", connected: true },
      { provider: "우리은행", category: "bank", connected: true, account: "우리 1005-***-220981" },
    ],
    govPrograms: [{ name: "AI 바우처 지원사업", agency: "정보통신산업진흥원(NIPA)", kind: "voucher", start: -20, end: -14, amount: 200_000_000 }],
    investments: [{ round: "시리즈 B", amount: 15_000_000_000, at: -20, investor: "가람헬스케어펀드" }],
  },
  {
    id: "voicewave",
    company: {
      name: "보이스웨이브",
      bizNo: "613-86-02284",
      industry: "AI 음성 더빙·TTS",
      model: "hybrid",
      description: "유튜브·이러닝 영상의 다국어 AI 더빙과 TTS API를 제공합니다.",
      foundedYear: 2022,
      employees: 28,
      ceoName: "이준호",
      status: "watch",
      monthlyBudget: 20_000_000,
    },
    revenue: { end: 41_000_000, growth: 0.06, gm: 48, retention: 81, customers: 820 },
    llm: { end: 3_000_000, growth: 0.05, lines: [{ provider: "OpenAI", model: "GPT-4.1", share: 1, pricePerM: 4_200 }] },
    inference: {
      end: 15_000_000,
      growth: 0.06,
      lines: [
        { provider: "KT클라우드", name: "TTS 추론 서버", gpuType: "H100", gpuCount: 3, pricePerHour: 4_700, share: 0.85, util: 0.58 },
        { provider: "gcube", name: "더빙 후처리", gpuType: "L40S", gpuCount: 2, pricePerHour: 1_250, share: 0.15, util: 0.52 },
      ],
    },
    extra: [
      { provider: "KT클라우드", name: "배치 더빙 렌더링", gpuType: "A100", gpuCount: 2, pricePerHour: 2_700, activeDays: 18, hasEndpoint: false, util: 0.6, fromIdx: 9 },
    ],
    shock: { usage: -0.36, revenue: -0.27 },
    noise: 0.04,
    connections: [
      { provider: "OpenAI", category: "llm", connected: true },
      { provider: "KT클라우드", category: "gpu", connected: true },
      { provider: "gcube", category: "gpu", connected: true },
      { provider: "토스페이먼츠", category: "pg", connected: true },
      { provider: "기업은행", category: "bank", connected: true, account: "기업 044-***-019233" },
    ],
  },
  {
    id: "edubot",
    company: {
      name: "에듀봇",
      bizNo: "502-88-61177",
      industry: "AI 수학 튜터",
      model: "api",
      description: "중·고등학생에게 풀이 과정을 단계별로 설명해 주는 AI 수학 튜터입니다.",
      foundedYear: 2025,
      employees: 6,
      ceoName: "박소윤",
      status: "onboarding",
      monthlyBudget: 3_000_000,
    },
    revenue: { end: 6_100_000, growth: 0.45, gm: 55, retention: 84, customers: 1_900, fromIdx: 10 },
    llm: {
      end: 2_400_000,
      growth: 0.3,
      paidFromIdx: 10,
      lines: [
        { provider: "OpenAI", model: "GPT-4.1 mini", share: 0.7, pricePerM: 1_100 },
        { provider: "Anthropic", model: "Claude Haiku 4.5", share: 0.3, pricePerM: 2_800 },
      ],
    },
    extra: [
      { provider: "자체 서버", name: "풀이 검증 모델(자체 신고)", gpuType: "RTX 4090", gpuCount: 4, pricePerHour: 600, activeDays: 30, hasEndpoint: true, util: 0.7, fromIdx: 6, source: "self_reported" },
    ],
    noise: 0.05,
    connections: [
      { provider: "OpenAI", category: "llm", connected: true },
      { provider: "Anthropic", category: "llm", connected: true },
      { provider: "토스페이먼츠", category: "pg", connected: true },
      { provider: "카카오뱅크", category: "bank", connected: false },
    ],
  },
];

/* ---------- 월별 원천 데이터 생성 ---------- */
function generateMonthly(p: Profile, months: string[]) {
  const r = rng(seedFrom(p.id));
  const n = months.length;
  const jitter = (i: number) => (p.exactLast3 && i >= n - 3 ? 1 : 1 + (r() * 2 - 1) * p.noise);
  const atIdx = (end: number, g: number, i: number) => end / Math.pow(1 + g, n - 1 - i);
  const llm: (typeof s.llmUsage.$inferInsert)[] = [];
  const gpu: (typeof s.gpuWorkloads.$inferInsert)[] = [];
  const rev: (typeof s.revenue.$inferInsert)[] = [];
  let k = 0;
  const wid = () => `${p.id}-w${++k}`;

  months.forEach((month, i) => {
    const isLast = i === n - 1;
    const usageShock = isLast && p.shock ? 1 + p.shock.usage : 1;
    const revShock = isLast && p.shock ? 1 + p.shock.revenue : 1;
    // 단가는 매달 약 2%씩 내려간 것으로 둡니다 (오래된 달일수록 비쌈).
    const priceDrift = Math.pow(1.02, n - 1 - i);

    if (p.llm) {
      const total = atIdx(p.llm.end, p.llm.growth, i) * jitter(i) * usageShock;
      const paid = p.llm.paidFromIdx === undefined || i >= p.llm.paidFromIdx;
      for (const line of p.llm.lines) {
        const cost = Math.round(total * line.share);
        const price = line.pricePerM * priceDrift;
        llm.push({
          id: `${p.id}-l${++k}`,
          companyId: p.id,
          month,
          provider: line.provider,
          model: line.model,
          tokensM: Math.round((cost / price) * 100) / 100,
          cost,
          funding: paid ? "paid" : "free_credit",
          source: "provider",
        });
      }
    }

    const days = daysInMonth(month);
    if (p.inference) {
      const total = atIdx(p.inference.end, p.inference.growth, i) * jitter(i) * usageShock;
      for (const line of p.inference.lines) {
        const cost = Math.round(total * line.share);
        const price = line.pricePerHour * priceDrift;
        gpu.push({
          id: wid(),
          companyId: p.id,
          month,
          provider: line.provider,
          name: line.name,
          gpuType: line.gpuType,
          gpuCount: line.gpuCount,
          gpuHours: Math.round(cost / price),
          cost,
          funding: "paid",
          source: "provider",
          activeDays: days,
          avgUtilization: Math.min(0.95, Math.max(0.2, line.util * (isLast ? usageShock * 0.15 + 0.85 : 1) + (r() - 0.5) * 0.04)),
          hasEndpoint: true,
        });
      }
    }

    for (const job of p.training ?? []) {
      if ((i - job.offset) % job.every !== 0 || i < job.offset) continue;
      const hours = job.gpuCount * job.days * 24;
      gpu.push({
        id: wid(),
        companyId: p.id,
        month,
        provider: job.provider,
        name: job.name,
        gpuType: job.gpuType,
        gpuCount: job.gpuCount,
        gpuHours: hours,
        cost: Math.round(hours * job.pricePerHour),
        funding: "paid",
        source: "provider",
        activeDays: job.days,
        avgUtilization: 0.9 + (r() - 0.5) * 0.06,
        hasEndpoint: false,
      });
    }

    for (const x of p.extra ?? []) {
      if (i < x.fromIdx) continue;
      const hours = x.gpuCount * x.activeDays * 24;
      gpu.push({
        id: wid(),
        companyId: p.id,
        month,
        provider: x.provider,
        name: x.name,
        gpuType: x.gpuType,
        gpuCount: x.gpuCount,
        gpuHours: hours,
        cost: Math.round(hours * x.pricePerHour),
        funding: x.funding ?? "paid",
        source: x.source ?? "provider",
        activeDays: x.activeDays,
        avgUtilization: x.util,
        hasEndpoint: x.hasEndpoint,
      });
    }

    if (p.gov && i >= p.gov.fromIdx) {
      const hours = p.gov.line.gpuCount * days * 24;
      gpu.push({
        id: wid(),
        companyId: p.id,
        month,
        provider: p.gov.line.provider,
        name: p.gov.line.name,
        gpuType: p.gov.line.gpuType,
        gpuCount: p.gov.line.gpuCount,
        gpuHours: hours,
        cost: Math.round(hours * p.gov.line.pricePerHour),
        funding: "government",
        source: "provider",
        activeDays: days,
        avgUtilization: p.gov.line.util,
        hasEndpoint: true,
      });
    }

    if (p.revenue.fromIdx === undefined || i >= p.revenue.fromIdx) {
      const value = Math.round(atIdx(p.revenue.end, p.revenue.growth, i) * jitter(i) * revShock);
      const retentionDrop = isLast && p.shock ? -6 : 0;
      rev.push({
        id: `${p.id}-r${++k}`,
        companyId: p.id,
        month,
        revenue: Math.round(value / 10_000) * 10_000,
        grossMarginPct: Math.round((p.revenue.gm + (r() - 0.5) * 2) * 10) / 10,
        customers: Math.round(atIdx(p.revenue.customers, p.revenue.growth / 2, i)),
        retentionPct: Math.round((p.revenue.retention + retentionDrop + (r() - 0.5) * 1.6) * 10) / 10,
      });
    }
  });

  return { llm, gpu, rev };
}

/* ---------- 시드 실행 ---------- */
export async function seedDatabase(db: DB, today = new Date()) {
  const asOf = lastClosedMonth(today);
  const thisMonth = currentMonth(today);
  const months = monthsEnding(asOf, 12);
  const daysAgo = (d: number) => new Date(today.getTime() - d * 86_400_000);
  const monthStart = (ym: string, day = 1) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, day, 10, 0, 0);
  };

  await db.transaction(async (tx) => {
    for (const t of [
      s.auditLogs,
      s.alertAcks,
      s.repayments,
      s.paymentRequests,
      s.creditLines,
      s.applications,
      s.revenue,
      s.gpuWorkloads,
      s.llmUsage,
      s.connections,
      s.investments,
      s.govPrograms,
      s.users,
      s.companies,
      s.settings,
    ]) {
      await tx.delete(t);
    }

    await tx.insert(s.settings).values({ key: "score_config", value: DEFAULT_SCORE_CONFIG });

    const pw = hashPassword(DEMO_PASSWORD);
    const user = (email: string, name: string, title: string, role: s.Role, companyId: string | null) => ({
      id: `u_${email.split("@")[0]}_${email.split("@")[1].split(".")[0]}`,
      email,
      name,
      title,
      role,
      companyId,
      passwordHash: pw,
    });
    const users = [
      user("admin@tokenscore.kr", "강민서", "여신심사역", "admin", null),
      user("ops@tokenscore.kr", "최유진", "운영 매니저", "admin", null),
      user("ceo@replylab.ai", "한지수", "대표", "company", "replylab"),
      user("dev@replylab.ai", "서도윤", "ML 엔지니어", "user", "replylab"),
      user("infra@replylab.ai", "문가은", "인프라 엔지니어", "user", "replylab"),
      user("ceo@pixelforge.ai", "오민재", "대표", "company", "pixelforge"),
      user("ml@pixelforge.ai", "장하람", "ML 리드", "user", "pixelforge"),
      user("ceo@codemate.dev", "정하윤", "대표", "company", "codemate"),
      user("ceo@lawyernote.kr", "윤서연", "대표", "company", "lawyernote"),
      user("ceo@mediscan.ai", "김도현", "대표", "company", "mediscan"),
      user("infra@mediscan.ai", "남궁현", "인프라 리드", "user", "mediscan"),
      user("ceo@voicewave.ai", "이준호", "대표", "company", "voicewave"),
      user("ceo@edubot.kr", "박소윤", "대표", "company", "edubot"),
    ];
    await tx.insert(s.users).values(users);
    const uid = (email: string) => users.find((u) => u.email === email)!.id;

    const generated = new Map<string, ReturnType<typeof generateMonthly>>();
    for (const p of PROFILES) {
      await tx.insert(s.companies).values({ id: p.id, ...p.company, createdAt: daysAgo(300) });
      await tx.insert(s.connections).values(
        p.connections.map((c) => ({
          id: `${p.id}-c-${c.provider}`,
          companyId: p.id,
          provider: c.provider,
          category: c.category,
          status: c.connected ? ("connected" as const) : ("disconnected" as const),
          consentAt: c.connected ? daysAgo(120) : null,
          lastSyncAt: c.connected ? daysAgo(1) : null,
          account: c.account ?? null,
        })),
      );
      if (p.govPrograms?.length)
        await tx.insert(s.govPrograms).values(
          p.govPrograms.map((g, i) => ({
            id: `${p.id}-g${i}`,
            companyId: p.id,
            name: g.name,
            agency: g.agency,
            kind: g.kind,
            startMonth: addMonths(asOf, g.start),
            endMonth: addMonths(asOf, g.end),
            amount: g.amount,
          })),
        );
      if (p.investments?.length)
        await tx.insert(s.investments).values(
          p.investments.map((v, i) => ({
            id: `${p.id}-i${i}`,
            companyId: p.id,
            round: v.round,
            amount: v.amount,
            month: addMonths(asOf, v.at),
            investor: v.investor,
          })),
        );
      const g = generateMonthly(p, months);
      generated.set(p.id, g);
      if (g.llm.length) await tx.insert(s.llmUsage).values(g.llm);
      if (g.gpu.length) await tx.insert(s.gpuWorkloads).values(g.gpu);
      if (g.rev.length) await tx.insert(s.revenue).values(g.rev);
    }

    // 점수는 저장된 원천 데이터로 다시 계산합니다 (화면과 같은 경로).
    const scoreAt = async (companyId: string, asOfMonth: string) => {
      const input = scoringInputFrom(asOfMonth, {
        llm: await tx.select().from(s.llmUsage).where(eq(s.llmUsage.companyId, companyId)),
        gpu: await tx.select().from(s.gpuWorkloads).where(eq(s.gpuWorkloads.companyId, companyId)),
        revenue: await tx.select().from(s.revenue).where(eq(s.revenue.companyId, companyId)),
        govPrograms: await tx.select().from(s.govPrograms).where(eq(s.govPrograms.companyId, companyId)),
        investments: await tx.select().from(s.investments).where(eq(s.investments.companyId, companyId)),
      });
      return scoreCompany(input, DEFAULT_SCORE_CONFIG);
    };

    const audit = (actor: string | null, actorName: string, companyId: string | null, action: string, detail: string, at: Date) =>
      tx.insert(s.auditLogs).values({ id: crypto.randomUUID(), actorId: actor, actorName, companyId, action, detail, createdAt: at });

    // --- 한도 승인된 기업: 신청 → 승인 → 한도 생성
    const approveLine = async (companyId: string, monthsAgo: number, approverEmail: string) => {
      const asOfAtApproval = addMonths(asOf, -monthsAgo);
      const result = await scoreAt(companyId, asOfAtApproval);
      const appId = `${companyId}-app1`;
      const approvedAt = monthStart(addMonths(thisMonth, -monthsAgo), 6);
      await tx.insert(s.applications).values({
        id: appId,
        companyId,
        requestedAmount: result.limit.amount,
        termMonths: 4,
        purpose: "LLM·GPU 클라우드 청구서 선결제",
        status: "approved",
        score: result.score,
        grade: result.grade,
        suggestedLimit: result.limit.amount,
        recommendation: result.recommendation,
        snapshot: { kpis: result.kpis, limit: result.limit, asOfMonth: asOfAtApproval },
        approvedLimit: result.limit.amount,
        decisionNote: "공급사 청구 데이터와 PG 매출 일치 확인. 제안 한도로 승인합니다.",
        decidedBy: uid(approverEmail),
        decidedAt: approvedAt,
        createdAt: new Date(approvedAt.getTime() - 2 * 86_400_000),
      });
      const lineId = `${companyId}-line1`;
      await tx.insert(s.creditLines).values({
        id: lineId,
        companyId,
        applicationId: appId,
        limitAmount: result.limit.amount,
        grade: result.grade,
        score: result.score,
        feeRate: result.feeRate,
        termMonths: 4,
        status: "active",
        approvedAt,
        expiresAt: new Date(approvedAt.getTime() + 365 * 86_400_000),
        partner: "누리캐피탈",
      });
      await audit(uid(approverEmail), "강민서", companyId, "한도 승인", `${result.grade}등급 ${result.score}점, 한도 ${result.limit.amount.toLocaleString("ko-KR")}원`, approvedAt);
      return { lineId, result };
    };

    const addPayment = async (opts: {
      companyId: string;
      lineId: string | null;
      provider: string;
      category: "llm" | "gpu";
      billingMonth: string;
      amount: number;
      status: s.PaymentStatus;
      requestedBy: string;
      approvedBy?: string;
      feeRate?: number;
      expectedRevenue?: number;
      repayStates?: s.RepaymentStatus[];
      memo?: string;
      n: number;
    }) => {
      const id = `${opts.companyId}-pay${opts.n}`;
      const due = `${addMonths(opts.billingMonth, 1)}-10`;
      const created = monthStart(addMonths(opts.billingMonth, 1), 2);
      const paid = opts.status === "paid";
      const plan =
        paid && opts.feeRate !== undefined && opts.expectedRevenue
          ? planRepayment(opts.amount, opts.feeRate, opts.expectedRevenue, 4)
          : null;
      await tx.insert(s.paymentRequests).values({
        id,
        companyId: opts.companyId,
        creditLineId: opts.lineId,
        provider: opts.provider,
        category: opts.category,
        invoiceNo: `INV-${opts.billingMonth.replace("-", "")}-${String(seedFrom(id) % 100000).padStart(5, "0")}`,
        billingMonth: opts.billingMonth,
        amount: opts.amount,
        dueDate: due,
        memo: opts.memo ?? null,
        status: opts.status,
        requestedBy: opts.requestedBy,
        approvedBy: opts.approvedBy ?? null,
        approvedAt: opts.status === "requested" ? null : new Date(created.getTime() + 86_400_000),
        paidBy: paid ? uid("ops@tokenscore.kr") : null,
        paidAt: paid ? new Date(created.getTime() + 2 * 86_400_000) : null,
        feeAmount: plan?.fee ?? null,
        revenueShare: plan?.revenueShare ?? null,
        createdAt: created,
      });
      if (plan && opts.lineId) {
        for (let seq = 1; seq <= plan.termMonths; seq++) {
          const dueMonth = addMonths(opts.billingMonth, seq + 1);
          const state = opts.repayStates?.[seq - 1] ?? (dueMonth < thisMonth ? "paid" : "scheduled");
          const expected = seq === plan.termMonths ? plan.total - plan.monthly * (plan.termMonths - 1) : plan.monthly;
          await tx.insert(s.repayments).values({
            id: `${id}-r${seq}`,
            companyId: opts.companyId,
            creditLineId: opts.lineId,
            paymentRequestId: id,
            seq,
            dueMonth,
            expectedAmount: expected,
            paidAmount: state === "paid" ? expected : state === "overdue" ? Math.round(expected * 0.35) : 0,
            revenueShare: plan.revenueShare,
            status: state,
            paidAt: state === "paid" ? monthStart(dueMonth, 25) : null,
          });
        }
        await audit(uid("ops@tokenscore.kr"), "최유진", opts.companyId, "선결제 집행", `${opts.provider} ${opts.amount.toLocaleString("ko-KR")}원`, new Date(created.getTime() + 2 * 86_400_000));
      }
    };

    // 픽셀포지: 3개월 전 승인, 2건 결제 완료, 이번 달 1건 결제 요청 대기
    {
      const { lineId, result } = await approveLine("pixelforge", 3, "admin@tokenscore.kr");
      const revAvg = result.kpis.avgRevenue3;
      const gp = generated.get("pixelforge")!;
      const eliceBill = (m: string) => gp.gpu.filter((w) => w.month === m && w.provider === "엘리스클라우드").reduce((a, w) => a + w.cost, 0);
      await addPayment({ companyId: "pixelforge", lineId, provider: "엘리스클라우드", category: "gpu", billingMonth: addMonths(asOf, -2), amount: Math.round(eliceBill(addMonths(asOf, -2)) * 0.5 / 10_000) * 10_000, status: "paid", requestedBy: uid("ml@pixelforge.ai"), approvedBy: uid("ceo@pixelforge.ai"), feeRate: result.feeRate, expectedRevenue: revAvg, n: 1 });
      await addPayment({ companyId: "pixelforge", lineId, provider: "엘리스클라우드", category: "gpu", billingMonth: addMonths(asOf, -1), amount: Math.round(eliceBill(addMonths(asOf, -1)) * 0.5 / 10_000) * 10_000, status: "paid", requestedBy: uid("ml@pixelforge.ai"), approvedBy: uid("ceo@pixelforge.ai"), feeRate: result.feeRate, expectedRevenue: revAvg, n: 2 });
      await addPayment({ companyId: "pixelforge", lineId, provider: "네이버클라우드", category: "gpu", billingMonth: asOf, amount: 9_800_000, status: "requested", requestedBy: uid("ml@pixelforge.ai"), memo: "업스케일 서빙 노드 9월분", n: 3 });
    }

    // 메디스캔AI: 6개월 전 승인, 결제 2건 완료, 1건은 회사 승인 후 집행 대기
    {
      const { lineId, result } = await approveLine("mediscan", 6, "admin@tokenscore.kr");
      const revAvg = result.kpis.avgRevenue3;
      await addPayment({ companyId: "mediscan", lineId, provider: "NHN클라우드", category: "gpu", billingMonth: addMonths(asOf, -5), amount: 14_200_000, status: "paid", requestedBy: uid("infra@mediscan.ai"), approvedBy: uid("ceo@mediscan.ai"), feeRate: result.feeRate, expectedRevenue: revAvg, n: 1 });
      await addPayment({ companyId: "mediscan", lineId, provider: "네이버클라우드", category: "gpu", billingMonth: addMonths(asOf, -1), amount: 11_600_000, status: "paid", requestedBy: uid("infra@mediscan.ai"), approvedBy: uid("ceo@mediscan.ai"), feeRate: result.feeRate, expectedRevenue: revAvg, n: 2 });
      await addPayment({ companyId: "mediscan", lineId, provider: "NHN클라우드", category: "gpu", billingMonth: asOf, amount: 14_900_000, status: "approved", requestedBy: uid("infra@mediscan.ai"), approvedBy: uid("ceo@mediscan.ai"), memo: "판독 서버 9월분", n: 3 });
    }

    // 보이스웨이브: 5개월 전 C등급으로 승인 → 최근 사용량·매출 급감, 상환 연체
    {
      const { lineId, result } = await approveLine("voicewave", 5, "admin@tokenscore.kr");
      const revAvg = result.kpis.avgRevenue3;
      await addPayment({ companyId: "voicewave", lineId, provider: "KT클라우드", category: "gpu", billingMonth: addMonths(asOf, -4), amount: 12_400_000, status: "paid", requestedBy: uid("ceo@voicewave.ai"), approvedBy: uid("ceo@voicewave.ai"), feeRate: result.feeRate, expectedRevenue: revAvg, repayStates: ["paid", "paid", "overdue", "scheduled"], n: 1 });
      await addPayment({ companyId: "voicewave", lineId, provider: "KT클라우드", category: "gpu", billingMonth: addMonths(asOf, -2), amount: 13_100_000, status: "paid", requestedBy: uid("ceo@voicewave.ai"), approvedBy: uid("ceo@voicewave.ai"), feeRate: result.feeRate, expectedRevenue: revAvg, repayStates: ["overdue", "scheduled", "scheduled", "scheduled"], n: 2 });
    }

    // 코드메이트·로이어노트: 신청 접수, 심사 대기
    for (const [companyId, amount, term, purpose, ago] of [
      ["codemate", 100_000_000, 6, "다음 분기 Claude API 비용 선결제", 2],
      ["lawyernote", 10_000_000, 4, "신규 로펌 고객 온보딩에 따른 LLM 비용 증가분", 1],
    ] as const) {
      const result = await scoreAt(companyId, asOf);
      await tx.insert(s.applications).values({
        id: `${companyId}-app1`,
        companyId,
        requestedAmount: amount,
        termMonths: term,
        purpose,
        status: "submitted",
        score: result.score,
        grade: result.grade,
        suggestedLimit: result.limit.amount,
        recommendation: result.recommendation,
        snapshot: { kpis: result.kpis, limit: result.limit, asOfMonth: asOf },
        createdAt: daysAgo(ago),
      });
      const owner = users.find((u) => u.companyId === companyId && u.role === "company")!;
      await audit(owner.id, owner.name, companyId, "한도 신청", `${amount.toLocaleString("ko-KR")}원, ${term}개월`, daysAgo(ago));
    }

    await audit(uid("ops@tokenscore.kr"), "최유진", "edubot", "데이터 연동", "OpenAI·Anthropic 빌링 연동 완료", daysAgo(9));
    await audit(uid("ceo@replylab.ai"), "한지수", "replylab", "데이터 연동", "NHN클라우드·gcube·KT클라우드 사용 기록 연동", daysAgo(14));
  });

  return { asOf, thisMonth };
}
