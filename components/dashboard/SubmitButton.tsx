"use client";
import { useFormStatus } from "react-dom";
export function SubmitButton({ children, className = "csd-button csd-button--orange", confirm }: { children: React.ReactNode; className?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} onClick={confirm ? (event) => { if (!window.confirm(confirm)) event.preventDefault(); } : undefined}>{pending ? "Enregistrement…" : children}</button>;
}
