import { JerseyCard } from "@/components/JerseyCard";
import { getCategories, getCategoryId, getJerseysByCategory, jerseys, site } from "@/lib/catalog";

export default function Home() {
  const categories = getCategories();

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
              Tous les maillots sont en version pro à 10 000 FCFA. Clique sur un produit pour voir les détails et commander sur WhatsApp.
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

      {categories.map((category, index) => {
        const categoryJerseys = getJerseysByCategory(category);
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
