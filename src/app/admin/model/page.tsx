import Link from "next/link";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Num } from "@/components/metrics";
import { GradeMark } from "@/components/score-meter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { krw, num, pct } from "@/lib/format";
import { getScoreConfig } from "@/lib/services/scoring";
import { getCompanyOverviews } from "@/lib/services/admin-queries";
import { resetDemoAction } from "../actions";
import { ConfirmAction } from "../_components/confirm-action";
import { ModelForm } from "../_components/model-form";
import { RecommendationBadge } from "../_components/recommendation-badge";

export const metadata = { title: "심사 모델" };

export default async function ModelPage() {
  await requireUser("admin");
  const [config, overviews] = await Promise.all([getScoreConfig(), getCompanyOverviews()]);
  const rows = [...overviews].sort((a, b) => b.result.score - a.result.score);

  return (
    <>
      <PageHeader
        title="심사 모델"
        description="지금은 규칙 기반 모델입니다. 데이터가 쌓이면 같은 지표를 입력으로 머신러닝 모델로 바꿉니다. 저장하면 모든 기업 점수와 산정 한도가 바로 다시 계산됩니다."
      />

      <ModelForm config={config} />

      <SectionTitle className="mt-9" aside="저장된 모델 기준">
        다시 계산한 결과
      </SectionTitle>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">기업</TableHead>
              <TableHead>등급</TableHead>
              <TableHead className="text-right">점수</TableHead>
              <TableHead className="text-right">계수</TableHead>
              <TableHead className="text-right">수수료</TableHead>
              <TableHead className="text-right">산정 한도</TableHead>
              <TableHead className="text-right">현재 승인 한도</TableHead>
              <TableHead className="pr-4">시스템 의견</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ company, result, line }) => {
              const scored = result.status === "scored";
              return (
                <TableRow key={company.id}>
                  <TableCell className="pl-4">
                    <Link href={`/admin/companies/${company.id}`} className="font-semibold underline-offset-4 hover:underline">
                      {company.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <GradeMark grade={scored ? result.grade : "-"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Num>{scored ? result.score : "보류"}</Num>
                  </TableCell>
                  <TableCell className="text-right">
                    <Num>{scored ? num(result.coefficient, 2) : "-"}</Num>
                  </TableCell>
                  <TableCell className="text-right">
                    <Num>{scored ? pct(result.feeRate) : "-"}</Num>
                  </TableCell>
                  <TableCell className="text-right">
                    <Num className="font-semibold">{krw(result.limit.amount)}</Num>
                  </TableCell>
                  <TableCell className="text-right">
                    <Num className={line && line.limitAmount > result.limit.amount ? "text-risk" : "text-ink-soft"}>{line ? krw(line.limitAmount) : "-"}</Num>
                  </TableCell>
                  <TableCell className="pr-4">
                    <RecommendationBadge value={result.recommendation} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      <p className="mt-2 text-[12.5px] text-ink-soft">현재 승인 한도가 산정 한도보다 크면 빨간색으로 표시합니다. 한도 재조정이나 정지를 검토할 대상입니다.</p>

      <Card className="mt-9">
        <CardHeader>
          <CardTitle>데모 데이터 초기화</CardTitle>
          <CardDescription>발표 전에 모든 기업, 신청, 결제, 상환, 감사 로그를 처음 상태로 되돌립니다. 심사 모델도 기본값으로 돌아갑니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmAction
            action={resetDemoAction}
            triggerLabel="데모 데이터 초기화"
            triggerVariant="destructive"
            triggerSize="default"
            title="데모 데이터를 처음 상태로 되돌릴까요?"
            description="지금까지 처리한 신청, 결제, 상환, 모델 변경이 모두 지워지고 시드 데이터로 다시 만들어집니다. 되돌릴 수 없습니다."
            confirmLabel="초기화"
            confirmVariant="destructive"
          />
        </CardContent>
      </Card>
    </>
  );
}
