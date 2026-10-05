"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/action-result";

/**
 * 서버 액션을 실행하고 결과를 토스트로 알려 주는 폼.
 * 액션이 끝나면 페이지가 다시 그려지면서 이 폼이 사라질 수 있습니다(예: 신청 후 신청 폼이 '심사 중'으로 바뀜).
 * 그래서 effect가 아니라 액션이 끝난 그 자리에서 바로 토스트를 띄웁니다.
 * 버튼 이름과 성공 메시지가 같은 동사를 쓰도록 호출하는 쪽에서 맞춥니다. (예: "승인" → "승인했습니다")
 */
export function ActionForm({
  action,
  children,
  className,
  onDone,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  onDone?: (result: ActionResult) => void;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  const [, formAction] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const result = await action(prev, formData);
    if (result) {
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      onDoneRef.current?.(result);
    }
    return result;
  }, null);
  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}

/** 폼이 제출 중이면 스스로 비활성화되고 스피너를 보여 줍니다. */
export function SubmitButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" {...props} disabled={pending || props.disabled}>
      {pending && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  );
}
