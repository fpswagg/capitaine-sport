import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AskCaptainButton } from "@/components/AskCaptainButton";
import { JerseyCard } from "@/components/JerseyCard";
import { JerseyImage } from "@/components/JerseyImage";
import { formatPrice, getJersey, getRelatedJerseys, getWhatsappUrl, site } from "@/lib/catalog";

// Rendered per request from the shared SSS data cache, so the list and detail pages never disagree.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const jersey = await getJersey(slug);

  if (!jersey) {
    return {
      title: `Maillot introuvable | ${site.brand}`
    };
  }

  const images = jersey.imageUrl ? [{ url: jersey.imageUrl, alt: `${jersey.name} ${jersey.team}` }] : undefined;

  return {
    title: `${jersey.name} ${jersey.team}`,
    description: `${jersey.summary} Prix: ${formatPrice(jersey.price)}. Version ${jersey.version}, commande disponible sur WhatsApp.`,
    alternates: {
      canonical: `/maillots/${jersey.slug}`
    },
    openGraph: {
      title: `${jersey.name} ${jersey.team}`,
      description: `${jersey.summary} Prix: ${formatPrice(jersey.price)}.`,
      url: `/maillots/${jersey.slug}`,
      siteName: site.brand,
      locale: "fr_CM",
      type: "website",
      images
    },
    twitter: {
      card: "summary_large_image",
      title: `${jersey.name} ${jersey.team}`,
      description: `${jersey.summary} Prix: ${formatPrice(jersey.price)}.`,
      images: jersey.imageUrl ? [jersey.imageUrl] : undefined
    }
  };
}

export default async function JerseyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const jersey = await getJersey(slug);

  if (!jersey) {
    notFound();
  }

  const related = await getRelatedJerseys(jersey);

  return (
    <main>
      <section className="detail-hero">
        <div className="container detail-hero__grid">
          <div className="breadcrumb">
            <Link href="/">Accueil</Link>
            <span>/</span>
            <a href="/#maillots">Maillots</a>
            <span>/</span>
            <strong>{jersey.team}</strong>
          </div>

          <div className="detail-hero__visual">
            <JerseyImage src={jersey.imageUrl} team={jersey.team} name={jersey.name} priority />
            {jersey.inStock ? null : <span className="stock-badge stock-badge--lg">Rupture de stock</span>}
          </div>

          <div className="detail-hero__content">
            <p className="section-kicker">{[jersey.category, jersey.competition].filter(Boolean).join(" · ")}</p>
            <h1 className="detail-title">{jersey.team} {jersey.name}</h1>
            <p className="detail-summary">{jersey.summary}</p>

            <div className="detail-purchase">
              <div>
                <span>Prix</span>
                <strong>{formatPrice(jersey.price)}</strong>
              </div>
              <div>
                <span>Disponibilité</span>
                <strong className={jersey.inStock ? undefined : "is-oos"}>
                  {jersey.inStock ? "En stock" : "Rupture de stock"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section product-info">
        <div className="container product-info__grid">
          {jersey.inStock ? (
            <aside className="order-card">
              <p className="section-kicker">Commande rapide</p>
              <h2>{formatPrice(jersey.price)}</h2>
              <p>Envoie ce modèle sur WhatsApp pour confirmer les détails de la commande.</p>
              <a href={getWhatsappUrl(jersey)} className="btn btn--primary" target="_blank" rel="noreferrer">
                Commander
              </a>
              <AskCaptainButton message={`Le maillot ${jersey.team} ${jersey.name} est disponible en quelle taille ?`} />
            </aside>
          ) : (
            <aside className="order-card order-card--oos">
              <p className="section-kicker">Rupture de stock</p>
              <h2>Bientôt de retour</h2>
              <p>Ce maillot est épuisé pour le moment. Demande-nous quand il revient, on te prévient.</p>
              <a href={getWhatsappUrl(jersey, "restock")} className="btn btn--primary" target="_blank" rel="noreferrer">
                Me prévenir du retour
              </a>
              <a href="/#maillots" className="btn btn--secondary">
                Voir les maillots dispo
              </a>
            </aside>
          )}

          <article className="product-description">
            <p className="section-kicker">Détails du produit</p>
            <h2>Maillot {jersey.team}</h2>
            <p>{jersey.summary}</p>
            <div className="product-description__facts">
              <div>
                <span>Catégorie</span>
                <strong>{jersey.category}</strong>
              </div>
              {jersey.competition ? (
                <div>
                  <span>Compétition</span>
                  <strong>{jersey.competition}</strong>
                </div>
              ) : null}
              <div>
                <span>Version</span>
                <strong>{jersey.version}</strong>
              </div>
              <div>
                <span>Prix</span>
                <strong>{formatPrice(jersey.price)}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="section section--muted">
          <div className="container section__heading">
            <p className="section-kicker">Tu peux aussi aimer</p>
            <h2 className="section-title">Maillots similaires</h2>
          </div>
          <div className="container jersey-grid">
            {related.map((relatedJersey) => (
              <JerseyCard jersey={relatedJersey} key={relatedJersey.slug} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
