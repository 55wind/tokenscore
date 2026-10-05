import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus, CompanyStatus, ConnectionStatus, CreditLineStatus, PaymentStatus, RepaymentStatus } from "@/lib/db/schema";

type Variant = "money" | "compute" | "risk" | "caution" | "neutral" | "outline";

const MAP = {
  payment: {
    requested: ["회사 승인 대기", "caution"],
    approved: ["집행 대기", "compute"],
    paid: ["결제 완료", "money"],
    rejected: ["반려", "neutral"],
  },
  application: {
    submitted: ["심사 중", "caution"],
    approved: ["승인", "money"],
    rejected: ["거절", "risk"],
    withdrawn: ["철회", "neutral"],
  },
  repayment: {
    scheduled: ["예정", "neutral"],
    paid: ["상환 완료", "money"],
    overdue: ["연체", "risk"],
  },
  line: {
    active: ["사용 중", "money"],
    frozen: ["정지", "risk"],
    closed: ["종료", "neutral"],
  },
  company: {
    onboarding: ["온보딩", "neutral"],
    active: ["정상", "money"],
    watch: ["관찰", "risk"],
  },
  connection: {
    connected: ["연결됨", "money"],
    disconnected: ["연결 안 됨", "neutral"],
    error: ["오류", "risk"],
  },
} satisfies Record<string, Record<string, [string, Variant]>>;

type Kinds = {
  payment: PaymentStatus;
  application: ApplicationStatus;
  repayment: RepaymentStatus;
  line: CreditLineStatus;
  company: CompanyStatus;
  connection: ConnectionStatus;
};

export function StatusBadge<K extends keyof Kinds>({ kind, status }: { kind: K; status: Kinds[K] }) {
  const [label, variant] = (MAP[kind] as Record<string, [string, Variant]>)[status] ?? [status, "neutral"];
  return <Badge variant={variant}>{label}</Badge>;
}

export function SeverityBadge({ severity }: { severity: "info" | "warning" | "critical" }) {
  if (severity === "critical") return <Badge variant="risk">위험</Badge>;
  if (severity === "warning") return <Badge variant="caution">주의</Badge>;
  return <Badge variant="neutral">참고</Badge>;
}
