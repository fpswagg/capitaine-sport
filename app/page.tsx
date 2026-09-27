import { JerseyCard } from "@/components/JerseyCard";
import { getCategories, getCategoryId, getJerseys, site } from "@/lib/catalog";

// Rendered per request from the shared SSS data cache, so the list and detail pages never disagree.
export const dynamic = "force-dynamic";

export default async function Home() {
  const jerseys = await getJerseys();
  const categories = getCategories(jerseys);

  return (
    <main>
      <section className="hero">
        <div className="hero__content">
          <p className="hero__eyebrow">{site.hero.eyebrow}</p>
          <h1 className="hero__title">
            Les maillots qui méritent <span>ton respect</span>
          </h1>
          <p className="hero__tagline">{site.tagline}</p>
          <p className="hero__description">{site.hero.description}</p>
          <div className="hero__categories" aria-label="Accès rapide aux catégories">
            {categories.map((category) => {
              const count = jerseys.filter((jersey) => jersey.category === category).length;

              return (
                <a href={`#${getCategoryId(category)}`} key={category}>
                  <span>{category}</span>
                  <strong>{count} maillot{count > 1 ? "s" : ""}</strong>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section--catalog" id="maillots">
        <div className="container catalog-layout">
          <div className="catalog-layout__heading">
            <p className="section-kicker">Prix en FCFA</p>
            <h2 className="section-title">Maillots disponibles</h2>
            <p className="section-copy">
              Le catalogue suit notre stock en direct. Clique sur un produit pour voir les détails et commander sur
              WhatsApp, ou pose ta question au Capitaine en bas à droite.
            </p>
          </div>
          <div className="catalog-layout__links">
            {categories.map((category) => (
              <a href={`#${getCategoryId(category)}`} key={category}>
                {category}
              </a>
            ))}
          </div>
        </div>
      </section>

      {jerseys.length === 0 ? (
        <section className="section section--compact">
          <div className="container empty-state">
            <p className="section-kicker">Catalogue</p>
            <h2 className="section-title">Nouveaux maillots en préparation</h2>
            <p className="section-copy">
              Le stock est momentanément indisponible. Écris-nous au {site.contactLabel} pour connaître les modèles
              disponibles.
            </p>
          </div>
        </section>
      ) : null}

      {categories.map((category, index) => {
        const categoryJerseys = jerseys.filter((jersey) => jersey.category === category);
        const otherCategory = categories.find((candidate) => candidate !== category);

        return (
          <section
            className={index % 2 === 0 ? "section section--compact" : "section section--compact section--muted"}
            id={getCategoryId(category)}
            key={category}
          >
            <div className="container section__heading section__heading--inline">
              <div>
                <p className="section-kicker">Catégorie</p>
                <h2 className="section-title">Maillots {category.toLowerCase()}</h2>
              </div>
              {otherCategory ? (
                <a href={`#${getCategoryId(otherCategory)}`} className="section-link">
                  Voir {otherCategory.toLowerCase()}
                </a>
              ) : null}
            </div>
            <div className="container jersey-grid">
              {categoryJerseys.map((jersey) => (
                <JerseyCard jersey={jersey} key={jersey.slug} />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
