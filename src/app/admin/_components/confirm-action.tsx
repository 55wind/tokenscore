"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";

type Variant = React.ComponentProps<typeof Button>["variant"];

/**
 * 되돌리기 어렵거나 돈이 움직이는 처리를 확인받는 대화상자.
 * 사유가 필요하면 reason을 넘깁니다. 처리 결과는 토스트로 알리고, 성공하면 닫힙니다.
 */
export function ConfirmAction({
  action,
  hidden = {},
  triggerLabel,
  triggerVariant = "outline",
  triggerSize = "sm",
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  reason,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  hidden?: Record<string, string>;
  triggerLabel: string;
  triggerVariant?: Variant;
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  confirmVariant?: Variant;
  reason?: { name: string; label: string; placeholder?: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <ActionForm action={action} onDone={(r) => r?.ok && setOpen(false)} className="flex flex-col gap-4">
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          {reason && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`reason-${reason.name}`}>{reason.label}</FieldLabel>
                <Textarea id={`reason-${reason.name}`} name={reason.name} placeholder={reason.placeholder} rows={3} required minLength={4} />
              </Field>
            </FieldGroup>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <SubmitButton variant={confirmVariant}>{confirmLabel}</SubmitButton>
          </AlertDialogFooter>
        </ActionForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** 확인 없이 바로 실행하는 작은 처리 (입금 확인, 일괄 실행 등) */
export function InlineAction({
  action,
  hidden = {},
  label,
  variant = "outline",
  size = "sm",
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  hidden?: Record<string, string>;
  label: string;
  variant?: Variant;
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  return (
    <ActionForm action={action}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant={variant} size={size}>
        {label}
      </SubmitButton>
    </ActionForm>
  );
}
