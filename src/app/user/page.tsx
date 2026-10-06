import Link from "next/link";
import { CostDashboard } from "@/components/cost-dashboard";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireCompanyMember } from "@/lib/auth/dal";

export const metadata = { title: "AI 비용" };

export default async function UserHome() {
  const { company } = await requireCompanyMember("user");
  return (
    <>
      <PageHeader
        title="AI 비용"
        description={`${company.name}이 쓰는 LLM API와 GPU 비용을 공급사 청구 기록 그대로 보여 줍니다.`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/user/savings">절감 제안 보기</Link>
            </Button>
            <Button asChild>
              <Link href="/user/requests">청구서 결제 요청</Link>
            </Button>
          </>
        }
      />
      <CostDashboard companyId={company.id} />

      <SectionTitle className="mt-9">심사 제외란</SectionTitle>
      <p className="max-w-[72ch] text-sm text-ink-soft">
        TokenScore는 매출과 직접 이어지는 유료 추론 사용만 회사의 신용 평가에 씁니다. 엔드포인트 없이 며칠 동안 몰아서 도는 학습 작업, 정부 지원과 무료 크레딧으로 쓴
        사용분, 공급사가 아니라 회사가 직접 신고한 기록은 지출로는 보이지만 한도 계산에서는 빠집니다. 추론인지 학습인지 판별이 안 되는 작업도 보수적으로 뺍니다.
      </p>
    </>
  );
}
