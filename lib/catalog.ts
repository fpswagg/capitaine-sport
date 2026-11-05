import { cache } from "react";

import frozenSlugs from "@/data/jersey-slugs.json";
import siteData from "@/data/site.json";
import { jerseyFacts, jerseyFields, jerseyLine, jerseySlug, jerseyTitle, normalize, slugify, text, type SssProduct } from "@/lib/jersey-facts";
import { isSssConfigured, sssStoreRequest } from "@/lib/sss";

export { jerseyFacts, slugify };
export type { JerseyFacts, Kit } from "@/lib/jersey-facts";

export type Jersey = {
  id: string;
  slug: string;
  team: string;
  /** Full title, for headings and messages: "Maillot Chelsea Extérieur 2024/25". */
  title: string;
  /** The line under the team on a card: "Maillot Pro Extérieur 2024/25". */
  name: string;
  /** Third kits are sold as Extérieur; a version the site does not know is Spéciaux. */
  category: "Domicile" | "Extérieur" | "Spéciaux";
  /** "enfant 3-10 ans", or "" for an adult jersey. */
  audience: string;
  competition: string;
  /** Club, Version, Saison, Âge, Édition: the labels of the SSS product form. */
  fields: Array<{ label: string; value: string }>;
  price: number;
  imageUrl: string | null;
  summary: string;
  inStock: boolean;
};

export type SiteContent = typeof siteData;

export const site = siteData satisfies SiteContent;

export const categoryOrder: Jersey["category"][] = ["Domicile", "Extérieur", "Spéciaux"];

// Product id -> slug, frozen so published URLs survive a change of name or fields.
const SLUGS: Record<string, string> = frozenSlugs;

type ProductPage = SssProduct[] | { items?: SssProduct[]; products?: SssProduct[]; nextCursor?: string | null; cursor?: string | null };

const PAGE_LIMIT = 100;
const MAX_PAGES = 20;

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickImage(product: SssProduct): string | null {
  const direct = text(product.imageUrl) || text(product.image) || text(product.photoUrl) || text(product.thumbnailUrl);
  if (direct) return direct;

  for (const key of ["images", "photos", "media", "files"]) {
    const entries = product[key];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (typeof entry === "string" && entry) return entry;
      if (entry && typeof entry === "object") {
        const url = text((entry as SssProduct).url) || text((entry as SssProduct).src);
        if (url) return url;
      }
    }
  }

  return null;
}

function toJersey(product: SssProduct): Jersey | null {
  const id = text(product.id) || text(product.sku);
  const rawName = text(product.name) || text(product.title);
  if (!id || !rawName) return null;

  if (product.active === false) return null;
  const status = normalize(text(product.status));
  if (status === "archived" || status === "draft" || status === "inactive") return null;

  const facts = jerseyFacts(product);
  const { team, kit, audience, competition } = facts;
  const category: Jersey["category"] = kit === null ? "Spéciaux" : kit === "Domicile" ? "Domicile" : "Extérieur";

  const quantity = product.unlimitedStock === true ? null : (product.quantity ?? product.stock ?? product.onHand);
  const price = num(product.price ?? product.salePrice ?? product.unitPrice ?? product.sellingPrice);
  const title = jerseyTitle(facts);

  return {
    id,
    slug: SLUGS[id] || slugify(text(product.slug)) || jerseySlug(facts) || slugify(id),
    team,
    title,
    name: jerseyLine(facts),
    category,
    audience,
    competition,
    fields: jerseyFields(facts),
    price,
    imageUrl: pickImage(product),
    summary: text(product.description) || `${title}${price ? `, disponible à ${formatPrice(price)}` : ""}.`,
    inStock: quantity === undefined || quantity === null ? true : num(quantity) > 0
  };
}

export const getJerseys = cache(async (): Promise<Jersey[]> => {
  if (!isSssConfigured()) {
    console.warn("[catalog] SSS n'est pas configuré — catalogue vide.");
    return [];
  }

  const products: SssProduct[] = [];
  let cursor: string | null | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (cursor) params.set("cursor", cursor);

    let data: ProductPage;
    try {
      data = await sssStoreRequest<ProductPage>(`/products?${params}`);
    } catch (error) {
      // Keep the site up when SSS is unreachable; the home page shows its empty state.
      console.error("[catalog] lecture des produits SSS impossible", error);
      break;
    }
    const items = Array.isArray(data) ? data : (data.items ?? data.products ?? []);
    products.push(...items);

    cursor = Array.isArray(data) ? null : (data.nextCursor ?? null);
    if (!cursor || items.length === 0) break;
  }

  const seen = new Set<string>();
  return products
    .map(toJersey)
    .filter((jersey): jersey is Jersey => jersey !== null)
    .map((jersey) => {
      // Guarantee unique slugs even if two products share a name.
      const slug = seen.has(jersey.slug) ? `${jersey.slug}-${slugify(jersey.id)}` : jersey.slug;
      seen.add(slug);
      return { ...jersey, slug };
    })
    // Out-of-stock jerseys stay visible (with a badge) but go after available ones.
    .sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.team.localeCompare(b.team, "fr"));
});

export function formatPrice(price: number) {
  return `${new Intl.NumberFormat("fr-FR").format(price)} FCFA`;
}

export async function getJersey(slug: string) {
  return (await getJerseys()).find((jersey) => jersey.slug === slug);
}

export function getCategories(jerseys: Jersey[]) {
  return categoryOrder.filter((category) => jerseys.some((jersey) => jersey.category === category));
}

export function getCategoryId(category: Jersey["category"]) {
  return category === "Domicile" ? "domicile" : category === "Extérieur" ? "exterieur" : "speciaux";
}

export async function getRelatedJerseys(current: Jersey, limit = 4) {
  return (await getJerseys())
    .filter((jersey) => jersey.slug !== current.slug)
    .sort(
      (a, b) =>
        Number(b.inStock) - Number(a.inStock) ||
        Number(b.category === current.category) - Number(a.category === current.category)
    )
    .slice(0, limit);
}

/** WhatsApp link to the shop. `site` comes from getSite() (the number is editable in the dashboard). */
export function getWhatsappUrl(shop: Pick<SiteContent, "whatsappNumber">, jersey?: Jersey, intent: "order" | "restock" = "order") {
  const message = !jersey
    ? "Bonjour Capitaine Sport, je veux commander un maillot."
    : intent === "restock"
      ? `Bonjour Capitaine Sport, prévenez-moi quand le ${jersey.title} sera de retour en stock.`
      : [
          "Bonjour Capitaine Sport, je veux commander ce maillot :",
          ...jersey.fields.map((field) => `${field.label} : ${field.value}`),
          `Prix : ${formatPrice(jersey.price)}`
        ].join("\n");

  return `https://wa.me/${shop.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
