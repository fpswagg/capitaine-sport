"use client";
import { useActionState } from "react";
import { setStock, type FormState } from "@/app/dashboard/actions";
import { FormMessage } from "@/components/dashboard/FormMessage";
import { SubmitButton } from "@/components/dashboard/SubmitButton";

export function StockForm({ id, quantity }: { id: string; quantity: number }) {
  const [state, action] = useActionState(setStock, {} as FormState);
  return <form action={action} className="csd-actions">
    <input type="hidden" name="id" value={id} />
    <div className="csd-field" style={{ maxWidth: 220 }}><label htmlFor="quantity">Stock physique cible</label><input id="quantity" name="quantity" type="number" min="0" required defaultValue={quantity} /></div>
    <SubmitButton className="csd-button csd-button--plain">Mettre à jour le stock</SubmitButton>
    <FormMessage state={state} />
  </form>;
}
