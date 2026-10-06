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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { connectAction, disconnectAction, syncAction } from "../actions";
import type { ConnectionCategory } from "@/lib/db/schema";

const SCOPE: Record<ConnectionCategory, string[]> = {
  llm: ["월별·모델별 토큰 사용량", "청구 금액과 결제 수단(유료·크레딧) 구분"],
  gpu: ["인스턴스별 GPU 종류·수량·가동 시간", "가동률과 외부 엔드포인트 여부", "월별 청구 금액과 지원 사업 결제 여부"],
  pg: ["월별 정산 매출", "결제 고객 수와 재결제 고객 비율"],
  bank: ["매출 입금 내역", "Compute Pay 상환을 위한 자동이체 출금 동의"],
};

/** 정보 제공 동의 → 연결. 동의 범위를 먼저 보여 주고 버튼 한 번으로 연결합니다. */
export function ConnectionActions({
  provider,
  connected,
  category,
  choices,
}: {
  provider?: string;
  connected: boolean;
  category: ConnectionCategory;
  choices?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(choices?.[0] ?? provider ?? "");

  if (connected && provider) {
    return (
      <div className="flex shrink-0 gap-2">
        <ActionForm action={syncAction}>
          <input type="hidden" name="provider" value={provider} />
          <SubmitButton variant="outline" size="sm">
            다시 불러오기
          </SubmitButton>
        </ActionForm>
        <ActionForm action={disconnectAction}>
          <input type="hidden" name="provider" value={provider} />
          <SubmitButton variant="ghost" size="sm" className="text-ink-soft">
            연결 해제
          </SubmitButton>
        </ActionForm>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="shrink-0 self-start sm:self-auto">
          {choices ? "계좌 연결" : "연결"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{choices ? "상환 계좌 연결" : `${provider} 연결`}</DialogTitle>
          <DialogDescription>
            아래 정보를 TokenScore에 제공하는 데 동의하면 연결됩니다. 신용평가와 Compute Pay 운영에만 쓰고, 연결을 해제하면 더 가져오지 않습니다.
          </DialogDescription>
        </DialogHeader>
        {choices && (
          <Select value={picked} onValueChange={setPicked}>
            <SelectTrigger className="w-full" aria-label="은행 선택">
              <SelectValue placeholder="은행 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {choices.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {SCOPE[category].map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <ActionForm action={connectAction} onDone={(r) => r?.ok && setOpen(false)}>
          <input type="hidden" name="provider" value={picked} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                취소
              </Button>
            </DialogClose>
            <SubmitButton disabled={!picked}>동의하고 연결</SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
