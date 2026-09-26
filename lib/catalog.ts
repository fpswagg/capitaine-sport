import { cache } from "react";

import siteData from "@/data/site.json";
import { isSssConfigured, sssStoreRequest } from "@/lib/sss";

export type Jersey = {
  id: string;
  slug: string;
  team: string;
  name: string;
  category: "Domicile" | "Extérieur";
  version: "Pro" | "Collector";
  competition: string;
  price: number;
  imageUrl: string | null;
  summary: string;
  inStock: boolean;
};

export type SiteContent = typeof siteData;

export const site = siteData satisfies SiteContent;

export const categoryOrder: Jersey["category"][] = ["Domicile", "Extérieur"];

// The SSS product payload is loosely typed on purpose: fields vary with how the
// business filled its catalog, so every read goes through a tolerant accessor.
type SssProduct = Record<string, unknown>;

type ProductPage = SssProduct[] | { items?: SssProduct[]; products?: SssProduct[]; nextCursor?: string | null; cursor?: string | null };

const PAGE_LIMIT = 100;
const MAX_PAGES = 20;

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "name" in value) return text((value as { name: unknown }).name);
  return "";
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  if (typeof value === "string") return value.split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
  return [];
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function slugify(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

// Domicile vs Extérieur is not a first-class SSS field. We read, in order of
// reliability: an explicit attribute, then the tags, the category, the SKU
// suffix (same `-ext` / `-int` convention as the original catalog) and finally
// the product name. Anything that says nothing is treated as Domicile.
const AWAY_PATTERN = /(^|[^a-z])(ext|exterieur|away|third|troisieme|3rd|alternatif)([^a-z]|$)/;
const HOME_PATTERN = /(^|[^a-z])(int|interieur|domicile|home)([^a-z]|$)/;

function detectCategory(product: SssProduct, name: string): Jersey["category"] {
  const attributes = (product.attributes ?? product.metadata ?? product.custom ?? {}) as SssProduct;
  const sources = [
    text(product.side) || text(attributes.side) || text(attributes.kit) || text(attributes.type),
    list(product.tags).join(" "),
    text(product.category) || text(product.categoryName),
    text(product.sku).replace(/[-_]/g, " "),
    name
  ];

  for (const source of sources) {
    const value = normalize(source);
    if (!value) continue;
    if (AWAY_PATTERN.test(value)) return "Extérieur";
    if (HOME_PATTERN.test(value)) return "Domicile";
  }

  return "Domicile";
}

function toJersey(product: SssProduct): Jersey | null {
  const id = text(product.id) || text(product.sku);
  const rawName = text(product.name) || text(product.title);
  if (!id || !rawName) return null;

  const status = normalize(text(product.status));
  if (status === "archived" || status === "draft" || status === "inactive") return null;

  const attributes = (product.attributes ?? product.metadata ?? {}) as SssProduct;
  const tags = list(product.tags).map(normalize);
  const category = detectCategory(product, rawName);
  const team = text(attributes.team) || text(product.brand) || rawName.replace(/\b(maillot|pro|domicile|ext[ée]rieur|int[ée]rieur|collector|home|away)\b/gi, "").replace(/\s{2,}/g, " ").trim() || rawName;
  const version: Jersey["version"] =
    tags.includes("collector") || /collector/i.test(`${rawName} ${text(product.sku)}`) ? "Collector" : "Pro";

  const quantity = product.quantity ?? product.stock ?? product.onHand;
  const price = num(product.price ?? product.salePrice ?? product.unitPrice ?? product.sellingPrice);

  return {
    id,
    slug: slugify(text(product.slug) || text(product.sku) || `${rawName}-${id}`) || id,
    team,
    name: team === rawName ? `Maillot ${version} ${category}` : rawName,
    category,
    version,
    competition: text(attributes.competition) || text(attributes.league) || tags.find((tag) => !["collector", "pro"].includes(tag)) || "",
    price,
    imageUrl: pickImage(product),
    summary:
      text(product.description) ||
      `Maillot ${version.toLowerCase()} ${category.toLowerCase()} ${team}${price ? `, disponible à ${formatPrice(price)}` : ""}.`,
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
    .sort((a, b) => a.team.localeCompare(b.team, "fr"));
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
  return category === "Domicile" ? "domicile" : "exterieur";
}

export async function getRelatedJerseys(current: Jersey, limit = 4) {
  return (await getJerseys())
    .filter((jersey) => jersey.slug !== current.slug)
    .sort((a, b) => Number(b.category === current.category) - Number(a.category === current.category))
    .slice(0, limit);
}

export function getWhatsappUrl(jersey?: Jersey) {
  const message = jersey
    ? `Bonjour Capitaine Sport, je veux commander le ${jersey.name} ${jersey.team} à ${formatPrice(jersey.price)}.`
    : "Bonjour Capitaine Sport, je veux commander un maillot.";

  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
