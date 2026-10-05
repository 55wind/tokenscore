"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { acknowledgeAlertAction } from "../actions";

export function AckForm({ companyId, alertKey }: { companyId: string; alertKey: string }) {
  const id = `ack-${companyId}-${alertKey}`;
  return (
    <ActionForm action={acknowledgeAlertAction} className="flex w-full items-center gap-2 sm:w-auto">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="key" value={alertKey} />
      <label htmlFor={id} className="sr-only">
        조치 메모
      </label>
      <Input id={id} name="note" placeholder="조치 메모 (선택)" className="h-8 min-w-0 flex-1 sm:w-56" />
      <SubmitButton size="sm" variant="outline">
        확인 처리
      </SubmitButton>
    </ActionForm>
  );
}
