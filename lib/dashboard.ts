import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { jerseyFacts, type JerseyFacts } from "@/lib/catalog";
import { config } from "@/lib/config";
import { readSiteTexts, type SiteTexts } from "@/lib/site";
import { getAccessToken, getSession, safeNext, type SssBusiness, type SssSession } from "@/lib/sss-auth";
import { today } from "@/lib/stats";

/**
 * Team dashboard (/dashboard). Read and written with the signed-in person's own SSS
 * access (Sign in with SSS), never with SSS_API_KEY: they can do what their role in
 * the business allows in SSS.
 */

const EARLY_REFRESH_MS = 60_000;

export type Raw = Record<string, unknown>;
export const obj = (value: unknown): Raw => (value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {});
export const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
export const str = (value: unknown): string => (typeof value === "string" ? value : typeof value === "number" ? String(value) : "");
const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0);

/** Did this person connect THIS business? */
export function dashboardBusiness(session: SssSession | null): SssBusiness | null {
  const b = session?.user.business;
  if (!b) return null;
  return b.id === config.storeId || b.slug === config.storeId ? b : null;
}

/** Edits need the "business" scope (read and write), not "business:read". */
export function canWrite(session: SssSession | null) {
  return Boolean(session?.scope.split(/\s+/).includes("business"));
}

export type DashContext = { session: SssSession; business: SssBusiness; base: string; token: string; canWrite: boolean };

export type DashState = { kind: "ok"; ctx: DashContext } | { kind: "signed_out" } | { kind: "wrong_business"; session: SssSession };

const base = (business: SssBusiness) => `/api/v1/stores/${encodeURIComponent(business.id)}`;

/**
 * For pages (read-only cookies): the live session, or why not. An expired token goes
 * through /auth/sss/refresh, which saves the new pair and comes back.
 */
export async function dashState(): Promise<DashState> {
  const session = await getSession();
  if (!session) return { kind: "signed_out" };
  const business = dashboardBusiness(session);
  if (!business) return { kind: "wrong_business", session };
  if (session.expiresAt - EARLY_REFRESH_MS <= Date.now()) {
    const here = (await headers()).get("x-pathname");
    redirect(`/auth/sss/refresh?next=${encodeURIComponent(safeNext(here))}`);
  }
  return { kind: "ok", ctx: { session, business, base: base(business), token: session.accessToken, canWrite: canWrite(session) } };
}

/** The page context, or back to the sign-in screen (the layout shows it). */
export async function requireDash(): Promise<DashContext> {
  const state = await dashState();
  if (state.kind !== "ok") redirect("/dashboard");
  return state.ctx;
}

/** For server actions: may refresh the token (cookies are writable there). */
export async function actionDash(): Promise<DashContext> {
  const session = await getSession();
  const business = dashboardBusiness(session);
  const token = await getAccessToken();
  if (!session || !business || !token) throw new Error("Session expirée : reconnecte-toi avec SSS.");
  if (!canWrite(session)) throw new Error("Ton accès SSS est en lecture seule.");
  return { session, business, base: base(business), token, canWrite: true };
}

export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function api<T = unknown>(ctx: DashContext, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const h = new Headers({ Authorization: `Bearer ${ctx.token}`, Accept: "application/json" });
  if (init.body !== undefined) h.set("Content-Type", "application/json");
  const res = await fetch(`${config.apiUrl}${ctx.base}${path}`, {
    method: init.method ?? "GET",
    headers: h,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as { data?: unknown; error?: { message?: string } } | null;
  if (!res.ok) throw new ApiFailure(res.status, body?.error?.message || `SSS a répondu ${res.status}`);
  return (body?.data ?? null) as T;
}

const safe = (ctx: DashContext, path: string) => api(ctx, path).catch(() => null);
const items = (value: unknown) => (Array.isArray(value) ? value : arr(obj(value).items)).map(obj);

// ── Dates (Douala) ───────────────────────────────────────────────────────────

/** "YYYY-MM-DD" n days before today (Douala). */
export function dayMinus(days: number): string {
  const d = new Date(`${today()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function doualaDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA", { timeZone: "Africa/Douala" });
}

/** Sum of a {day: n} series over the last `days` days, today included. */
export function sumSince(series: Record<string, number>, days: number): number {
  const from = dayMinus(days - 1);
  return Object.entries(series).reduce((n, [day, v]) => (day >= from ? n + v : n), 0);
}

const series = (value: unknown): Record<string, number> =>
  Object.fromEntries(Object.entries(obj(value)).map(([k, v]) => [k, num(v)]));

// ── Jerseys ──────────────────────────────────────────────────────────────────

export type DashImage = { url: string; key: string; alt: string };

export type DashJersey = JerseyFacts & {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  unlimited: boolean;
  active: boolean;
  images: DashImage[];
  imageUrl: string | null;
  tags: string[];
  meta: Raw;
  views: number;
  daily: Record<string, number>;
  wa: Record<string, number>;
  updatedAt: string;
  createdAt: string;
};

export function toDashJersey(p: Raw): DashJersey {
  const meta = obj(p.metadata);
  const images = arr(p.images)
    .map((i) => (typeof i === "string" ? { url: i } : obj(i)))
    .map((i) => ({ url: str(i.url), key: str(i.key), alt: str(i.alt) }))
    .filter((i) => i.url);
  return {
    ...jerseyFacts(p),
    id: str(p.id),
    sku: str(p.sku),
    name: str(p.name),
    description: str(p.description),
    price: num(p.price),
    quantity: num(p.quantity),
    unlimited: p.unlimitedStock === true,
    active: p.active !== false,
    images,
    imageUrl: images[0]?.url ?? (str(p.imageUrl) || null),
    tags: arr(p.tags).map(str).filter(Boolean),
    meta,
    views: num(meta.views),
    daily: series(meta.daily),
    wa: series(meta.wa),
    updatedAt: str(p.updatedAt),
    createdAt: str(p.createdAt),
  };
}

export const inStock = (j: DashJersey) => j.unlimited || j.quantity > 0;

export async function dashJerseys(ctx: DashContext): Promise<DashJersey[]> {
  const out: Raw[] = [];
  let cursor = "";
  for (let page = 0; page < 20; page++) {
    const raw = await api(ctx, `/products?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    out.push(...items(raw));
    cursor = Array.isArray(raw) ? "" : str(obj(raw).nextCursor);
    if (!cursor) break;
  }
  return out.map(toDashJersey).sort((a, b) => a.team.localeCompare(b.team, "fr") || a.kit.localeCompare(b.kit, "fr"));
}

export async function dashJersey(ctx: DashContext, id: string): Promise<DashJersey | null> {
  const raw = await safe(ctx, `/products/${encodeURIComponent(id)}`);
  return raw && str(obj(raw).id) ? toDashJersey(obj(raw)) : null;
}

// ── Sales (SSS invoices) ─────────────────────────────────────────────────────

export type SaleLine = { productId: string; sku: string; name: string; qty: number; unitPrice: number };

export type DashSale = {
  id: string;
  ref: string;
  at: string;
  day: string;
  status: string;
  paid: boolean;
  client: string;
  phone: string;
  lines: SaleLine[];
  total: number;
  paidVia: string;
  notes: string;
  source: string;
};

export function toSale(r: Raw): DashSale {
  const d = obj(r.data);
  const client = d.clientName ?? d.client;
  const lines = arr(d.lines)
    .map(obj)
    .map((l) => ({ productId: str(l.productId), sku: str(l.sku), name: str(l.name), qty: num(l.qty) || 1, unitPrice: num(l.unitPrice) }));
  const at = str(d.paidAt) || str(r.createdAt);
  const status = str(d.status) || "draft";
  return {
    id: str(r.id),
    ref: str(r.name),
    at,
    day: doualaDay(at),
    status,
    paid: status === "paid",
    client: typeof client === "string" ? client : str(obj(client).name),
    phone: str(d.clientPhone),
    lines,
    total: num(d.total) || lines.reduce((n, l) => n + l.qty * l.unitPrice, 0),
    paidVia: str(d.paidVia),
    notes: str(d.notes),
    source: str(d.source),
  };
}

export async function dashSales(ctx: DashContext): Promise<DashSale[]> {
  const raw = await safe(ctx, "/sasto/invoice");
  return items(raw)
    .map(toSale)
    .filter((s) => s.status !== "cancelled" && s.status !== "void")
    .sort((a, b) => b.at.localeCompare(a.at));
}

export const PAID_VIA: Array<{ value: string; label: string }> = [
  { value: "cash", label: "Espèces" },
  { value: "orange_money", label: "Orange Money" },
  { value: "mtn_momo", label: "MTN MoMo" },
  { value: "bank_transfer", label: "Virement" },
  { value: "other", label: "Autre" },
];

export const paidViaLabel = (value: string) => PAID_VIA.find((p) => p.value === value)?.label ?? (value || "—");

// ── Messages (SSS feedback: contact form, Capitaine bot) ─────────────────────

export type DashMessage = {
  id: string;
  at: string;
  title: string;
  kind: "order_request" | "message";
  name: string;
  phone: string;
  email: string;
  channel: string;
  source: string;
  subject: string;
  body: string;
  items: Array<{ productId: string; name: string; qty: number; unitPrice: number }>;
  handled: boolean;
  meta: Raw;
};

export function toMessage(r: Raw): DashMessage {
  const d = obj(r.data);
  const meta = obj(r.metadata);
  const contact = obj(d.contact);
  const list = arr(d.items)
    .map(obj)
    .map((i) => ({ productId: str(i.productId), name: str(i.name), qty: num(i.qty) || 1, unitPrice: num(i.unitPrice) }));
  return {
    id: str(r.id),
    at: str(r.createdAt),
    title: str(r.name),
    kind: str(d.type) === "order_request" || list.length ? "order_request" : "message",
    name: str(d.name) || str(d.clientName) || str(contact.name),
    phone: str(d.phone) || str(contact.phone),
    email: str(d.email) || str(contact.email),
    channel: str(d.channel),
    source: str(d.source),
    subject: str(d.subject),
    body: str(d.message) || str(d.body),
    items: list,
    handled: meta.handled === true,
    meta,
  };
}

export async function dashMessages(ctx: DashContext): Promise<DashMessage[]> {
  const raw = await safe(ctx, "/sasto/feedback");
  return items(raw)
    .map(toMessage)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** wa.me link for a phone number (Cameroon by default). */
export function waLink(phone: string, text = ""): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 9) digits = `237${digits}`;
  if (digits.length < 9) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

// ── Shop settings ────────────────────────────────────────────────────────────

export type DashStore = {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  address: string;
  description: string;
  meta: Raw;
  texts: SiteTexts;
  waDaily: Record<string, number>;
};

export async function dashStore(ctx: DashContext): Promise<DashStore> {
  const store = obj(await safe(ctx, ""));
  const meta = obj(store.metadata);
  return {
    name: str(store.name),
    phone: str(store.phone),
    whatsapp: str(store.whatsapp),
    email: str(store.email),
    city: str(store.city),
    address: str(store.address),
    description: str(store.description),
    meta,
    texts: readSiteTexts(meta),
    waDaily: series(meta.waDaily),
  };
}

// ── Formatting ───────────────────────────────────────────────────────────────

export const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;

export function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = doualaDay(iso);
  const time = d.toLocaleTimeString("fr-FR", { timeZone: "Africa/Douala", hour: "2-digit", minute: "2-digit" });
  if (day === today()) return `Aujourd'hui, ${time}`;
  if (day === dayMinus(1)) return `Hier, ${time}`;
  return d.toLocaleDateString("fr-FR", { timeZone: "Africa/Douala", day: "numeric", month: "short", year: day.slice(0, 4) === today().slice(0, 4) ? undefined : "numeric" });
}

export function jerseyTitle(j: Pick<DashJersey, "team" | "kit" | "season" | "name">): string {
  if (!j.team) return j.name;
  return `${j.team} · ${j.kit}${j.season ? ` ${j.season}` : ""}`;
}
