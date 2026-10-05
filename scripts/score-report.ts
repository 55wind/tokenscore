/** 기업별 TokenScore를 콘솔에 출력합니다. 심사 모델을 조정할 때 씁니다. */
async function main() {
  const { db, schema: s } = await import("../src/lib/db");
  const { eq } = await import("drizzle-orm");
  const { scoringInputFrom } = await import("../src/lib/scoring/input");
  const { scoreCompany, bridgeProjection } = await import("../src/lib/scoring/engine");
  const { DEFAULT_SCORE_CONFIG } = await import("../src/lib/scoring/config");
  const { lastClosedMonth } = await import("../src/lib/months");
  const { krw, pct } = await import("../src/lib/format");

  const asOf = lastClosedMonth();
  for (const c of await db.select().from(s.companies)) {
    const input = scoringInputFrom(asOf, {
      llm: await db.select().from(s.llmUsage).where(eq(s.llmUsage.companyId, c.id)),
      gpu: await db.select().from(s.gpuWorkloads).where(eq(s.gpuWorkloads.companyId, c.id)),
      revenue: await db.select().from(s.revenue).where(eq(s.revenue.companyId, c.id)),
      govPrograms: await db.select().from(s.govPrograms).where(eq(s.govPrograms.companyId, c.id)),
      investments: await db.select().from(s.investments).where(eq(s.investments.companyId, c.id)),
    });
    const r = scoreCompany(input, DEFAULT_SCORE_CONFIG);
    console.log(
      `\n${c.name} [${r.status}] ${r.score}점 ${r.grade}등급 → 한도 ${krw(r.limit.amount)} (${r.limit.binding}), 추천 ${r.recommendation}`,
    );
    console.log(
      `  컴퓨트 ${krw(r.kpis.avgCompute3)}/월, 매출 ${krw(r.kpis.avgRevenue3)}/월, 효율 ${r.kpis.computeEfficiency.toFixed(2)}, 성장 ${pct(r.kpis.usageGrowth)}, 변동 ${pct(r.kpis.volatility)}, 최대공급사 ${r.kpis.topProvider} ${pct(r.kpis.topProviderShare, 0)}`,
    );
    console.log("  " + r.subScores.map((x) => `${x.label} ${x.score}(${x.points})`).join(" · ") + " · 가점 " + r.bonusPoints.map((b) => b.points).join("+"));
    for (const f of r.flags) console.log(`  [${f.severity}] ${f.message}`);
    const b = bridgeProjection(input, r);
    if (b) console.log(`  브릿지: ${b.program.name} ~${b.program.endMonth}, 다음 달 예상 ${krw(b.projectedNext)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
