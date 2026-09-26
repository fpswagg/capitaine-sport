"use server";

import { SssError, sssStoreRequest } from "@/lib/sss";

export type ContactState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<"name" | "contact" | "message", string>>;
  values?: Record<string, string>;
};

const SUBJECTS: Record<string, string> = {
  commande: "Commande",
  disponibilite: "Disponibilité / taille",
  livraison: "Livraison",
  avis: "Avis sur un maillot",
  autre: "Autre"
};

export async function sendFeedback(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    subject: String(formData.get("subject") ?? "autre"),
    message: String(formData.get("message") ?? "").trim()
  };

  // Honeypot: bots fill every field, people never see this one.
  if (String(formData.get("website") ?? "")) {
    return { status: "success", message: "Merci, ton message est bien parti." };
  }

  const fieldErrors: ContactState["fieldErrors"] = {};
  if (values.name.length < 2) fieldErrors.name = "Indique ton nom.";
  if (!values.phone && !values.email) fieldErrors.contact = "Laisse un numéro ou un e-mail pour qu'on te réponde.";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) fieldErrors.contact = "Cet e-mail ne semble pas valide.";
  if (values.message.length < 10) fieldErrors.message = "Ton message est un peu court (10 caractères minimum).";
  if (values.message.length > 3000) fieldErrors.message = "Ton message dépasse 3 000 caractères.";

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Quelques champs sont à corriger.", fieldErrors, values };
  }

  const subject = SUBJECTS[values.subject] ?? SUBJECTS.autre;

  try {
    await sssStoreRequest("/sasto/feedback", {
      method: "POST",
      body: {
        title: `${subject} — ${values.name}`,
        message: values.message,
        subject,
        source: "website",
        contact: {
          name: values.name,
          phone: values.phone || undefined,
          email: values.email || undefined
        }
      }
    });
  } catch (error) {
    console.error("[contact] feedback SSS", error instanceof SssError ? `${error.status} ${error.code}` : error);
    return {
      status: "error",
      message: "Impossible d'envoyer le message pour le moment. Réessaie, ou écris-nous directement sur WhatsApp.",
      values
    };
  }

  return { status: "success", message: `Merci ${values.name.split(" ")[0]}, ton message est bien arrivé chez Capitaine Sport.` };
}
