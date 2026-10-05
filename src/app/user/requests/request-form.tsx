"use client";

import { useCallback, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { createPaymentAction } from "../actions";

export interface ProviderOption {
  provider: string;
  category: "llm" | "gpu";
}

const formatAmount = (digits: string) => (digits ? Number(digits).toLocaleString("ko-KR") : "");

export function RequestForm({
  providers,
  defaultBillingMonth,
  defaultDueDate,
}: {
  providers: ProviderOption[];
  defaultBillingMonth: string;
  defaultDueDate: string;
}) {
  // 결과가 실패여도 입력이 남도록 모든 값을 상태로 둡니다.
  const [provider, setProvider] = useState("");
  const [billingMonth, setBillingMonth] = useState(defaultBillingMonth);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [memo, setMemo] = useState("");
  // 서버 검증 오류는 토스트로 사라지지 않게 해당 필드 아래에도 남깁니다.
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const errorFor = (name: string) => (error?.field === name ? error.message : null);
  const invalid = (name: string) => (error?.field === name ? true : undefined);
  const describedBy = (name: string, help?: string) => [help, error?.field === name ? `${name}-error` : null].filter(Boolean).join(" ") || undefined;

  const onDone = useCallback(
    (result: ActionResult) => {
      if (!result?.ok) {
        setError(result?.field ? { field: result.field, message: result.message } : null);
        if (result?.field) document.getElementById(result.field)?.focus();
        return;
      }
      setError(null);
      setProvider("");
      setAmount("");
      setInvoiceNo("");
      setMemo("");
      setBillingMonth(defaultBillingMonth);
      setDueDate(defaultDueDate);
    },
    [defaultBillingMonth, defaultDueDate],
  );

  const selected = providers.find((p) => p.provider === provider);
  const llm = providers.filter((p) => p.category === "llm");
  const gpu = providers.filter((p) => p.category === "gpu");

  return (
    <ActionForm action={createPaymentAction} onDone={onDone}>
      <FieldGroup>
        <Field data-invalid={invalid("provider")}>
          <FieldLabel htmlFor="provider">공급사</FieldLabel>
          <div className="flex items-center gap-2">
            <Select
              name="provider"
              value={provider}
              onValueChange={(v) => {
                setProvider(v);
                if (error?.field === "provider") setError(null);
              }}
            >
              <SelectTrigger id="provider" className="w-full max-w-72" aria-invalid={invalid("provider")} aria-describedby={describedBy("provider", "provider-help")}>
                <SelectValue placeholder="청구서를 보낸 공급사" />
              </SelectTrigger>
              <SelectContent>
                {gpu.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>GPU 클라우드</SelectLabel>
                    {gpu.map((p) => (
                      <SelectItem key={p.provider} value={p.provider}>
                        {p.provider}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {llm.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>LLM API</SelectLabel>
                    {llm.map((p) => (
                      <SelectItem key={p.provider} value={p.provider}>
                        {p.provider}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            {selected && <Badge variant="compute">{selected.category === "gpu" ? "GPU" : "LLM"}</Badge>}
          </div>
          <FieldDescription id="provider-help">연동된 공급사만 고를 수 있습니다. 청구 금액은 공급사 기록과 대조합니다.</FieldDescription>
          {errorFor("provider") && <FieldError id="provider-error">{errorFor("provider")}</FieldError>}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={invalid("amount")}>
            <FieldLabel htmlFor="amount">청구 금액 (원)</FieldLabel>
            <Input
              id="amount"
              name="amount"
              inputMode="numeric"
              autoComplete="off"
              placeholder="예: 9,800,000"
              value={formatAmount(amount)}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 11));
                if (error?.field === "amount") setError(null);
              }}
              className="num"
              aria-invalid={invalid("amount")}
              aria-describedby={describedBy("amount", "amount-help")}
            />
            <FieldDescription id="amount-help">10만원 이상 청구서부터 요청할 수 있습니다.</FieldDescription>
            {errorFor("amount") && <FieldError id="amount-error">{errorFor("amount")}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="billingMonth">청구 월</FieldLabel>
            <Input id="billingMonth" name="billingMonth" type="month" value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="dueDate">납부 기한</FieldLabel>
            <Input id="dueDate" name="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="invoiceNo">청구서 번호 (선택)</FieldLabel>
            <Input id="invoiceNo" name="invoiceNo" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="비우면 자동으로 붙습니다" />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="memo">메모 (선택)</FieldLabel>
          <Textarea
            id="memo"
            name="memo"
            rows={2}
            maxLength={200}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 상담 요약 서빙 노드 9월분"
          />
        </Field>

        <SubmitButton className="self-start">
          결제 요청
        </SubmitButton>
      </FieldGroup>
    </ActionForm>
  );
}
