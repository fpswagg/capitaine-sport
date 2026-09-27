import type { Metadata } from "next";

import { ContactForm } from "@/components/ContactForm";
import { getWhatsappUrl, site } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Contact",
  description: "Une question, un avis ou une commande ? Écris à Capitaine Sport.",
  alternates: { canonical: "/contact" }
};

export default function ContactPage() {
  return (
    <main>
      <section className="hero hero--compact">
        <div className="hero__content">
          <p className="hero__eyebrow">Contact</p>
          <h1 className="hero__title">
            Parle au <span>Capitaine</span>
          </h1>
          <p className="hero__description">
            Une question sur une taille, un avis sur ton maillot ou une commande spéciale : laisse-nous un message,
            l&apos;équipe te répond rapidement.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container contact-layout">
          <ContactForm />

          <aside className="contact-aside">
            <div className="order-card">
              <p className="section-kicker">Plus rapide</p>
              <h2>WhatsApp</h2>
              <p>Pour commander tout de suite, écris-nous directement.</p>
              <a href={getWhatsappUrl()} className="btn btn--primary" target="_blank" rel="noreferrer">
                {site.contactLabel}
              </a>
            </div>
            <div className="contact-aside__note">
              <p className="section-kicker">Réponse immédiate</p>
              <p>Le Capitaine, notre assistant, répond 24h/24 sur les prix et la disponibilité — bulle en bas à droite.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
