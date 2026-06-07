import Image from "next/image";
import Link from "next/link";

import { getCategories, getCategoryId, getWhatsappUrl, site } from "@/lib/catalog";

export function SiteHeader() {
  const categories = getCategories();

  return (
    <header className="site-header">
      <Link href="/" className="site-header__logo" aria-label="Retour à l'accueil Capitaine Sport">
        <Image
          src="/logo.png"
          alt=""
          width={48}
          height={48}
          className="site-header__logo-image"
          priority
        />
        <span>
          <span className="site-header__brand">{site.brand}</span>
          <span className="site-header__tagline">{site.tagline}</span>
        </span>
      </Link>
      <nav className="site-header__nav" aria-label="Navigation principale">
        <a href="/#maillots">Maillots</a>
        {categories.map((category) => (
          <a href={`/#${getCategoryId(category)}`} key={category}>
            {category}
          </a>
        ))}
      </nav>
      <a className="site-header__cta" href={getWhatsappUrl()} target="_blank" rel="noreferrer">
        Commander
      </a>
    </header>
  );
}
