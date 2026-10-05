"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { krw } from "@/lib/format";
import { approvePaymentAction, rejectPaymentAction } from "../actions";

export function PaymentDecision({ id, provider, amount, canApprove }: { id: string; provider: string; amount: number; canApprove: boolean }) {
  const [open, setOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  return (
    <div className="flex shrink-0 gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">반려</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>결제 요청 반려</DialogTitle>
            <DialogDescription>
              {provider} {krw(amount)} 요청을 반려합니다. 요청한 구성원에게 사유가 보입니다.
            </DialogDescription>
          </DialogHeader>
          <ActionForm action={rejectPaymentAction} onDone={(r) => r?.ok && setOpen(false)}>
            <input type="hidden" name="id" value={id} />
            <Field>
              <FieldLabel htmlFor={`reason-${id}`}>사유</FieldLabel>
              <Input id={`reason-${id}`} name="reason" placeholder="예: 이번 달은 회사 카드로 결제" />
            </Field>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  닫기
                </Button>
              </DialogClose>
              <SubmitButton variant="destructive">반려</SubmitButton>
            </DialogFooter>
          </ActionForm>
        </DialogContent>
      </Dialog>
      {/* 승인하면 한도가 차감되고 운영사 집행으로 넘어가므로 한 번 더 확인받습니다. */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogTrigger asChild>
          <Button disabled={!canApprove}>승인</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {provider} {krw(amount)} 결제를 승인할까요?
            </DialogTitle>
            <DialogDescription>
              승인하면 Compute Pay 한도에서 {krw(amount)}이 바로 차감되고, TokenScore가 공급사에 대신 결제합니다. 결제한 금액은 다음 달부터 매출에서 나눠 갚습니다.
            </DialogDescription>
          </DialogHeader>
          <ActionForm action={approvePaymentAction} onDone={(r) => r?.ok && setApproveOpen(false)}>
            <input type="hidden" name="id" value={id} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  취소
                </Button>
              </DialogClose>
              <SubmitButton>{krw(amount)} 결제 승인</SubmitButton>
            </DialogFooter>
          </ActionForm>
        </DialogContent>
      </Dialog>
    </div>
  );
}
