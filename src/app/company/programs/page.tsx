import Link from "next/link";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCompanyMember } from "@/lib/auth/dal";
import { krw } from "@/lib/format";
import { monthLabel } from "@/lib/months";
import { getProgramMatches } from "@/lib/services/insights";
import { getCompanyScore } from "@/lib/services/scoring";
import { getLineSummary } from "@/lib/services/credit";

export const metadata = { title: "정부 지원 매칭" };

export default async function ProgramsPage() {
  const { company } = await requireCompanyMember("company");
  const [{ bridge, data }, matches, line] = await Promise.all([
    getCompanyScore(company.id),
    getProgramMatches(company.id, company),
    getLineSummary(company.id),
  ]);

  return (
    <>
      <PageHeader
        title="정부 지원 매칭"
        description="회사 데이터로 먼저 검토할 지원 사업을 고릅니다. 실제 자격과 금액은 매년 공고가 바뀌니 신청 전에 공고문을 확인하세요."
      />

      {bridge && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>졸업 브릿지</CardTitle>
            <CardDescription>
              {bridge.program.name}이 {monthLabel(bridge.program.endMonth, true)}에 끝납니다. 지원 기간에 쌓인 사용 기록을 심사에 그대로 반영해, 유료로 넘어가는 달에 비용이 끊기지 않게 합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-5 text-[13.5px] sm:grid-cols-3">
              <div>
                <dt className="text-ink-soft">지금 직접 내는 컴퓨트</dt>
                <dd className="num text-[22px] font-[720]">{krw(bridge.currentPaid)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">정부 지원으로 충당 중</dt>
                <dd className="num text-[22px] font-[720] text-compute">{krw(bridge.governmentCovered)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">지원 종료 후 예상 비용 (다음 달)</dt>
                <dd className="num text-[22px] font-[720]">{krw(bridge.projectedNext)}</dd>
                <dd className="text-[12.5px] text-ink-soft">사용량 성장률과 단가 여유분 12%를 반영했습니다.</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {line ? (
                <Button asChild>
                  <Link href="/company/pay">늘어난 청구서 결제하기</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/company/credit">브릿지 한도 신청</Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/company/costs">공유 GPU 절감 효과 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <SectionTitle>추천 지원 사업</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {matches.map((m) => (
          <Card key={m.name} size="sm">
            <CardHeader>
              <CardTitle>{m.name}</CardTitle>
              <CardDescription>
                {m.agency}. {m.benefit}
              </CardDescription>
              <CardAction>
                <Badge variant={m.fit === "추천" ? "money" : m.fit === "검토" ? "caution" : "neutral"}>{m.fit}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-[13.5px] text-ink-soft">
                {m.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.govPrograms.length > 0 && (
        <>
          <SectionTitle className="mt-9">수혜 이력</SectionTitle>
          <ul className="flex flex-col gap-1.5 text-[13.5px]">
            {data.govPrograms.map((g) => (
              <li key={g.id}>
                <span className="font-medium">{g.name}</span>{" "}
                <span className="text-ink-soft">
                  {g.agency}, {monthLabel(g.startMonth, true)}부터 {monthLabel(g.endMonth, true)}까지, {krw(g.amount)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12.5px] text-ink-soft">정부 지원 선정 이력은 TokenScore에 가점으로 반영됩니다. 지원으로 쓴 사용량 자체는 지표에 넣지 않습니다.</p>
        </>
      )}
    </>
  );
}
