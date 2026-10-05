"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { krw, pct } from "@/lib/format";
import { planRepayment } from "@/lib/scoring/engine";
import { applyAction } from "../actions";

const toNumber = (v: string) => Number(v.replace(/[^0-9]/g, "")) || 0;

export function ApplyForm({
  suggested,
  feeRate,
  avgRevenue,
  defaultPurpose,
}: {
  suggested: number;
  feeRate: number;
  avgRevenue: number;
  defaultPurpose: string;
}) {
  const [amount, setAmount] = useState(suggested.toLocaleString("ko-KR"));
  const [term, setTerm] = useState("4");
  const value = toNumber(amount);
  const plan = planRepayment(value, feeRate, avgRevenue, Number(term));
  const over = value > suggested;

  return (
    <ActionForm action={applyAction}>
      <FieldGroup>
        <Field data-invalid={over ? true : undefined}>
          <FieldLabel htmlFor="requestedAmount">신청 금액 (원)</FieldLabel>
          <Input
            id="requestedAmount"
            name="requestedAmount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              const n = toNumber(e.target.value);
              setAmount(n ? n.toLocaleString("ko-KR") : "");
            }}
            aria-invalid={over ? true : undefined}
            className="num text-[16px]"
          />
          <FieldDescription>
            {over
              ? `산정 한도 ${krw(suggested)}보다 많습니다. 심사역이 산정 한도 이내로 조정할 수 있습니다.`
              : `${krw(value)}. 산정 한도 ${krw(suggested)} 이내입니다.`}
          </FieldDescription>
        </Field>

        <FieldSet>
          <FieldLegend variant="label">상환 기간</FieldLegend>
          <input type="hidden" name="termMonths" value={term} />
          <ToggleGroup type="single" variant="outline" value={term} onValueChange={(v) => v && setTerm(v)} aria-label="상환 기간">
            {["3", "4", "5", "6"].map((t) => (
              <ToggleGroupItem key={t} value={t} className="px-4">
                {t}개월
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>매달 매출이 들어오면 정해진 비율만큼 자동으로 빠져나갑니다.</FieldDescription>
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="purpose">자금 용도</FieldLabel>
          <Textarea id="purpose" name="purpose" defaultValue={defaultPurpose} rows={2} maxLength={200} />
        </Field>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg bg-paper px-4 py-3 text-[13.5px] sm:grid-cols-4">
          <div>
            <dt className="text-ink-soft">수수료 ({pct(feeRate)})</dt>
            <dd className="num font-semibold">{krw(plan.fee)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">갚을 총액</dt>
            <dd className="num font-semibold">{krw(plan.total)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">월 상환액</dt>
            <dd className="num font-semibold">{krw(plan.monthly)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">월 매출 대비</dt>
            <dd className="num font-semibold">{pct(plan.revenueShare)}</dd>
          </div>
        </dl>
        <p className="-mt-3 text-[12.5px] text-ink-soft">한도를 전부 쓴다고 가정한 예시입니다. 실제 수수료는 결제한 청구서 금액에만 붙습니다.</p>

        <SubmitButton size="lg" className="self-start" disabled={!value}>
          한도 신청
        </SubmitButton>
      </FieldGroup>
    </ActionForm>
  );
}
