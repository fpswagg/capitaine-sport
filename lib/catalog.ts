import jerseysData from "@/data/jerseys.json";
import siteData from "@/data/site.json";

export type Jersey = {
  slug: string;
  team: string;
  name: string;
  category: "Domicile" | "Extérieur";
  version: "Pro" | "Collector";
  competition: string;
  price: number;
  imageUrl: string;
  summary: string;
};

export type SiteContent = typeof siteData;

export const site = siteData satisfies SiteContent;

export const jerseys = jerseysData as Jersey[];

export const categoryOrder: Jersey["category"][] = ["Domicile", "Extérieur"];

export function formatPrice(price: number) {
  return `${new Intl.NumberFormat("fr-FR").format(price)} FCFA`;
}

export function getJersey(slug: string) {
  return jerseys.find((jersey) => jersey.slug === slug);
}

export function getJerseysByCategory(category: Jersey["category"]) {
  return jerseys.filter((jersey) => jersey.category === category);
}

export function getCategories() {
  return categoryOrder.filter((category) => getJerseysByCategory(category).length > 0);
}

export function getCategoryId(category: Jersey["category"]) {
  return category === "Domicile" ? "domicile" : "exterieur";
}

export function getRelatedJerseys(currentSlug: string, limit = 4) {
  const current = getJersey(currentSlug);

  return jerseys
    .filter((jersey) => jersey.slug !== currentSlug)
    .sort((a, b) => {
      if (current && a.category === current.category && b.category !== current.category) {
        return -1;
      }

      if (current && b.category === current.category && a.category !== current.category) {
        return 1;
      }

      return 0;
    })
    .slice(0, limit);
}

export function getWhatsappUrl(jersey?: Jersey) {
  const message = jersey
    ? `Bonjour Capitaine Sport, je veux commander le ${jersey.name} ${jersey.team} à ${formatPrice(jersey.price)}.`
    : "Bonjour Capitaine Sport, je veux commander un maillot.";

  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
