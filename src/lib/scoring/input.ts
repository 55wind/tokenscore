import type * as s from "@/lib/db/schema";
import type { ScoringInput } from "./types";

/** DB 행을 심사 엔진 입력으로 바꿉니다. asOfMonth 이후 데이터는 넣지 않습니다. */
export function scoringInputFrom(
  asOfMonth: string,
  data: {
    llm: (typeof s.llmUsage.$inferSelect)[];
    gpu: (typeof s.gpuWorkloads.$inferSelect)[];
    revenue: (typeof s.revenue.$inferSelect)[];
    govPrograms: (typeof s.govPrograms.$inferSelect)[];
    investments: (typeof s.investments.$inferSelect)[];
  },
): ScoringInput {
  const upTo = (m: string) => m <= asOfMonth;
  return {
    asOfMonth,
    llm: data.llm.filter((x) => upTo(x.month)),
    gpu: data.gpu.filter((x) => upTo(x.month)),
    revenue: data.revenue.filter((x) => upTo(x.month)),
    signals: {
      govPrograms: data.govPrograms.map((g) => ({ name: g.name, startMonth: g.startMonth, endMonth: g.endMonth })),
      investments: data.investments.map((i) => ({ round: i.round, amount: i.amount, month: i.month })),
    },
  };
}
