"use client";

import { useRef } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { inviteMemberAction } from "../actions";

export function InviteForm() {
  const formRef = useRef<HTMLDivElement>(null);
  return (
    <ActionForm
      action={inviteMemberAction}
      onDone={(r) => {
        if (r?.ok) formRef.current?.querySelectorAll("input").forEach((i) => (i.value = ""));
      }}
    >
      <div ref={formRef}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="invite-name">이름</FieldLabel>
            <Input id="invite-name" name="name" required autoComplete="off" />
          </Field>
          <Field>
            <FieldLabel htmlFor="invite-email">이메일</FieldLabel>
            <Input id="invite-email" name="email" type="email" required autoComplete="off" />
          </Field>
          <Field>
            <FieldLabel htmlFor="invite-title">직무</FieldLabel>
            <Input id="invite-title" name="title" placeholder="예: 백엔드 엔지니어" autoComplete="off" />
          </Field>
          <SubmitButton className="self-start">초대</SubmitButton>
        </FieldGroup>
      </div>
    </ActionForm>
  );
}
