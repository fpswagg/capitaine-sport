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
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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
// reliability: an explicit attribute, the tags, the product name
// ("Maillot Chelsea Extérieur 2024/25", "Maillot Real Madrid 3"), then the SKU
// (same `-ext` / `-int` convention as the original catalog; SSS truncates
// SKUs, so it comes after the name). Anything that says nothing is Domicile.
// Third kits ("3ème", "third", trailing "3") are sold as Extérieur.
const THIRD_PATTERN = /(^|[^a-z0-9])(3(e|eme|rd)?|third|troisieme)([^a-z0-9]|$)/;
const AWAY_PATTERN = /(^|[^a-z])(ext|exterieur|away|alternatif)([^a-z]|$)/;
const HOME_PATTERN = /(^|[^a-z])(int|interieur|domicile|home)([^a-z]|$)/;
const SEASON_PATTERN = /\b(20)?\d{2}\s*[/-]\s*(20)?\d{2}\b/;

type Kit = "Domicile" | "Extérieur" | "Troisième";

function detectKit(product: SssProduct, name: string): Kit {
  const attributes = (product.attributes ?? product.metadata ?? product.custom ?? {}) as SssProduct;
  const sources = [
    text(product.side) || text(attributes.side) || text(attributes.kit),
    list(product.tags).join(" "),
    name.replace(SEASON_PATTERN, " "),
    text(product.sku).replace(/[-_]/g, " ")
  ];

  for (const [index, source] of sources.entries()) {
    const value = normalize(source);
    if (!value) continue;
    // A bare trailing number in a SKU is a duplicate counter, not a kit.
    if (index !== 3 && THIRD_PATTERN.test(value)) return "Troisième";
    if (AWAY_PATTERN.test(value)) return "Extérieur";
    if (HOME_PATTERN.test(value)) return "Domicile";
  }

  return "Domicile";
}

// "Maillot Manchester City 3ème 2024/25" -> "Manchester City"
function extractTeam(name: string) {
  const team = name
    .replace(SEASON_PATTERN, " ")
    .replace(/(^|\s)(maillots?|pro|collector|domicile|home|away|third|troisi[èe]me|ext[ée]rieur|int[ée]rieur)(?=\s|$)/gi, " ")
    .replace(/(^|\s)3(e|ème|eme|rd)?(?=\s|$)/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return team || name;
}

function toJersey(product: SssProduct): Jersey | null {
  const id = text(product.id) || text(product.sku);
  const rawName = text(product.name) || text(product.title);
  if (!id || !rawName) return null;

  if (product.active === false) return null;
  const status = normalize(text(product.status));
  if (status === "archived" || status === "draft" || status === "inactive") return null;

  const attributes = (product.attributes ?? product.metadata ?? {}) as SssProduct;
  const tags = list(product.tags).map(normalize);
  const kit = detectKit(product, rawName);
  const category: Jersey["category"] = kit === "Domicile" ? "Domicile" : "Extérieur";
  const team = text(attributes.team) || extractTeam(rawName);
  const version: Jersey["version"] =
    tags.includes("collector") || /collector/i.test(`${rawName} ${text(product.sku)}`) ? "Collector" : "Pro";
  const season = rawName.match(SEASON_PATTERN)?.[0].replace(/\s+/g, "");

  const quantity = product.unlimitedStock === true ? null : (product.quantity ?? product.stock ?? product.onHand);
  const price = num(product.price ?? product.salePrice ?? product.unitPrice ?? product.sellingPrice);
  const name = `Maillot ${version} ${kit}${season ? ` ${season}` : ""}`;

  return {
    id,
    slug: slugify(text(product.slug) || `${team}-${kit}${season ? `-${season}` : ""}`) || slugify(id),
    team,
    name,
    category,
    version,
    competition: text(attributes.competition) || text(attributes.league) || tags.find((tag) => !["collector", "pro"].includes(tag)) || "",
    price,
    imageUrl: pickImage(product),
    summary:
      text(product.description) ||
      `Maillot ${version.toLowerCase()} ${kit.toLowerCase()} ${team}${price ? `, disponible à ${formatPrice(price)}` : ""}.`,
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
  return category === "Domicile" ? "domicile" : "exterieur";
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

export function getWhatsappUrl(jersey?: Jersey, intent: "order" | "restock" = "order") {
  const message = !jersey
    ? "Bonjour Capitaine Sport, je veux commander un maillot."
    : intent === "restock"
      ? `Bonjour Capitaine Sport, prévenez-moi quand le ${jersey.name} ${jersey.team} sera de retour en stock.`
      : `Bonjour Capitaine Sport, je veux commander le ${jersey.name} ${jersey.team} à ${formatPrice(jersey.price)}.`;

  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
