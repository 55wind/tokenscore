import "server-only";
import { addMonths, currentMonth, daysInMonth, monthLabel, monthsEnding } from "@/lib/months";
import { tokens } from "@/lib/format";
import { getCompanyScore } from "./scoring";

/* ---------- AI 비용 대시보드 (무료 기능) ----------
 * 심사와 달리 대시보드는 '실제로 나간 돈'을 모두 보여 줍니다.
 * 학습용 GPU와 정부 지원·무료 크레딧 사용분도 따로 표시합니다.
 */

export interface CostLine {
  key: string;
  label: string;
  sub: string;
  kind: "llm" | "inference" | "training" | "covered" | "ambiguous";
  cost: number;
  prevCost: number;
  usage: string;
}

export async function getCostDashboard(companyId: string) {
  const { result, data, asOf } = await getCompanyScore(companyId);
  const months = monthsEnding(asOf, 12);
  const prevMonth = addMonths(asOf, -1);

  const trend = months.map((month) => {
    const m = result.monthly.find((x) => x.month === month)!;
    return {
      month,
      llm: m.llmCost,
      inference: m.inferenceGpuCost,
      training: m.excluded.training + m.excluded.ambiguous,
      covered: m.excluded.government + m.excluded.free,
      revenue: m.revenue,
    };
  });

  const lines: CostLine[] = [];
  const llmModels = new Map<string, { provider: string; model: string; cost: number; prev: number; tokensM: number; covered: boolean }>();
  for (const u of data.llm) {
    if (u.month !== asOf && u.month !== prevMonth) continue;
    const key = `${u.provider}|${u.model}|${u.funding}`;
    const e = llmModels.get(key) ?? { provider: u.provider, model: u.model, cost: 0, prev: 0, tokensM: 0, covered: u.funding !== "paid" };
    if (u.month === asOf) {
      e.cost += u.cost;
      e.tokensM += u.tokensM;
    } else e.prev += u.cost;
    llmModels.set(key, e);
  }
  for (const [key, e] of llmModels) {
    if (e.cost === 0 && e.prev === 0) continue;
    lines.push({
      key,
      label: e.model,
      sub: e.covered ? `${e.provider} · 무료 크레딧` : e.provider,
      kind: e.covered ? "covered" : "llm",
      cost: e.cost,
      prevCost: e.prev,
      usage: tokens(e.tokensM),
    });
  }
  const lastWorkloads = result.workloads.filter((w) => w.month === asOf);
  for (const w of lastWorkloads) {
    const prev = result.workloads.find((x) => x.month === prevMonth && x.name === w.name && x.provider === w.provider);
    const kind: CostLine["kind"] =
      w.funding !== "paid" ? "covered" : w.classification === "inference" ? "inference" : w.classification === "training" ? "training" : "ambiguous";
    lines.push({
      key: w.id,
      label: w.name,
      sub: `${w.provider} · ${w.gpuType} × ${w.gpuCount}${w.funding === "government" ? " · 정부 지원" : ""}${w.source === "self_reported" ? " · 자체 신고" : ""}`,
      kind,
      cost: w.cost,
      prevCost: prev?.cost ?? 0,
      usage: `${Math.round(w.gpuHours).toLocaleString("ko-KR")} GPU시간 · 가동률 ${Math.round(w.avgUtilization * 100)}%`,
    });
  }
  lines.sort((a, b) => b.cost - a.cost);

  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const totalSpend = last.llm + last.inference + last.training;
  const prevSpend = prev.llm + prev.inference + prev.training;

  // 최근 30일 일별 사용액: 월 합계를 일 단위로 나누고 평일·주말 패턴을 입힙니다.
  const thisMonth = currentMonth();
  const growth = Math.max(-0.3, Math.min(0.3, result.kpis.usageGrowth));
  const today = new Date();
  const daily = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29 + i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const src = trend.find((t) => t.month === ym);
    const base = src ? src.llm + src.inference + src.training : (last.llm + last.inference + last.training) * (ym === thisMonth ? 1 + growth : 1);
    const dim = daysInMonth(ym);
    const weekday = d.getDay();
    const pattern = weekday === 0 || weekday === 6 ? 0.82 : 1.07;
    const wobble = 1 + Math.sin(d.getDate() * 1.7 + companyId.length) * 0.05;
    return { date: `${d.getMonth() + 1}/${d.getDate()}`, cost: Math.round((base / dim) * pattern * wobble) };
  });

  return { asOf, trend, lines, last, prev, totalSpend, prevSpend, daily, kpis: result.kpis, result };
}

/* ---------- 비용 절감 제안 ---------- */

export interface Saving {
  id: string;
  title: string;
  detail: string;
  monthly: number;
  effort: "낮음" | "중간" | "높음";
  target: string;
}

const BIG_CLOUDS = new Set(["네이버클라우드", "KT클라우드", "NHN클라우드"]);

export async function getSavings(companyId: string): Promise<Saving[]> {
  const { result, data, asOf, bridge } = await getCompanyScore(companyId);
  const out: Saving[] = [];
  const last = result.workloads.filter((w) => w.month === asOf && w.funding === "paid" && w.source === "provider");

  for (const w of last) {
    if (w.classification === "inference" && w.avgUtilization < 0.65) {
      const save = Math.round(w.cost * (1 - w.avgUtilization / 0.8) * 0.8);
      if (save > 0)
        out.push({
          id: `util-${w.id}`,
          title: `${w.name}: 가동률 ${Math.round(w.avgUtilization * 100)}%`,
          detail: `GPU ${w.gpuCount}장 중 일부가 놀고 있습니다. 오토스케일링을 켜거나 인스턴스를 줄이면 가동률 80% 기준으로 비용을 맞출 수 있습니다.`,
          monthly: save,
          effort: "낮음",
          target: w.provider,
        });
    }
    if (w.classification === "inference" && BIG_CLOUDS.has(w.provider) && (w.gpuType === "L40S" || w.gpuType === "A100")) {
      out.push({
        id: `shared-${w.id}`,
        title: `${w.name}을 공유 GPU로 옮기기`,
        detail: `${w.gpuType} 추론 작업은 공유 GPU 플랫폼에서 더 싸게 돌릴 수 있습니다. 공유 플랫폼은 기존 클라우드보다 70~90% 싸다고 알려져 있어, 보수적으로 40% 절감으로 계산했습니다.`,
        monthly: Math.round(w.cost * 0.4),
        effort: "중간",
        target: "gcube 등 공유 GPU",
      });
    }
    if (w.classification === "training") {
      out.push({
        id: `train-${w.id}`,
        title: `${w.name}: 학습 배치를 예약·스팟으로`,
        detail: `학습 작업은 시간에 덜 민감합니다. 야간 예약이나 스팟 인스턴스로 돌리면 보통 30% 안팎을 아낄 수 있습니다.`,
        monthly: Math.round(w.cost * 0.3),
        effort: "중간",
        target: w.provider,
      });
    }
  }

  const llmLast = data.llm.filter((u) => u.month === asOf && u.funding === "paid");
  const premium = llmLast.filter((u) => /Sonnet|Opus|GPT-4\.1$/.test(u.model));
  const premiumCost = premium.reduce((a, u) => a + u.cost, 0);
  if (premiumCost > 0) {
    out.push({
      id: "routing",
      title: "단순 요청은 경량 모델로 라우팅",
      detail: `${premium.map((p) => p.model).filter((v, i, a) => a.indexOf(v) === i).join(", ")} 호출 중 분류·요약 같은 단순 요청을 Haiku·mini 급 모델로 보내면 품질 손실 없이 비용을 줄일 수 있습니다. 상위 모델 호출의 25%를 옮긴다고 가정했습니다.`,
      monthly: Math.round(premiumCost * 0.25 * 0.75),
      effort: "중간",
      target: "LLM 라우터",
    });
  }
  const llmTotal = llmLast.reduce((a, u) => a + u.cost, 0);
  if (llmTotal > 0) {
    out.push({
      id: "caching",
      title: "반복되는 시스템 프롬프트 캐싱",
      detail: "같은 시스템 프롬프트와 문서를 반복해서 보내고 있다면 프롬프트 캐싱으로 입력 토큰 비용을 크게 줄일 수 있습니다. 전체 LLM 비용의 10% 절감으로 계산했습니다.",
      monthly: Math.round(llmTotal * 0.1),
      effort: "낮음",
      target: "OpenAI·Anthropic",
    });
  }
  if (bridge) {
    out.push({
      id: "bridge",
      title: "정부 지원 종료 전에 GPU 견적 비교",
      detail: `${bridge.program.name}이 ${monthLabel(bridge.program.endMonth, true)}에 끝나면 지금 지원받는 GPU를 유료로 써야 합니다. 공유 GPU로 옮기면 늘어날 비용 ${Math.round(bridge.governmentCovered / 10_000).toLocaleString("ko-KR")}만원의 40%가량을 아낄 수 있습니다.`,
      monthly: Math.round(bridge.governmentCovered * 0.4),
      effort: "중간",
      target: "졸업 브릿지",
    });
  }
  return out.sort((a, b) => b.monthly - a.monthly);
}

/* ---------- 정책지원 매칭 ----------
 * 실제 공고 기준은 매년 바뀝니다. 여기서는 기업 데이터로 '먼저 검토할 사업'을 고르는 규칙만 보여 줍니다.
 */
export interface ProgramMatch {
  name: string;
  agency: string;
  benefit: string;
  fit: "추천" | "검토" | "해당 없음";
  reasons: string[];
}

export async function getProgramMatches(companyId: string, company: { foundedYear: number; model: string }): Promise<ProgramMatch[]> {
  const { result, data } = await getCompanyScore(companyId);
  const age = new Date().getFullYear() - company.foundedYear;
  const usesGpu = company.model !== "api";
  const hadVoucher = data.govPrograms.some((g) => g.kind === "voucher");
  const hasGpuProgram = data.govPrograms.some((g) => g.kind === "gpu");
  const annualRevenue = result.kpis.avgRevenue3 * 12;

  return [
    {
      name: "고성능 컴퓨팅 지원사업",
      agency: "정보통신산업진흥원(NIPA)",
      benefit: "GPU 클라우드 이용료 현물 지원",
      fit: hasGpuProgram ? "해당 없음" : usesGpu ? "추천" : "검토",
      reasons: hasGpuProgram
        ? ["이미 선정되어 지원받고 있습니다."]
        : usesGpu
          ? ["추론 GPU를 직접 운영하고 있습니다.", `최근 3개월 추론 GPU 비용이 월 ${Math.round(result.kpis.avgInferenceGpuCost3 / 10_000).toLocaleString("ko-KR")}만원입니다.`]
          : ["API형이라 GPU 지원의 효과가 작습니다. 자체 모델 서빙 계획이 있으면 검토하세요."],
    },
    {
      name: "AI 바우처 지원사업",
      agency: "정보통신산업진흥원(NIPA)",
      benefit: "AI 솔루션 도입·공급 비용 바우처",
      fit: hadVoucher ? "해당 없음" : age <= 7 ? "추천" : "검토",
      reasons: hadVoucher ? ["이전에 수혜 이력이 있습니다. 중복 지원 제한을 확인하세요."] : [`업력 ${age}년으로 초기 기업 요건에 가깝습니다.`, "AI 공급기업으로 참여하면 고객사 도입 비용을 줄여 줄 수 있습니다."],
    },
    {
      name: "지자체 클라우드 이용료 지원",
      agency: "지역 경제진흥원·테크노파크",
      benefit: "클라우드 이용료 일부 환급",
      fit: result.kpis.avgCompute3 > 0 ? "검토" : "해당 없음",
      reasons: ["본사 소재지 공고에 따라 지원 범위가 다릅니다.", "LLM API 비용은 제외되는 경우가 많아 GPU·서버 비용 위주로 신청하세요."],
    },
    {
      name: "AI·혁신 스타트업 보증",
      agency: "신용보증기금·기술보증기금",
      benefit: "운영자금 대출 보증",
      fit: age <= 7 && annualRevenue > 0 ? "추천" : "검토",
      reasons: [
        `연 환산 매출 ${Math.round(annualRevenue / 100_000_000).toLocaleString("ko-KR")}억원, 업력 ${age}년.`,
        "TokenScore 심사 리포트를 보증 신청 자료로 함께 낼 수 있습니다.",
      ],
    },
  ];
}
