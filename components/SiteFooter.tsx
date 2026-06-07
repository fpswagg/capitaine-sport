import Image from "next/image";

import { getWhatsappUrl, site } from "@/lib/catalog";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__identity">
        <Image
          src="/logo.png"
          alt={site.brand}
          width={220}
          height={220}
          className="site-footer__logo"
        />
        <p className="site-footer__brand">{site.brand}</p>
        <p className="site-footer__tagline">{site.tagline}</p>
      </div>
      <div className="site-footer__contact">
        <span>Contact direct</span>
        <a href={getWhatsappUrl()} target="_blank" rel="noreferrer">
          {site.contactLabel}
        </a>
      </div>
      <p className="site-footer__credit">Sélection et commandes par {site.founder}.</p>
    </footer>
  );
}
