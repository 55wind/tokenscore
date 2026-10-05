"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/action-form";

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(login, undefined);
  return (
    <form action={action}>
      <FieldGroup>
        <Field data-invalid={state?.error ? true : undefined}>
          <FieldLabel htmlFor="email">이메일</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            defaultValue={state?.email ?? "ceo@replylab.ai"}
            required
            aria-invalid={state?.error ? true : undefined}
          />
        </Field>
        <Field data-invalid={state?.error ? true : undefined}>
          <FieldLabel htmlFor="password">비밀번호</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={state?.error ? true : undefined} />
          {state?.error && <FieldError>{state.error}</FieldError>}
        </Field>
        <SubmitButton size="lg" className="w-full">
          로그인
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
