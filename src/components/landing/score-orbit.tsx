"use client";

import { useState } from "react";
import {
  ActivityIcon,
  BadgeCheckIcon,
  CpuIcon,
  GaugeIcon,
  NetworkIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Node {
  key: string;
  label: string;
  kind: "지표" | "정제";
  title: string;
  body: string;
  icon: LucideIcon;
  tone: string;
}

/** 심사 기준 여덟 가지: 점수 지표 다섯 + 데이터 정제 원칙 셋 (기획안 4-3). */
const NODES: Node[] = [
  { key: "eff", label: "효율성", kind: "지표", title: "컴퓨트를 돈으로 바꾸는 능력", body: "컴퓨트 1원당 매출, 토큰 100만 개당 매출, 추론 GPU 1시간당 매출과 가동률을 봅니다. 비중 35%.", icon: GaugeIcon, tone: "bg-primary text-white" },
  { key: "growth", label: "성장성", kind: "지표", title: "사업이 커지는 속도", body: "최근 6개월 사용량의 월 복리 성장률. 단가가 내려가도 불리하지 않게 사용량 기준으로 계산합니다. 비중 20%.", icon: TrendingUpIcon, tone: "bg-chart-4 text-white" },
  { key: "stab", label: "안정성", kind: "지표", title: "사용이 꾸준히 이어지는지", body: "월간 사용량 변동성과 추론 서빙이 끊기지 않는지를 봅니다. 비중 15%.", icon: ActivityIcon, tone: "bg-chart-1 text-white" },
  { key: "biz", label: "사업의 질", kind: "지표", title: "매출의 질", body: "매출 성장률, 고객 리텐션, 매출총이익률을 함께 봅니다. 비중 20%.", icon: BadgeCheckIcon, tone: "bg-navy text-white" },
  { key: "conc", label: "공급사 분산", kind: "지표", title: "외부 충격에 버티는 힘", body: "LLM·GPU 공급사 한 곳에 얼마나 몰려 있는지 봅니다. 비중 10%.", icon: NetworkIcon, tone: "bg-mint-strong text-white" },
  { key: "infer", label: "추론·학습 판별", kind: "정제", title: "학습용 GPU는 뺍니다", body: "엔드포인트 트래픽이 있고 상시 도는 작업만 추론으로 봅니다. 몰아서 도는 학습 배치는 연구개발 비용이라 한도에서 뺍니다.", icon: CpuIcon, tone: "bg-chart-3 text-white" },
  { key: "paid", label: "유료 사용분만", kind: "정제", title: "무료 크레딧은 세지 않습니다", body: "정부 지원과 무료 크레딧으로 쓴 양은 지표에 넣지 않습니다. 선정 이력은 가점으로 따로 줍니다.", icon: ReceiptTextIcon, tone: "bg-coral text-white" },
  { key: "src", label: "공급사 데이터만", kind: "정제", title: "자체 신고는 받지 않습니다", body: "공급사가 보낸 청구 데이터만 인정해 사용량 부풀리기를 막습니다.", icon: ShieldCheckIcon, tone: "bg-ink text-white" },
];

export function ScoreOrbit() {
  const [active, setActive] = useState<string | null>(null);
  const node = NODES.find((n) => n.key === active) ?? null;

  const center = (
    <div className="relative z-10 w-[min(280px,80vw)] rounded-3xl bg-navy px-6 py-6 text-center text-white shadow-elev-lg" aria-live="polite">
      {node ? (
        <>
          <p className="text-xs font-bold tracking-[0.12em] text-sky-strong">{node.kind === "지표" ? "점수 지표" : "데이터 정제"}</p>
          <p className="mt-2 text-xl font-extrabold">{node.title}</p>
          <p className="mt-2 text-sm text-white/75">{node.body}</p>
        </>
      ) : (
        <>
          <p className="text-xs font-bold tracking-[0.12em] text-sky-strong">TOKENSCORE</p>
          <p className="mt-1 text-[56px] leading-none font-extrabold tracking-[-0.04em]">1000</p>
          <p className="mt-2 text-sm text-white/75">다섯 가지 지표를 더하고 정부 지원·투자 가점을 붙여 1000점 만점으로 매깁니다. 항목을 눌러 보세요.</p>
        </>
      )}
    </div>
  );

  const button = (n: Node, i: number) => {
    const Icon = n.icon;
    const on = active === n.key;
    return (
      <button
        key={n.key}
        type="button"
        onClick={() => setActive(on ? null : n.key)}
        onMouseEnter={() => setActive(n.key)}
        onFocus={() => setActive(n.key)}
        aria-pressed={on}
        className={cn(
          "group flex flex-col items-center gap-2 rounded-2xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "md:absolute md:-translate-x-1/2 md:-translate-y-1/2",
        )}
        style={{ "--i": i } as React.CSSProperties}
        data-orbit-node=""
      >
        <span
          className={cn(
            "grid size-14 place-items-center rounded-full border-4 border-surface shadow-elev-md transition-transform duration-200 ease-(--ease-out) group-hover:scale-110 md:size-16",
            n.tone,
            on && "scale-110 ring-4 ring-primary/25",
          )}
        >
          <Icon className="size-6 md:size-7" strokeWidth={2.2} />
        </span>
        <span className={cn("text-sm font-bold", on ? "text-primary" : "text-ink")}>{n.label}</span>
        <span className="text-xs font-medium text-ink-soft">{n.kind}</span>
      </button>
    );
  };

  return (
    <div>
      {/* 데스크톱: 원형 궤도 */}
      <div className="relative mx-auto hidden aspect-square w-full max-w-[600px] md:block">
        <div className="absolute inset-[8%] rounded-full border-2 border-dashed border-line-strong" />
        <div className="absolute inset-[26%] rounded-full bg-gradient-to-br from-sky to-mint" />
        <div className="absolute inset-0 grid place-items-center">{center}</div>
        {NODES.map((n, i) => {
          const angle = (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
          const r = 42; // %
          return (
            <div key={n.key} className="absolute" style={{ left: `${50 + r * Math.cos(angle)}%`, top: `${50 + r * Math.sin(angle)}%` }}>
              {button(n, i)}
            </div>
          );
        })}
      </div>
      {/* 모바일: 가운데 설명 + 2열 격자 */}
      <div className="flex flex-col items-center gap-6 md:hidden">
        {center}
        <div className="grid w-full grid-cols-4 gap-y-4">{NODES.map((n, i) => button(n, i))}</div>
      </div>
    </div>
  );
}
