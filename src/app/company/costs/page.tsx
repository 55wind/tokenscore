import Link from "next/link";
import { CostDashboard } from "@/components/cost-dashboard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireCompanyMember } from "@/lib/auth/dal";

export const metadata = { title: "AI 비용" };

export default async function CompanyCostsPage() {
  const { company } = await requireCompanyMember("company");
  return (
    <>
      <PageHeader
        title="AI 비용"
        description="공급사 청구 기준으로 실제 나간 돈을 모두 보여 줍니다. 심사에서 빼는 학습용 GPU와 지원·크레딧 사용분도 따로 표시합니다."
        actions={
          <Button asChild variant="outline">
            <Link href="/company/score">심사에 쓰인 기준 보기</Link>
          </Button>
        }
      />
      <CostDashboard companyId={company.id} showRevenue />
    </>
  );
}
