"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { approveApplicationAction, rejectApplicationAction } from "../actions";
import { ConfirmAction } from "./confirm-action";
import { krw } from "@/lib/format";

export function DecisionForm({
  applicationId,
  defaultLimit,
  suggestedLimit,
  requestedAmount,
  companyName,
}: {
  applicationId: string;
  defaultLimit: number;
  suggestedLimit: number;
  requestedAmount: number;
  companyName: string;
}) {
  const [value, setValue] = useState(defaultLimit.toLocaleString("ko-KR"));
  const amount = Number(value.replace(/[^0-9]/g, "")) || 0;
  const overSuggested = amount > suggestedLimit;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formId = `approve-${applicationId}`;
  return (
    <div className="flex flex-col gap-4">
      <ActionForm id={formId} action={approveApplicationAction} onDone={() => setConfirmOpen(false)}>
        <input type="hidden" name="id" value={applicationId} />
        <FieldGroup>
          <Field data-invalid={overSuggested ? true : undefined}>
            <FieldLabel htmlFor="approvedLimit">승인 한도</FieldLabel>
            <Input
              id="approvedLimit"
              name="approvedLimit"
              inputMode="numeric"
              className="num"
              value={value}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                setValue(n ? n.toLocaleString("ko-KR") : "");
              }}
              aria-invalid={overSuggested ? true : undefined}
              aria-describedby="approvedLimit-help"
            />
            <FieldDescription id="approvedLimit-help">
              {amount ? `${krw(amount)}. ` : ""}
              {overSuggested
                ? `산정 한도 ${krw(suggestedLimit)}보다 큽니다. 승인 메모에 근거를 남기세요.`
                : `신청 ${krw(requestedAmount)}, 산정 한도 ${krw(suggestedLimit)}`}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="note">승인 메모</FieldLabel>
            <Textarea id="note" name="note" rows={3} placeholder="검증한 데이터와 승인 근거를 남깁니다. 감사 로그에 기록됩니다." />
          </Field>
          {/* 한도가 바로 열리고 기존 한도가 닫히므로 한 번 더 확인받습니다. */}
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button type="button" className="w-full" disabled={!amount}>
                승인
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {companyName}에 {krw(amount)} 한도를 승인할까요?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  승인하면 기존 한도는 닫히고 새 한도가 바로 열립니다. 기업은 이 한도 안에서 청구서 결제를 승인할 수 있습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <Button type="submit" form={formId}>
                  {krw(amount)} 한도 승인
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </FieldGroup>
      </ActionForm>
      <ConfirmAction
        action={rejectApplicationAction}
        hidden={{ id: applicationId }}
        triggerLabel="거절"
        triggerVariant="ghost"
        triggerSize="default"
        title={`${companyName}의 신청을 거절할까요?`}
        description="거절 사유는 신청 기업 화면에 그대로 보입니다. 다시 신청하려면 기업이 새로 신청해야 합니다."
        confirmLabel="거절"
        confirmVariant="destructive"
        reason={{ name: "note", label: "거절 사유", placeholder: "예: 공급사 청구 데이터가 3개월 미만입니다." }}
      />
    </div>
  );
}
