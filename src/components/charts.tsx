"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { krw, krwShort } from "@/lib/format";
import { shortMonthLabel } from "@/lib/months";

/*
 * dataviz 규칙
 * - 색은 의미별 고정: LLM chart-1, 추론 GPU chart-2, 심사 제외 GPU chart-3, 매출 chart-4 (검증기 통과)
 * - 막대 24px 이하, 값 끝만 4px 둥글게, 누적 구간 사이 2px 바탕색 간격
 * - 선 2px, 끝 점 8px + 바탕색 링, 이중 축 금지
 * - 계열 2개 이상이면 범례, 모든 차트에 툴팁
 */

const SURFACE = "var(--surface)";
const axisTick = { fontSize: 11.5 };

const tooltipMoney = (value: unknown) => krw(Number(value));

export function CostTrendChart({
  data,
  showTraining = true,
  height = 260,
  title = "월별 컴퓨트 비용 (LLM API, 추론 GPU, 심사 제외 GPU 누적)",
}: {
  data: { month: string; llm: number; inference: number; training: number }[];
  showTraining?: boolean;
  height?: number;
  title?: string;
}) {
  const config = {
    llm: { label: "LLM API", color: "var(--chart-1)" },
    inference: { label: "추론 GPU", color: "var(--chart-2)" },
    ...(showTraining ? { training: { label: "학습·기타 GPU (심사 제외)", color: "var(--chart-3)" } } : {}),
  } satisfies ChartConfig;
  const rows = data.map((d) => ({ ...d, label: shortMonthLabel(d.month) }));
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={rows} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%" title={title} desc="방향키로 월을 옮기면 항목별 금액이 툴팁으로 나옵니다.">
        <CartesianGrid vertical={false} strokeWidth={1} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={axisTick} />
        <YAxis tickLine={false} axisLine={false} width={52} tick={axisTick} tickFormatter={(v) => krwShort(v)} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent valueFormatter={tooltipMoney} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="llm" stackId="a" fill="var(--color-llm)" maxBarSize={24} stroke={SURFACE} strokeWidth={2} />
        <Bar
          dataKey="inference"
          stackId="a"
          fill="var(--color-inference)"
          maxBarSize={24}
          stroke={SURFACE}
          strokeWidth={2}
          radius={showTraining ? 0 : [4, 4, 0, 0]}
        />
        {showTraining && (
          <Bar dataKey="training" stackId="a" fill="var(--color-training)" maxBarSize={24} stroke={SURFACE} strokeWidth={2} radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ChartContainer>
  );
}

export function RevenueComputeChart({
  data,
  height = 240,
  title = "월별 매출과 유료 컴퓨트 비용 추이",
}: {
  data: { month: string; revenue: number; compute: number }[];
  height?: number;
  title?: string;
}) {
  const config = {
    revenue: { label: "매출", color: "var(--chart-4)" },
    compute: { label: "유료 컴퓨트 (토큰 + 추론 GPU)", color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const rows = data.map((d) => ({ ...d, label: shortMonthLabel(d.month) }));
  const lastIdx = rows.length - 1;
  const endDot = (color: string) =>
    function EndDot(props: { cx?: number; cy?: number; index?: number }) {
      if (props.index !== lastIdx || props.cx === undefined || props.cy === undefined) return <g />;
      return <circle cx={props.cx} cy={props.cy} r={4.5} fill={color} stroke={SURFACE} strokeWidth={2} />;
    };
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <LineChart data={rows} margin={{ top: 12, right: 12, left: 4, bottom: 0 }} title={title} desc="방향키로 월을 옮기면 매출과 컴퓨트 금액이 툴팁으로 나옵니다.">
        <CartesianGrid vertical={false} strokeWidth={1} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={axisTick} />
        <YAxis tickLine={false} axisLine={false} width={52} tick={axisTick} tickFormatter={(v) => krwShort(v)} />
        <ChartTooltip content={<ChartTooltipContent valueFormatter={tooltipMoney} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} dot={endDot("var(--chart-4)")} activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }} />
        <Line dataKey="compute" type="monotone" stroke="var(--color-compute)" strokeWidth={2} dot={endDot("var(--chart-1)")} activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }} />
      </LineChart>
    </ChartContainer>
  );
}

export function DailyCostChart({
  data,
  height = 180,
  title = "최근 30일 일별 AI 비용",
}: {
  data: { date: string; cost: number }[];
  height?: number;
  title?: string;
}) {
  const config = { cost: { label: "일별 비용", color: "var(--chart-1)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="22%" title={title} desc="방향키로 날짜를 옮기면 금액이 툴팁으로 나옵니다.">
        <CartesianGrid vertical={false} strokeWidth={1} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={axisTick} interval={4} />
        <YAxis tickLine={false} axisLine={false} width={48} tick={axisTick} tickFormatter={(v) => krwShort(v)} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent valueFormatter={tooltipMoney} />} />
        <Bar dataKey="cost" fill="var(--color-cost)" maxBarSize={16} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

/** 등급별 익스포저: 단일 계열이라 범례 없이 제목이 계열을 말합니다. 값은 막대 끝에 표시합니다. */
export function GradeExposureChart({
  data,
  height = 220,
  title = "등급별 사용 중인 한도",
}: {
  data: { grade: string; exposure: number; companies: number }[];
  height?: number;
  title?: string;
}) {
  const config = { exposure: { label: "사용 중인 한도", color: "var(--chart-4)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} margin={{ top: 22, right: 4, left: 4, bottom: 0 }} barCategoryGap="30%" title={title} desc="방향키로 등급을 옮기면 금액이 툴팁으로 나옵니다.">
        <CartesianGrid vertical={false} strokeWidth={1} />
        <XAxis dataKey="grade" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 12, fontWeight: 600 }} tickFormatter={(g) => `${g}등급`} />
        <YAxis tickLine={false} axisLine={false} width={48} tick={axisTick} tickFormatter={(v) => krwShort(v)} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={<ChartTooltipContent valueFormatter={tooltipMoney} />}
        />
        <Bar dataKey="exposure" fill="var(--color-exposure)" maxBarSize={24} radius={[4, 4, 0, 0]}>
          <LabelList dataKey="exposure" position="top" offset={6} className="fill-ink-soft" fontSize={11.5} formatter={(v: unknown) => (Number(v) > 0 ? krwShort(Number(v)) : "")} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
