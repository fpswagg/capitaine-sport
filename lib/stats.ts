import "server-only";

import { sssStoreRequest } from "@/lib/sss";

/**
 * Visitor counters, kept in SSS (no database here), written with the business key:
 * - product pages:   product metadata.views (total) and metadata.daily {day: n}
 * - WhatsApp clicks: product metadata.wa {day: n} (order / restock buttons),
 *                    store metadata.waDaily {day: n} (contact buttons, no product)
 * Days are Douala days; the last DAILY_KEEP are kept.
 */
const DAILY_KEEP = 60;

type Raw = Record<string, unknown>;
const obj = (value: unknown): Raw => (value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {});

export function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Douala" });
}

function bump(series: unknown): Record<string, number> {
  const out = { ...obj(series) } as Record<string, number>;
  const day = today();
  out[day] = (Number(out[day]) || 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => b.localeCompare(a)).slice(0, DAILY_KEEP));
}

async function patchProductMeta(productId: string, change: (meta: Raw) => Raw) {
  const product = obj(await sssStoreRequest(`/products/${encodeURIComponent(productId)}`, { revalidate: false }));
  if (!product.id) return false;
  const metadata = change({ ...obj(product.metadata) });
  await sssStoreRequest(`/products/${encodeURIComponent(productId)}`, { method: "PATCH", body: { metadata } });
  return true;
}

export function recordProductView(productId: string) {
  return patchProductMeta(productId, (meta) => ({ ...meta, views: (Number(meta.views) || 0) + 1, daily: bump(meta.daily) }));
}

export async function recordWhatsappClick(productId: string | null) {
  if (productId) return patchProductMeta(productId, (meta) => ({ ...meta, wa: bump(meta.wa) }));
  const store = obj(await sssStoreRequest("", { revalidate: false }));
  const metadata = { ...obj(store.metadata) };
  metadata.waDaily = bump(metadata.waDaily);
  await sssStoreRequest("", { method: "PATCH", body: { metadata } });
  return true;
}

/** Same visitor + same thing within 30 min counts once (per server instance). */
const seen = new Map<string, number>();
export function firstTime(request: Request, thing: string): boolean {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "local";
  const key = `${ip}|${thing}`;
  const now = Date.now();
  if (now - (seen.get(key) ?? 0) < 30 * 60_000) return false;
  if (seen.size > 5000) seen.clear();
  seen.set(key, now);
  return true;
}
