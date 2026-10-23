"use client";
import { useActionState, useEffect } from "react";
import type { FormState } from "@/app/dashboard/actions";
export function FormMessage({ state }: { state: FormState }) {
  if (!state.error && !state.ok) return null;
  return <p className={`csd-message${state.error ? " csd-message--error" : ""}`} role="status">{state.error || state.ok}</p>;
}
export function useFormNotice(state: FormState) {
  useEffect(() => { if (state.ok) window.scrollTo({ top: 0, behavior: "smooth" }); }, [state.at]);
}
