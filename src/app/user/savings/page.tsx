import { PiggyBankIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Num } from "@/components/metrics";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { requireCompanyMember } from "@/lib/auth/dal";
import { krw } from "@/lib/format";
import { getSavings, type Saving } from "@/lib/services/insights";

export const metadata = { title: "절감 제안" };

const EFFORT_VARIANT: Record<Saving["effort"], "money" | "neutral"> = { 낮음: "money", 중간: "neutral", 높음: "neutral" };

export default async function SavingsPage() {
  const { company } = await requireCompanyMember("user");
  const savings = await getSavings(company.id);
  const total = savings.reduce((a, x) => a + x.monthly, 0);

  return (
    <>
      <PageHeader
        title="절감 제안"
        description="지난달 공급사 사용 기록을 보고 바로 실행할 수 있는 비용 절감 방법을 골랐습니다. 금액은 보수적으로 잡은 추정치입니다."
      />

      {savings.length === 0 ? (
        <Empty className="rounded-xl bg-surface shadow-elev-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PiggyBankIcon />
            </EmptyMedia>
            <EmptyTitle>지금은 제안할 절감 방법이 없습니다</EmptyTitle>
            <EmptyDescription>GPU 가동률과 모델 사용이 이미 효율적입니다. 다음 달 사용 기록이 들어오면 다시 확인합니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-xl bg-surface px-5 py-4 shadow-elev-sm">
            <div>
              <p className="text-[12.5px] font-medium text-ink-soft">모두 실행하면 아낄 수 있는 금액</p>
              <p className="mt-1 text-[30px] leading-tight font-[760] tracking-[-0.03em] text-money-strong">월 {krw(total)}</p>
            </div>
            <p className="text-[13px] text-ink-soft">
              제안 <Num className="font-semibold text-ink">{savings.length}</Num>건
            </p>
          </div>

          <ul className="flex flex-col gap-4">
            {savings.map((x) => (
              <li key={x.id}>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="text-[15px]">{x.title}</CardTitle>
                    <CardDescription>대상: {x.target}</CardDescription>
                    <CardAction>
                      <Badge variant={EFFORT_VARIANT[x.effort]}>난이도 {x.effort}</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
                    <p className="max-w-[68ch] text-[13.5px] text-ink-soft">{x.detail}</p>
                    <p className="shrink-0 sm:text-right">
                      <span className="block text-[12px] text-ink-soft">월 절감 예상</span>
                      <Num className="text-[18px] font-[720] text-money-strong">{krw(x.monthly)}</Num>
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
