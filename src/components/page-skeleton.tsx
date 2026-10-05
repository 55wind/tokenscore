import { Skeleton } from "@/components/ui/skeleton";

/**
 * 포털 페이지 로딩 화면. 서버가 점수와 한도를 계산하는 동안 실제 화면과 같은 배치를 먼저 보여 줘서
 * 내용이 들어올 때 레이아웃이 흔들리지 않게 합니다.
 */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">불러오는 중입니다</span>
      <div className="mb-7 flex flex-col gap-2.5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-[520px]" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Skeleton className="h-[260px] rounded-xl" />
        <Skeleton className="h-[260px] rounded-xl" />
      </div>
      <Skeleton className="mt-5 h-[92px] rounded-xl" />
      <Skeleton className="mt-5 h-[300px] rounded-xl" />
    </div>
  );
}
