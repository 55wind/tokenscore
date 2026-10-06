import { PageHeader, SectionTitle } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireCompanyMember } from "@/lib/auth/dal";
import { dateTimeKo } from "@/lib/format";
import { CATEGORY_LABEL, PROVIDER_CATALOG } from "@/lib/services/connections";
import { loadCompanyData } from "@/lib/services/scoring";
import type { ConnectionCategory } from "@/lib/db/schema";
import { ConnectionActions } from "./connection-actions";

export const metadata = { title: "데이터 연동" };

const CATEGORY_NOTE: Record<ConnectionCategory, string> = {
  llm: "토큰 사용량과 청구 금액을 공급사 빌링 API로 가져옵니다. 무료 크레딧 사용분은 따로 표시합니다.",
  gpu: "GPU 인스턴스별 가동 시간, 가동률, 엔드포인트 여부로 추론과 학습을 나눕니다.",
  pg: "PG 정산 내역으로 월 매출, 고객 수, 리텐션을 계산합니다.",
  bank: "매출이 들어오는 계좌입니다. Compute Pay 상환이 이 계좌에서 자동으로 빠져나갑니다.",
};

export default async function ConnectionsPage() {
  const { company } = await requireCompanyMember("company");
  const { connections } = await loadCompanyData(company.id);
  const categories: ConnectionCategory[] = ["llm", "gpu", "pg", "bank"];

  return (
    <>
      <PageHeader
        title="데이터 연동"
        description="공급사가 보낸 청구 데이터만 심사에 씁니다. 연결은 언제든 해제할 수 있고, 해제한 공급사의 데이터는 바로 심사에서 빠집니다."
      />
      <div className="flex flex-col gap-9">
        {categories.map((cat) => {
          const items = PROVIDER_CATALOG.filter((p) => p.category === cat).map((p) => ({
            ...p,
            conn: connections.find((c) => c.provider === p.provider) ?? null,
          }));
          // 은행은 연결된 곳과 우리 회사 기록이 있는 곳만 보여 줍니다. 나머지는 '다른 은행 연결'에서 고릅니다.
          const visible = cat === "bank" ? items.filter((i) => i.conn) : items;
          const connectedCount = items.filter((i) => i.conn?.status === "connected").length;
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <SectionTitle aside={`${connectedCount}곳 연결`}>
                <span id={`cat-${cat}`}>{CATEGORY_LABEL[cat]}</span>
              </SectionTitle>
              <p className="-mt-1 mb-3 max-w-[70ch] text-sm text-ink-soft">{CATEGORY_NOTE[cat]}</p>
              <Card className="py-0">
                <CardContent className="px-0">
                  <ul className="divide-y divide-line">
                    {visible.map(({ provider, via, conn }) => (
                      <li key={provider} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            {provider}
                            <StatusBadge kind="connection" status={conn?.status ?? "disconnected"} />
                          </p>
                          <p className="text-xs text-ink-soft">
                            {via}
                            {conn?.account ? `, ${conn.account}` : ""}
                            {conn?.status === "connected" && conn.lastSyncAt ? `. 마지막 동기화 ${dateTimeKo(conn.lastSyncAt)}` : ""}
                          </p>
                        </div>
                        <ConnectionActions provider={provider} connected={conn?.status === "connected"} category={cat} />
                      </li>
                    ))}
                    {cat === "bank" && (
                      <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div>
                          <p className="text-sm font-semibold">다른 은행 계좌</p>
                          <p className="text-xs text-ink-soft">오픈뱅킹으로 연결합니다. 상환 계좌는 하나만 쓸 수 있습니다.</p>
                        </div>
                        <ConnectionActions
                          category="bank"
                          connected={false}
                          choices={items.filter((i) => !i.conn).map((i) => i.provider)}
                        />
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </section>
          );
        })}
      </div>
    </>
  );
}
