import "server-only";

import { cache } from "react";

import siteData from "@/data/site.json";
import { isSssConfigured, sssStoreRequest } from "@/lib/sss";

/**
 * The shop's texts and contact. data/site.json is the base; the team edits the rest in
 * /dashboard/boutique: phone and WhatsApp are the SSS store's own fields (the SSS bots
 * use them too), the texts live in the store metadata under `site`.
 */
export type SiteContent = typeof siteData;

/** Texts the dashboard may change (store metadata `site`). */
export type SiteTexts = { tagline?: string; heroEyebrow?: string; heroDescription?: string };

type StoreRow = { phone?: string | null; whatsapp?: string | null; metadata?: Record<string, unknown> | null };

/** "+237 696 57 64 77" → "237696576477" (wa.me wants digits with the country code). */
export function waDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 9 && digits.startsWith("6") ? `237${digits}` : digits;
}

export function readSiteTexts(metadata: unknown): SiteTexts {
  const raw = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>).site : null;
  if (!raw || typeof raw !== "object") return {};
  const pick = (key: string) => {
    const value = (raw as Record<string, unknown>)[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  return { tagline: pick("tagline"), heroEyebrow: pick("heroEyebrow"), heroDescription: pick("heroDescription") };
}

export const getSite = cache(async (): Promise<SiteContent> => {
  if (!isSssConfigured()) return siteData;
  let store: StoreRow | null = null;
  try {
    store = await sssStoreRequest<StoreRow>("", { revalidate: 300 });
  } catch (error) {
    console.error("[site] lecture de la boutique SSS impossible", error);
    return siteData;
  }
  const texts = readSiteTexts(store?.metadata);
  const whatsapp = waDigits(store?.whatsapp ?? "") || waDigits(store?.phone ?? "");
  const phone = (store?.phone ?? "").trim() || (store?.whatsapp ?? "").trim();
  return {
    ...siteData,
    tagline: texts.tagline ?? siteData.tagline,
    contactLabel: phone || siteData.contactLabel,
    whatsappNumber: whatsapp || siteData.whatsappNumber,
    hero: {
      ...siteData.hero,
      eyebrow: texts.heroEyebrow ?? siteData.hero.eyebrow,
      description: texts.heroDescription ?? siteData.hero.description
    }
  };
});
