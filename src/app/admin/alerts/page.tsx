import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { SeverityBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { requireUser } from "@/lib/auth/dal";
import { dateTimeKo } from "@/lib/format";
import { computeAllAlerts, type AlertSeverity } from "@/lib/services/alerts";
import { AckForm } from "../_components/ack-form";

export const metadata = { title: "조기 경보" };

const GROUPS: { severity: AlertSeverity; title: string; hint: string }[] = [
  { severity: "critical", title: "위험", hint: "사용량·매출 급감, 연체처럼 바로 조치가 필요한 신호입니다. 한도 정지를 검토하세요." },
  { severity: "warning", title: "주의", hint: "공급사 집중, 한도 소진, 검증 안 된 데이터처럼 지켜봐야 할 신호입니다." },
  { severity: "info", title: "참고", hint: "정부 지원 종료(졸업 브릿지 대상)나 판별이 필요한 워크로드입니다." },
];

export default async function AlertsPage() {
  await requireUser("admin");
  const alerts = await computeAllAlerts();
  const open = alerts.filter((a) => !a.acked && a.severity !== "info").length;

  return (
    <>
      <PageHeader
        title="조기 경보"
        description="경보는 저장된 원천 데이터에서 매번 다시 계산합니다. 원인이 사라지면 경보도 사라지고, 확인 처리한 경보는 메모와 함께 남습니다."
      />
      {alerts.length === 0 && (
        <Empty className="border border-line bg-surface">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldCheckIcon />
            </EmptyMedia>
            <EmptyTitle>경보가 없습니다</EmptyTitle>
            <EmptyDescription>모든 기업의 사용량, 매출, 상환이 정상 범위에 있습니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {alerts.length > 0 && <p className="mb-6 text-sm text-ink-soft">확인이 필요한 위험·주의 경보 {open}건</p>}

      {GROUPS.map((g) => {
        const items = alerts.filter((a) => a.severity === g.severity);
        if (!items.length) return null;
        return (
          <section key={g.severity} className="mb-9">
            <SectionTitle aside={`${items.length}건`}>{g.title}</SectionTitle>
            <p className="-mt-1 mb-3 text-sm text-ink-soft">{g.hint}</p>
            <Card className="py-0">
              <ul className="divide-y divide-line">
                {items.map((a) => (
                  <li key={`${a.companyId}-${a.key}`} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <SeverityBadge severity={a.severity} />
                      <div className="min-w-0 text-sm">
                        <p>
                          <Link href={`/admin/companies/${a.companyId}`} className="font-semibold underline-offset-4 hover:underline">
                            {a.companyName}
                          </Link>{" "}
                          <span className="font-medium">{a.title}</span>
                        </p>
                        <p className="text-ink-soft">{a.detail}</p>
                        {a.acked && (
                          <p className="mt-1 text-xs text-ink-soft">
                            확인함 {dateTimeKo(a.acked.at)}
                            {a.acked.note ? `: ${a.acked.note}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    {!a.acked && <AckForm companyId={a.companyId} alertKey={a.key} />}
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        );
      })}
    </>
  );
}
