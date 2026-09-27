"use client";

import { useActionState, useEffect, useRef } from "react";

import { sendFeedback, type ContactState } from "@/app/contact/actions";

const initialState: ContactState = { status: "idle", message: "" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendFeedback, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  const errors = state.fieldErrors ?? {};
  const values = state.status === "error" ? (state.values ?? {}) : {};

  if (state.status === "success") {
    return (
      <div className="contact-card contact-card--success" ref={statusRef} tabIndex={-1} role="status">
        <p className="section-kicker">Message envoyé</p>
        <h2 className="contact-card__title">C&apos;est reçu !</h2>
        <p>{state.message}</p>
        <button type="button" className="btn btn--secondary" onClick={() => window.location.reload()}>
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="contact-card" noValidate>
      <p className="section-kicker">Formulaire</p>
      <h2 className="contact-card__title">Ton message</h2>

      {state.status === "error" ? (
        <div className="form-alert" ref={statusRef} tabIndex={-1} role="alert">
          {state.message}
        </div>
      ) : null}

      <div className="form-grid">
        <label className="field">
          <span>Nom *</span>
          <input name="name" autoComplete="name" defaultValue={values.name} aria-invalid={Boolean(errors.name)} required />
          {errors.name ? <small className="field__error">{errors.name}</small> : null}
        </label>

        <label className="field">
          <span>Sujet</span>
          <select name="subject" defaultValue={values.subject ?? "commande"}>
            <option value="commande">Commande</option>
            <option value="disponibilite">Disponibilité / taille</option>
            <option value="livraison">Livraison</option>
            <option value="avis">Avis sur un maillot</option>
            <option value="autre">Autre</option>
          </select>
        </label>

        <label className="field">
          <span>Téléphone / WhatsApp</span>
          <input name="phone" type="tel" autoComplete="tel" placeholder="+237 6XX XX XX XX" defaultValue={values.phone} aria-invalid={Boolean(errors.contact)} />
        </label>

        <label className="field">
          <span>E-mail</span>
          <input name="email" type="email" autoComplete="email" defaultValue={values.email} aria-invalid={Boolean(errors.contact)} />
        </label>
        {errors.contact ? <small className="field__error form-grid__full">{errors.contact}</small> : null}

        <label className="field form-grid__full">
          <span>Message *</span>
          <textarea name="message" rows={6} maxLength={3000} defaultValue={values.message} aria-invalid={Boolean(errors.message)} required />
          {errors.message ? <small className="field__error">{errors.message}</small> : null}
        </label>

        <label className="field--trap" aria-hidden="true">
          Site web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button type="submit" className="btn btn--primary btn--lg" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer le message"}
      </button>
    </form>
  );
}
