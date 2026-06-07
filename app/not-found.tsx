import Link from "next/link";

import { getWhatsappUrl } from "@/lib/catalog";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="section-kicker">Maillot introuvable</p>
      <h1 className="section-title">Ce modèle n'est pas dans le vestiaire</h1>
      <p>
        Retourne à la sélection Capitaine Sport ou écris-nous sur WhatsApp pour demander un maillot précis.
      </p>
      <div className="not-found__actions">
        <Link href="/" className="btn btn--primary">
          Retour à l'accueil
        </Link>
        <a href={getWhatsappUrl()} className="btn btn--secondary" target="_blank" rel="noreferrer">
          Demander sur WhatsApp
        </a>
      </div>
    </main>
  );
}
