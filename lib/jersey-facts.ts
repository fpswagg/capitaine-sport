// Reads what a jersey is from one SSS product. Pure on purpose (no server or
// framework import) so it is shared by the catalog and the dashboard, and tested
// directly by tests/jersey-facts.test.mjs.
//
// Metadata comes first. A product whose metadata names its club (metadata.club,
// or the older metadata.team) is described by its metadata alone: club, version,
// saison, age, edition, competition and collector. An emptied field stays empty,
// it never comes back from the name. Only a product without a club in its
// metadata is read from its name, tags and SKU. Nothing is guessed: the version
// "Spécial", any other version ("Gardien") or no version at all stays out of
// Domicile / Extérieur.

export type SssProduct = Record<string, unknown>;

export type Kit = "Domicile" | "Extérieur" | "Troisième";

export type JerseyFacts = {
  team: string;
  /** Known kit, or null for a special edition or an unknown version. */
  kit: Kit | null;
  /** What the title says about the version: "Domicile", "Troisième", "Dior", or "" (never "Spécial"). */
  kitLabel: string;
  /** The version in the words of the SSS product form: "Domicile", "3ème", "Spécial", "Gardien". */
  versionLabel: string;
  /** "Dior", "Ligue des Champions", or "". */
  edition: string;
  season: string;
  /** The age as the shop wrote it: "3-10 ans", or "" when nothing is said. */
  age: string;
  /** "enfant 3-10 ans", "enfant", or "" for an adult jersey. */
  audience: string;
  /** Null on a children's jersey, which is not sold as "Pro". */
  version: "Pro" | "Collector" | null;
  competition: string;
};

export function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "name" in value) return text((value as { name: unknown }).name);
  return "";
}

export function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  if (typeof value === "string") return value.split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
  return [];
}

export function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function slugify(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const KIT_WORDS: Record<string, Kit> = {
  domicile: "Domicile",
  home: "Domicile",
  int: "Domicile",
  interieur: "Domicile",
  exterieur: "Extérieur",
  away: "Extérieur",
  ext: "Extérieur",
  alternatif: "Extérieur",
  "3": "Troisième",
  "3e": "Troisième",
  "3eme": "Troisième",
  "3rd": "Troisième",
  third: "Troisième",
  troisieme: "Troisième"
};

/** The kit named anywhere in a phrase: "Maillot Real Madrid 3" -> Troisième. */
export function readKit(value: string): Kit | null {
  for (const word of normalize(value).split(/[^a-z0-9]+/)) {
    if (Object.hasOwn(KIT_WORDS, word)) return KIT_WORDS[word];
  }
  return null;
}

const isSpecialWord = (value: string) => /^(edition )?(speciale?s?|speciaux)$/.test(normalize(value));

const AGE_PATTERN = /(^|[^\d])(\d{1,2}\s*(?:-|–|à|a)\s*\d{1,2}|\d{1,2})\s*ans(?=[^a-zà-ÿ]|$)/i;
const KIDS_PATTERN = /(^|\s)(enfants?|kids?|juniors?|b[ée]b[ée]s?)(?=\s|$)/gi;
const SEASON_PATTERN = /(^|[^\d])((?:20)?(\d{2})\s*[/-]\s*(?:20)?(\d{2}))(?=[^\d]|$)/g;
const BARE_RANGE_PATTERN = /(^|\s)\d{1,2}\s*[-–]\s*\d{1,2}(?=\s|$)/g;

// A season runs over two consecutive years, which tells 2024/25 from an age or a size.
function findSeason(value: string): string {
  for (const match of value.matchAll(SEASON_PATTERN)) {
    if ((Number(match[4]) - Number(match[3]) + 100) % 100 === 1) return match[2];
  }
  return "";
}

/** Splits a free phrase into age, children's marker, season, and what is left. */
function parsePhrase(value: string) {
  const age = value.match(AGE_PATTERN)?.[2].replace(/\s*[-–]\s*/, "-") ?? "";
  let rest = age ? value.replace(AGE_PATTERN, "$1 ") : value;
  const kids = rest.search(KIDS_PATTERN) !== -1;
  rest = rest.replace(KIDS_PATTERN, " ");
  const season = findSeason(rest);
  if (season) rest = rest.replace(season, " ");
  rest = rest.replace(BARE_RANGE_PATTERN, " ");
  return { age: age ? `${age} ans` : "", kids, season: season.replace(/\s+/g, ""), rest: rest.replace(/\s{2,}/g, " ").trim() };
}

// "Maillot Manchester City 3ème" -> "Manchester City"
function teamFromName(rest: string, fallback: string) {
  const team = rest
    .replace(/(^|\s)(maillots?|pro|collector|disponibles?|sp[ée]ciale?s?|sp[ée]ciaux|domicile|home|away|third|troisi[èe]me|ext[ée]rieur|int[ée]rieur)(?=\s|$)/gi, " ")
    .replace(/(^|\s)3(e|ème|eme|rd)?(?=\s|$)/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return team || fallback;
}

function formatAudience(age: string, kids: boolean) {
  const value = age.replace(/\s+/g, " ").trim();
  if (/^adultes?$|^adults?$/i.test(value)) return "";
  if (!value) return kids ? "enfant" : "";
  if (/enfant|kid|junior|b[ée]b[ée]/i.test(value)) return value.toLowerCase();
  return /\d/.test(value) ? `enfant ${value}` : value;
}

export function jerseyFacts(product: SssProduct): JerseyFacts {
  const rawName = text(product.name) || text(product.title);
  const attributes = (product.attributes ?? product.metadata ?? product.custom ?? {}) as SssProduct;
  const tags = list(product.tags).map(normalize);
  const sku = text(product.sku);
  const parsedName = parsePhrase(rawName);
  const team = text(attributes.club) || text(attributes.team) || teamFromName(parsedName.rest, rawName);
  // With a club in its metadata, the product is described by its metadata alone.
  const described = Boolean(text(attributes.club) || text(attributes.team));
  const name = described ? { age: "", kids: false, season: "", rest: "" } : parsedName;

  // The shop's own version field, unless it really holds something else.
  const explicit = parsePhrase(text(attributes.version) || text(attributes.kit) || text(product.side) || text(attributes.side));
  const statedLine = normalize(explicit.rest);
  const explicitLabel = statedLine === "pro" || statedLine === "collector" || isSpecialWord(explicit.rest) ? "" : explicit.rest;

  let kit: Kit | null = readKit(explicitLabel);
  let kitLabel = explicitLabel;
  if (kit && Object.hasOwn(KIT_WORDS, normalize(explicitLabel))) kitLabel = kit;
  if (isSpecialWord(explicit.rest)) {
    kit = null;
  } else if (!explicitLabel && !described) {
    // A number at the end of a SKU is a duplicate counter, not a third kit, so
    // the SKU only speaks for home and away (and SSS truncates it, so it comes last).
    const skuKit = readKit(sku);
    kit = readKit(tags.join(" ")) ?? readKit(name.rest) ?? (skuKit === "Troisième" ? null : skuKit);
    kitLabel = kit ?? "";
  }
  const edition = text(attributes.edition);
  if (!kit && !kitLabel) kitLabel = edition;

  const age = text(attributes.age) || explicit.age || name.age;
  const audience = formatAudience(age, explicit.kids || name.kids);
  const stated = attributes.collector === true || text(attributes.collector).toLowerCase() === "true";
  const collector = stated || statedLine === "collector" || tags.includes("collector") || (!described && /collector/i.test(`${rawName} ${sku}`));

  return {
    team,
    kit,
    kitLabel,
    versionLabel: kit === "Troisième" ? "3ème" : kit ?? (explicitLabel || (explicit.rest ? "Spécial" : "")),
    edition,
    season: text(attributes.saison) || text(attributes.season) || name.season,
    age,
    audience,
    version: collector ? "Collector" : audience ? null : "Pro",
    competition: text(attributes.competition) || text(attributes.league) || (described ? "" : tags.find((tag) => !["collector", "pro"].includes(tag)) || "")
  };
}

const joinWords = (...words: Array<string | null | false>) => words.filter(Boolean).join(" ");

/** The version and the edition as they read in a title. A special edition's label already is its edition. */
export function jerseyDetails(facts: Pick<JerseyFacts, "kitLabel" | "edition">) {
  return joinWords(facts.kitLabel, facts.edition !== facts.kitLabel && facts.edition);
}

/** The full title: "Maillot Chelsea Extérieur 2024/25", "Maillot Cameroun enfant 3-10 ans". */
export function jerseyTitle(facts: JerseyFacts) {
  return joinWords("Maillot", facts.team, facts.version === "Collector" && "Collector", jerseyDetails(facts), facts.season, facts.audience);
}

/** The line under the team on a card: "Maillot Pro Extérieur 2024/25". */
export function jerseyLine(facts: JerseyFacts) {
  return joinWords("Maillot", facts.version, jerseyDetails(facts), facts.season, facts.audience);
}

/** The slug of a product that has none frozen yet (see data/jersey-slugs.json). */
export function jerseySlug(facts: JerseyFacts) {
  return slugify(joinWords(facts.team, jerseyDetails(facts), facts.season, facts.audience));
}

/** The fields of the SSS product form, under the same names, for the order section and its message. */
export function jerseyFields(facts: JerseyFacts): Array<{ label: string; value: string }> {
  return [
    { label: "Club", value: facts.team },
    { label: "Version", value: facts.versionLabel },
    { label: "Saison", value: facts.season },
    { label: "Âge", value: facts.age },
    { label: "Édition", value: facts.edition || (facts.version === "Collector" ? "Collector" : "") }
  ].filter((field) => field.value);
}
