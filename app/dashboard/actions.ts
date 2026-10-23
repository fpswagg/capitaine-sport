"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { slugify, type Kit } from "@/lib/catalog";
import {
  actionDash,
  api,
  ApiFailure,
  dashJersey,
  obj,
  PAID_VIA,
  str,
  type DashContext,
  type DashJersey,
  type Raw,
} from "@/lib/dashboard";

export type FormState = { error?: string; ok?: string; at?: number };

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const field = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
const int = (value: string) => {
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : NaN;
};
const message = (err: unknown) => (err instanceof Error ? err.message : "Une erreur est survenue.");

/** The public site reads SSS through the "sss" cache tag: show the change at once. */
function refreshSite() {
  updateTag("sss");
}

// ── Jerseys ──────────────────────────────────────────────────────────────────

const KIT_WORD: Record<Kit, string> = { Domicile: "Domicile", Extérieur: "Extérieur", Troisième: "3ème" };
const KIT_KEY: Record<Kit, string> = { Domicile: "domicile", Extérieur: "exterieur", Troisième: "troisieme" };
const asKit = (value: string): Kit => (value === "Extérieur" || value === "Troisième" ? value : "Domicile");

/** "2024/25", "24-25", "2024-2025" → "2024/25". */
function cleanSeason(value: string): string {
  const m = value.replace(/\s/g, "").match(/^(?:20)?(\d{2})[/-](?:20)?(\d{2})$/);
  return m ? `20${m[1]}/${m[2]}` : value.replace(/\s+/g, " ").slice(0, 12);
}

/** The name the catalog reads back: "Maillot Chelsea Extérieur 2024/25". */
function jerseyName(team: string, kit: Kit, season: string) {
  return `Maillot ${team} ${KIT_WORD[kit]}${season ? ` ${season}` : ""}`.slice(0, 160);
}

async function uploadPhotos(ctx: DashContext, files: File[], baseName: string) {
  const out: Array<{ url: string; key: string; alt: string }> = [];
  for (const [i, file] of files.entries()) {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const data = obj(
      await api(ctx, "/files", {
        method: "POST",
        body: {
          name: `${slugify(baseName) || "maillot"}-${Date.now()}-${i}.${ext}`,
          mediaType: file.type,
          dataBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
        },
      })
    );
    if (str(data.url)) out.push({ url: str(data.url), key: str(data.key), alt: baseName });
  }
  return out;
}

function pickedPhotos(fd: FormData): File[] | string {
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of files) {
    if (!PHOTO_TYPES.includes(f.type)) return "Photos acceptées : JPG, PNG ou WebP.";
    if (f.size > MAX_PHOTO_BYTES) return "Une photo dépasse 3 Mo.";
  }
  return files;
}

export async function saveJersey(_prev: FormState, fd: FormData): Promise<FormState> {
  let createdId = "";
  try {
    const ctx = await actionDash();
    const id = field(fd, "id");
    const team = field(fd, "team").replace(/\s+/g, " ");
    const kit = asKit(field(fd, "kit"));
    const season = cleanSeason(field(fd, "season"));
    const collector = fd.get("collector") === "on";
    const competition = field(fd, "competition").slice(0, 60);
    const description = field(fd, "description").slice(0, 2000);
    const price = int(field(fd, "price"));
    const active = fd.get("active") === "on";

    if (team.length < 2) return { error: "Indique l'équipe." };
    if (!Number.isFinite(price) || price < 0) return { error: "Le prix n'est pas valide." };
    const photos = pickedPhotos(fd);
    if (typeof photos === "string") return { error: photos };
    if (photos.length > MAX_PHOTOS) return { error: `Ajoute au maximum ${MAX_PHOTOS} photos par envoi.` };

    const name = jerseyName(team, kit, season);
    const before = id ? await dashJersey(ctx, id) : null;
    if (id && !before) return { error: "Ce maillot n'existe plus." };
    if ((before?.images.length ?? 0) + photos.length > MAX_PHOTOS) return { error: `${MAX_PHOTOS} photos maximum par maillot.` };

    const tags = (before?.tags ?? []).filter((t) => t.toLowerCase() !== "collector");
    if (collector) tags.unshift("collector");
    const metadata: Raw = { ...(before?.meta ?? {}), team, kit: KIT_KEY[kit], season, competition };

    const uploaded = await uploadPhotos(ctx, photos, name);
    const images = [...(before?.images ?? []), ...uploaded];

    if (before) {
      await api(ctx, `/products/${encodeURIComponent(before.id)}`, {
        method: "PATCH",
        body: { name, price, description: description || null, tags: tags.slice(0, 20), active, images, metadata },
      });
    } else {
      const quantity = int(field(fd, "quantity") || "0");
      if (!Number.isFinite(quantity) || quantity < 0) return { error: "Le stock n'est pas valide." };
      const created = obj(
        await api(ctx, "/products", {
          method: "POST",
          body: { name, price, currency: "FCFA", quantity: 0, description: description || undefined, tags, active, images, metadata },
        })
      );
      createdId = str(created.id);
      // Opening stock as a movement, so it shows in the SSS stock history.
      if (createdId && quantity > 0) {
        await api(ctx, `/products/${encodeURIComponent(createdId)}/movements`, {
          method: "POST",
          body: { type: "receive", quantity, reason: "Stock de départ (site)" },
        });
      }
    }
    refreshSite();
    if (before) return { ok: "Maillot enregistré.", at: Date.now() };
  } catch (err) {
    return { error: message(err) };
  }
  redirect(createdId ? `/dashboard/maillots/${createdId}?nouveau=1` : "/dashboard/maillots");
}

/** Sets the stock to a number: more = a delivery (receive), less = a correction. */
export async function setStock(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const ctx = await actionDash();
    const id = field(fd, "id");
    const target = int(field(fd, "quantity"));
    if (!Number.isFinite(target) || target < 0) return { error: "Stock invalide." };
    const jersey = await dashJersey(ctx, id);
    if (!jersey) return { error: "Ce maillot n'existe plus." };
    if (jersey.unlimited) {
      await api(ctx, `/products/${encodeURIComponent(id)}`, { method: "PATCH", body: { unlimitedStock: false, quantity: target } });
    } else {
      const delta = target - jersey.quantity;
      if (delta === 0) return { ok: "Rien à changer." };
      await api(ctx, `/products/${encodeURIComponent(id)}/movements`, {
        method: "POST",
        body: delta > 0 ? { type: "receive", quantity: delta, reason: "Arrivage (site)" } : { type: "adjustment", quantity: delta, reason: "Correction de stock (site)" },
      });
    }
    refreshSite();
    return { ok: `Stock : ${target}.`, at: Date.now() };
  } catch (err) {
    return { error: message(err) };
  }
}

export async function setVisible(fd: FormData): Promise<void> {
  try {
    const ctx = await actionDash();
    const active = field(fd, "active") === "true";
    await api(ctx, `/products/${encodeURIComponent(field(fd, "id"))}`, { method: "PATCH", body: { active } });
    refreshSite();
  } catch (err) {
    throw new Error(message(err));
  }
  redirect(`/dashboard/maillots?visibilite=${field(fd, "active") === "true" ? "visible" : "masque"}`);
}

export async function duplicateJersey(fd: FormData): Promise<void> {
  const ctx = await actionDash();
  const src = await dashJersey(ctx, field(fd, "id"));
  if (!src) redirect("/dashboard/maillots");
  const meta = { ...src.meta };
  delete meta.views;
  delete meta.daily;
  delete meta.wa;
  const created = obj(
    await api(ctx, "/products", {
      method: "POST",
      body: {
        name: `${src.name} (copie)`.slice(0, 160),
        price: src.price,
        currency: "FCFA",
        quantity: 0,
        description: src.description || undefined,
        tags: src.tags,
        active: false,
        images: src.images,
        metadata: meta,
      },
    })
  );
  refreshSite();
  redirect(`/dashboard/maillots/${str(created.id)}?copie=1`);
}

export async function deleteJersey(fd: FormData): Promise<void> {
  let done = false;
  try {
    const ctx = await actionDash();
    const id = field(fd, "id");
    const jersey = await dashJersey(ctx, id);
    await api(ctx, `/products/${encodeURIComponent(id)}`, { method: "DELETE" });
    // Its photos go too (they are not shared with another product, except copies: keep those).
    if (jersey && !field(fd, "keepPhotos")) {
      for (const img of jersey.images) {
        if (img.key) await api(ctx, `/files?key=${encodeURIComponent(img.key)}`, { method: "DELETE" }).catch(() => null);
      }
    }
    refreshSite();
    done = true;
  } catch (err) {
    if (err instanceof ApiFailure && err.status === 403) throw new Error("Ton rôle dans SSS ne permet pas de supprimer.");
    throw new Error(message(err));
  }
  if (done) redirect("/dashboard/maillots?supprime=1");
}

async function patchImages(ctx: DashContext, jersey: DashJersey, images: DashJersey["images"]) {
  await api(ctx, `/products/${encodeURIComponent(jersey.id)}`, { method: "PATCH", body: { images } });
  refreshSite();
}

async function deleteUnusedPhoto(ctx: DashContext, jersey: DashJersey, photo: DashJersey["images"][number]) {
  if (!photo.key) return;
  const raw = await api<unknown>(ctx, "/products?limit=100").catch(() => null);
  const list = (Array.isArray(raw) ? raw : (obj(raw).items as unknown[]) ?? []).map(obj);
  const used = list.some((p) => str(p.id) !== jersey.id && JSON.stringify(p.images ?? []).includes(photo.key));
  if (!used) await api(ctx, `/files?key=${encodeURIComponent(photo.key)}`, { method: "DELETE" }).catch(() => null);
}

export async function removePhoto(fd: FormData): Promise<void> {
  try {
    const ctx = await actionDash();
    const jersey = await dashJersey(ctx, field(fd, "id"));
    if (!jersey) throw new Error("Ce maillot n'existe plus.");
    const url = field(fd, "url");
    const photo = jersey.images.find((i) => i.url === url);
    await patchImages(ctx, jersey, jersey.images.filter((i) => i.url !== url));
    // A copy shares its photos with the original: only delete the file when nobody else uses it.
    if (photo) await deleteUnusedPhoto(ctx, jersey, photo);
  } catch (err) {
    throw new Error(message(err));
  }
  redirect(`/dashboard/maillots/${encodeURIComponent(field(fd, "id"))}?photo=retiree`);
}

export async function setCover(fd: FormData): Promise<void> {
  try {
    const ctx = await actionDash();
    const jersey = await dashJersey(ctx, field(fd, "id"));
    if (!jersey) throw new Error("Ce maillot n'existe plus.");
    const url = field(fd, "url");
    const first = jersey.images.find((i) => i.url === url);
    if (!first) return;
    await patchImages(ctx, jersey, [first, ...jersey.images.filter((i) => i.url !== url)]);
  } catch (err) {
    throw new Error(message(err));
  }
  redirect(`/dashboard/maillots/${encodeURIComponent(field(fd, "id"))}?photo=couverture`);
}

export async function removeJersey(fd: FormData): Promise<void> {
  try {
    const ctx = await actionDash();
    const id = field(fd, "id");
    const jersey = await dashJersey(ctx, id);
    if (!jersey) throw new Error("Ce maillot n'existe plus.");
    await api(ctx, `/products/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!field(fd, "keepPhotos")) {
      for (const photo of jersey.images) await deleteUnusedPhoto(ctx, jersey, photo);
    }
    refreshSite();
  } catch (err) {
    if (err instanceof ApiFailure && err.status === 403) throw new Error("Ton rôle SSS ne permet pas de supprimer ce maillot.");
    throw new Error(message(err));
  }
  redirect("/dashboard/maillots?supprime=1");
}

// ── Sales ────────────────────────────────────────────────────────────────────

/** Last 9 digits: "+237 6 55 62 69 52" and "655626952" are the same number. */
const phoneKey = (phone: string) => phone.replace(/\D/g, "").slice(-9);

async function findOrCreateClient(ctx: DashContext, name: string, phone: string): Promise<{ id: string; name: string } | null> {
  const key = phoneKey(phone);
  if (!key && !name) return null;
  const raw = await api<unknown>(ctx, "/clients").catch(() => null);
  const clients = (Array.isArray(raw) ? raw : ((obj(raw).items as unknown[]) ?? [])).map(obj);
  const found = key ? clients.find((c) => phoneKey(str(c.phone)) === key) : null;
  if (found) return { id: str(found.id), name: str(found.name) || name };
  if (!name) return null;
  const created = obj(await api(ctx, "/clients", { method: "POST", body: { name: name.slice(0, 160), phone: phone || undefined } }));
  return str(created.id) ? { id: str(created.id), name: str(created.name) || name } : null;
}

export async function recordSale(_prev: FormState, fd: FormData): Promise<FormState> {
  let ref = "";
  try {
    const ctx = await actionDash();
    const ids = [...new Set(fd.getAll("productId").map(String))];
    const selected = new Set(fd.getAll("selectedProductId").map(String));
    if (selected.size !== fd.getAll("selectedProductId").length || [...selected].some((id) => !ids.includes(id))) return { error: "Sélection de maillots invalide." };
    const qtys = fd.getAll("qty").map((v) => int(String(v)));
    const prices = fd.getAll("unitPrice").map((v) => int(String(v)));
    const clientName = field(fd, "clientName").slice(0, 160);
    const phone = field(fd, "clientPhone").slice(0, 40);
    const paidVia = PAID_VIA.some((p) => p.value === field(fd, "paidVia")) ? field(fd, "paidVia") : "cash";
    const notes = field(fd, "notes").slice(0, 1000);
    const messageId = field(fd, "messageId");

    const wanted = ids
      .map((productId, i) => ({ productId, qty: qtys[i], unitPrice: prices[i] }))
      .filter((l) => selected.has(l.productId));
    if (!wanted.length) return { error: "Ajoute au moins un maillot." };
    if (wanted.some((l) => !Number.isFinite(l.qty) || l.qty < 1)) return { error: "Quantité invalide." };
    if (wanted.some((l) => !Number.isFinite(l.unitPrice) || l.unitPrice < 0)) return { error: "Prix invalide." };
    if (wanted.some((l) => !Number.isSafeInteger(l.qty) || !Number.isSafeInteger(l.unitPrice))) return { error: "Les quantités et prix doivent être des nombres entiers valides." };

    const lines = [];
    for (const l of wanted) {
      const j = await dashJersey(ctx, l.productId);
      if (!j) return { error: "Un des maillots n'existe plus." };
      if (!j.active) return { error: `${j.name} est masqué et ne peut pas être vendu depuis ce formulaire.` };
      if (!j.unlimited && j.quantity < l.qty) return { error: `Stock insuffisant : ${j.name} (${j.quantity} en stock).` };
      lines.push({ productId: j.id, sku: j.sku, name: j.name, qty: l.qty, unitPrice: l.unitPrice });
    }
    const total = lines.reduce((n, l) => n + l.qty * l.unitPrice, 0);
    if (!Number.isSafeInteger(total)) return { error: "Le montant total dépasse la limite autorisée." };
    const client = await findOrCreateClient(ctx, clientName, phone).catch(() => null);

    const invoice = obj(
      await api(ctx, "/sasto/invoice", {
        method: "POST",
        body: {
          data: {
            status: "draft",
            lines,
            total,
            currency: "FCFA",
            clientName: client ? { id: client.id, name: client.name } : clientName || "Client WhatsApp",
            ...(client ? { clientId: client.id } : {}),
            ...(phone ? { clientPhone: phone } : {}),
            ...(notes ? { notes } : {}),
            source: "site-dashboard",
          },
        },
      })
    );
    ref = str(invoice.name);
    // Collect = paid + stock goes down (one SALE movement per line).
    await api(ctx, `/sasto/invoice/${encodeURIComponent(str(invoice.id))}/collect`, { method: "POST", body: { data: { paidVia } } });

    if (messageId) {
      const msg = obj(await api(ctx, `/sasto/feedback/${encodeURIComponent(messageId)}`).catch(() => null));
      if (str(msg.id)) {
        await api(ctx, `/sasto/feedback/${encodeURIComponent(messageId)}`, {
          method: "PATCH",
          body: { metadata: { ...obj(msg.metadata), handled: true, saleRef: ref } },
        }).catch(() => null);
      }
    }
    refreshSite();
  } catch (err) {
    return { error: message(err) };
  }
  redirect(`/dashboard/ventes?vente=${encodeURIComponent(ref)}`);
}

// ── Messages ─────────────────────────────────────────────────────────────────

export async function setHandled(fd: FormData): Promise<void> {
  try {
    const ctx = await actionDash();
    const id = field(fd, "id");
    const msg = obj(await api(ctx, `/sasto/feedback/${encodeURIComponent(id)}`));
    const handled = field(fd, "handled") === "true";
    await api(ctx, `/sasto/feedback/${encodeURIComponent(id)}`, { method: "PATCH", body: { metadata: { ...obj(msg.metadata), handled } } });
  } catch (err) {
    throw new Error(message(err));
  }
  redirect("/dashboard/messages?mise-a-jour=1");
}

// ── Shop ─────────────────────────────────────────────────────────────────────

export async function saveShop(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const ctx = await actionDash();
    const store = obj(await api(ctx, ""));
    const phone = field(fd, "phone").slice(0, 40);
    const whatsapp = field(fd, "whatsapp").slice(0, 40);
    if (whatsapp && whatsapp.replace(/\D/g, "").length < 9) return { error: "Le numéro WhatsApp semble incomplet." };
    const site = {
      ...obj(obj(store.metadata).site),
      tagline: field(fd, "tagline").slice(0, 120),
      heroEyebrow: field(fd, "heroEyebrow").slice(0, 120),
      heroDescription: field(fd, "heroDescription").slice(0, 400),
    };
    await api(ctx, "", {
      method: "PATCH",
      body: {
        phone: phone || null,
        whatsapp: whatsapp || null,
        email: field(fd, "email").slice(0, 160) || null,
        city: field(fd, "city").slice(0, 80) || null,
        address: field(fd, "address").slice(0, 200) || null,
        metadata: { ...obj(store.metadata), site },
      },
    });
    refreshSite();
    return { ok: "Boutique enregistrée. Le site est à jour.", at: Date.now() };
  } catch (err) {
    if (err instanceof ApiFailure && err.status === 403) return { error: "Seul le propriétaire ou un gérant peut modifier la boutique." };
    return { error: message(err) };
  }
}
