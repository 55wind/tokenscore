"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ScoreConfig } from "@/lib/scoring/types";
import { saveModelAction } from "../actions";

const WEIGHTS: { key: keyof ScoreConfig["weights"]; label: string; hint: string }[] = [
  { key: "efficiency", label: "효율성", hint: "컴퓨트 1원당 매출, GPU 가동률" },
  { key: "growth", label: "성장성", hint: "단가 보정 사용량 성장률" },
  { key: "stability", label: "안정성", hint: "사용량 변동성, 서빙 연속성" },
  { key: "business", label: "사업의 질", hint: "매출 성장, 리텐션, 매출총이익률" },
  { key: "concentration", label: "공급사 분산", hint: "최대 공급사 비중" },
];
const GRADES = ["A", "B", "C", "D", "E"] as const;

function NumField({ id, label, name, defaultValue, step = "1", suffix }: { id: string; label: string; name: string; defaultValue: number; step?: string; suffix?: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {suffix && <span className="font-normal text-ink-soft"> ({suffix})</span>}
      </FieldLabel>
      <Input id={id} name={name} type="number" inputMode="decimal" step={step} defaultValue={defaultValue} className="num" required />
    </Field>
  );
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function ModelForm({ config }: { config: ScoreConfig }) {
  const [auto, setAuto] = useState<string>(config.autoApproveGrade ?? "none");
  return (
    <ActionForm action={saveModelAction}>
      <input type="hidden" name="autoApproveGrade" value={auto} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>지표 가중치</CardTitle>
            <CardDescription>% 단위로 입력합니다. 합이 100이 아니어도 저장할 때 비율에 맞춰 다시 나눕니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              {WEIGHTS.map((w) => (
                <Field key={w.key}>
                  <FieldLabel htmlFor={`w-${w.key}`}>{w.label}</FieldLabel>
                  <Input id={`w-${w.key}`} name={`w.${w.key}`} type="number" min="1" step="1" defaultValue={round(config.weights[w.key] * 100, 0)} className="num" required />
                  <FieldDescription>{w.hint}</FieldDescription>
                </Field>
              ))}
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>등급 기준점과 가점</CardTitle>
            <CardDescription>1000점 만점입니다. 기준점 이상이면 그 등급을 받습니다. E등급은 D 기준점 미만입니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <FieldGroup className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(["A", "B", "C", "D"] as const).map((g) => (
                <NumField key={g} id={`cut-${g}`} name={`cut.${g}`} label={`${g}등급`} defaultValue={config.cutoffs[g]} suffix="점 이상" />
              ))}
            </FieldGroup>
            <FieldGroup className="grid grid-cols-2 gap-4">
              <NumField id="bonus-gov" name="bonus.govProgram" label="정부 지원 선정 가점" defaultValue={config.bonus.govProgram} suffix="점" />
              <NumField id="bonus-inv" name="bonus.investment" label="투자 유치 가점" defaultValue={config.bonus.investment} suffix="점" />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>등급계수와 수수료</CardTitle>
            <CardDescription>한도 = min(평균 컴퓨트 × 컴퓨트 배수 × 등급계수, 평균 매출 × 매출 배수). 수수료는 결제 건마다 한 번 붙습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldLegend variant="label">등급계수</FieldLegend>
              <FieldGroup className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                {GRADES.map((g) => (
                  <NumField key={g} id={`coef-${g}`} name={`coef.${g}`} label={g} defaultValue={config.coefficients[g]} step="0.05" />
                ))}
              </FieldGroup>
            </FieldSet>
            <FieldSet className="mt-6">
              <FieldLegend variant="label">수수료율 (%)</FieldLegend>
              <FieldGroup className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                {GRADES.map((g) => (
                  <NumField key={g} id={`fee-${g}`} name={`fee.${g}`} label={g} defaultValue={round(config.feeRates[g] * 100, 1)} step="0.1" />
                ))}
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>한도 배수와 처리 규칙</CardTitle>
            <CardDescription>자동 승인을 켜면 그 등급 이상이고 신청 금액이 산정 한도 이내일 때 심사역 없이 바로 승인됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <FieldGroup className="grid grid-cols-2 gap-4">
              <NumField id="computeMultiple" name="computeMultiple" label="컴퓨트 배수" defaultValue={config.computeMultiple} step="0.5" suffix="개월분" />
              <NumField id="revenueMultiple" name="revenueMultiple" label="매출 배수" defaultValue={config.revenueMultiple} step="0.5" suffix="개월분" />
              <NumField id="rejectBelow" name="rejectBelow" label="거절 권고 기준" defaultValue={config.rejectBelow} suffix="점 미만" />
              <NumField id="minPaidMonths" name="minPaidMonths" label="최소 유료 데이터" defaultValue={config.minPaidMonths} suffix="개월" />
            </FieldGroup>
            <FieldSet>
              <FieldLegend variant="label">자동 승인</FieldLegend>
              <ToggleGroup
                type="single"
                variant="outline"
                value={auto}
                onValueChange={(v) => v && setAuto(v)}
                aria-label="자동 승인 등급"
                className="flex-wrap"
              >
                <ToggleGroupItem value="none">사용 안 함</ToggleGroupItem>
                <ToggleGroupItem value="A">A등급만</ToggleGroupItem>
                <ToggleGroupItem value="B">B등급 이상</ToggleGroupItem>
                <ToggleGroupItem value="C">C등급 이상</ToggleGroupItem>
              </ToggleGroup>
            </FieldSet>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <SubmitButton>심사 모델 저장</SubmitButton>
          </CardFooter>
        </Card>
      </div>
    </ActionForm>
  );
}
