// Reads what a jersey is from one SSS product. Pure on purpose (no server or
// framework import) so it is shared by the catalog and the dashboard, and tested
// directly by tests/jersey-facts.test.mjs.
//
// Reading order: the fields of the SSS product form (metadata.club, version,
// saison, age), then the keys this site's dashboard used to write (team, kit,
// season), then the product name. Nothing is guessed when nothing is said: the
// version "Spécial", any other version ("Gardien") or no version at all stays
// out of Domicile / Extérieur.

export type SssProduct = Record<string, unknown>;

export type Kit = "Domicile" | "Extérieur" | "Troisième";

export type JerseyFacts = {
  team: string;
  /** Known kit, or null for a special edition or an unknown version. */
  kit: Kit | null;
  /** What the title says about the version: "Domicile", "Troisième", "Dior", or "" (never "Spécial"). */
  kitLabel: string;
  season: string;
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

// "Maillot PSG Dior" with club PSG -> "Dior". Only when the name is about that
// team: "Fourteen enfant" for Cameroun says nothing we can put after the team.
function editionFromName(rest: string, team: string) {
  const words = teamFromName(rest, "").split(" ").filter(Boolean);
  const teamWords = normalize(team).split(/\s+/);
  const start = words.findIndex((_, index) => teamWords.every((word, offset) => normalize(words[index + offset] ?? "") === word));
  if (start === -1) return "";
  return words.filter((_, index) => index < start || index >= start + teamWords.length).join(" ");
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
  const name = parsePhrase(rawName);

  // The shop's own version field, unless it really holds something else.
  const explicit = parsePhrase(text(attributes.version) || text(attributes.kit) || text(product.side) || text(attributes.side));
  const statedLine = normalize(explicit.rest);
  const explicitLabel = statedLine === "pro" || statedLine === "collector" || isSpecialWord(explicit.rest) ? "" : explicit.rest;
  const team = text(attributes.club) || text(attributes.team) || teamFromName(name.rest, rawName);

  let kit: Kit | null = readKit(explicitLabel);
  let kitLabel = explicitLabel;
  if (kit && Object.hasOwn(KIT_WORDS, normalize(explicitLabel))) kitLabel = kit;
  if (isSpecialWord(explicit.rest)) {
    kit = null;
  } else if (!explicitLabel) {
    // A number at the end of a SKU is a duplicate counter, not a third kit, so
    // the SKU only speaks for home and away (and SSS truncates it, so it comes last).
    const skuKit = readKit(sku);
    kit = readKit(tags.join(" ")) ?? readKit(name.rest) ?? (skuKit === "Troisième" ? null : skuKit);
    kitLabel = kit ?? "";
  }
  if (!kit && !kitLabel) kitLabel = text(attributes.edition) || editionFromName(name.rest, team);

  const audience = formatAudience(text(attributes.age) || explicit.age || name.age, explicit.kids || name.kids);
  const collector = statedLine === "collector" || tags.includes("collector") || /collector/i.test(`${rawName} ${sku}`);

  return {
    team,
    kit,
    kitLabel,
    season: text(attributes.saison) || text(attributes.season) || name.season,
    audience,
    version: collector ? "Collector" : audience ? null : "Pro",
    competition: text(attributes.competition) || text(attributes.league) || tags.find((tag) => !["collector", "pro"].includes(tag)) || ""
  };
}

const joinWords = (...words: Array<string | null | false>) => words.filter(Boolean).join(" ");

/** The full title: "Maillot Chelsea Extérieur 2024/25", "Maillot Cameroun enfant 3-10 ans". */
export function jerseyTitle(facts: JerseyFacts) {
  return joinWords("Maillot", facts.team, facts.version === "Collector" && "Collector", facts.kitLabel, facts.season, facts.audience);
}

/** The line under the team on a card: "Maillot Pro Extérieur 2024/25". */
export function jerseyLine(facts: JerseyFacts) {
  return joinWords("Maillot", facts.version, facts.kitLabel, facts.season, facts.audience);
}

/** The slug of a product that has none frozen yet (see data/jersey-slugs.json). */
export function jerseySlug(facts: JerseyFacts) {
  return slugify(joinWords(facts.team, facts.kitLabel, facts.season, facts.audience));
}
