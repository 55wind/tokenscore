import { Badge } from "@/components/ui/badge";
import type { Application } from "@/lib/db/schema";

export function RecommendationBadge({ value }: { value: Application["recommendation"] }) {
  if (value === "approve") return <Badge variant="money">승인 권고</Badge>;
  if (value === "reject") return <Badge variant="risk">거절 권고</Badge>;
  return <Badge variant="caution">심사역 검토</Badge>;
}
