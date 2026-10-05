import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { scoringInputFrom } from "@/lib/scoring/input";
import { lastClosedMonth } from "@/lib/months";
import { mergeConfig } from "@/lib/scoring/config";
import { bridgeProjection, scoreCompany } from "@/lib/scoring/engine";
import type { ScoreConfig } from "@/lib/scoring/types";

export const getScoreConfig = cache(async (): Promise<ScoreConfig> => {
  const [row] = await db.select().from(s.settings).where(eq(s.settings.key, "score_config")).limit(1);
  return mergeConfig(row?.value);
});

export async function saveScoreConfig(config: ScoreConfig) {
  await db
    .insert(s.settings)
    .values({ key: "score_config", value: config, updatedAt: new Date() })
    .onConflictDoUpdate({ target: s.settings.key, set: { value: config, updatedAt: new Date() } });
}

/** 기업의 원천 데이터를 한 번에 읽습니다. */
export const loadCompanyData = cache(async (companyId: string) => {
  const [llm, gpu, revenue, govPrograms, investments, connections] = await Promise.all([
    db.select().from(s.llmUsage).where(eq(s.llmUsage.companyId, companyId)),
    db.select().from(s.gpuWorkloads).where(eq(s.gpuWorkloads.companyId, companyId)),
    db.select().from(s.revenue).where(eq(s.revenue.companyId, companyId)),
    db.select().from(s.govPrograms).where(eq(s.govPrograms.companyId, companyId)),
    db.select().from(s.investments).where(eq(s.investments.companyId, companyId)),
    db.select().from(s.connections).where(eq(s.connections.companyId, companyId)),
  ]);
  // 연결이 끊긴 공급사의 데이터는 심사에 쓰지 않습니다.
  const connected = new Set(connections.filter((c) => c.status === "connected").map((c) => c.provider));
  return {
    llm: llm.filter((x) => connected.has(x.provider)),
    gpu: gpu.filter((x) => x.source === "self_reported" || connected.has(x.provider)),
    revenue: connections.some((c) => c.category === "pg" && c.status === "connected") ? revenue : [],
    govPrograms,
    investments,
    connections,
  };
});

/** 기업의 현재 TokenScore. 화면·신청·심사가 모두 이 함수를 씁니다. */
export const getCompanyScore = cache(async (companyId: string) => {
  const [data, config] = await Promise.all([loadCompanyData(companyId), getScoreConfig()]);
  const asOf = lastClosedMonth();
  const input = scoringInputFrom(asOf, data);
  const result = scoreCompany(input, config);
  return { input, result, config, bridge: bridgeProjection(input, result), asOf, data };
});
