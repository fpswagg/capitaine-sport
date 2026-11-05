import assert from "node:assert/strict";
import { test } from "node:test";

import { jerseyFacts, jerseyFields, jerseyLine, jerseySlug, jerseyTitle, readKit } from "../lib/jersey-facts.ts";

const read = (name, metadata = {}, extra = {}) => jerseyFacts({ name, metadata, ...extra });

test("the SSS form fields win over the product name", () => {
  const facts = read("Maillot Réal Madrid Extérieur 2024/25", { club: "Real Madrid", version: "Extérieur", saison: "2024/25" });
  assert.equal(facts.team, "Real Madrid");
  assert.equal(facts.kit, "Extérieur");
  assert.equal(jerseyTitle(facts), "Maillot Real Madrid Extérieur 2024/25");
  assert.equal(jerseyLine(facts), "Maillot Pro Extérieur 2024/25");
});

test("3ème from the form is a third kit", () => {
  const facts = read("Maillot Real Madrid 3", { club: "Real Madrid", version: "3ème", saison: "2024/25" });
  assert.equal(facts.kit, "Troisième");
  assert.equal(facts.kitLabel, "Troisième");
});

test("an age range is not a third kit, and a children's jersey is not forced into a kit", () => {
  const facts = read("Fourteen enfant disponible 3-10 ans", { club: "Cameroun", age: "3-10 ans" });
  assert.equal(facts.kit, null);
  assert.equal(facts.kitLabel, "");
  assert.equal(facts.version, null);
  assert.equal(jerseyTitle(facts), "Maillot Cameroun enfant 3-10 ans");
  assert.equal(jerseyLine(facts), "Maillot enfant 3-10 ans");
  assert.equal(jerseySlug(facts), "cameroun-enfant-3-10-ans");
});

test("the same name without any metadata reads cleanly", () => {
  const facts = read("Fourteen enfant disponible 3-10 ans");
  assert.equal(facts.team, "Fourteen");
  assert.equal(facts.kit, null);
  assert.equal(facts.season, "");
  assert.equal(jerseyTitle(facts), "Maillot Fourteen enfant 3-10 ans");
});

test("an unknown version keeps its own label", () => {
  const facts = read("Maillot PSG Dior", { club: "PSG", version: "Dior", saison: "2024/25" });
  assert.equal(facts.kit, null);
  assert.equal(jerseyTitle(facts), "Maillot PSG Dior 2024/25");
  const keeper = read("Maillot PSG Gardien 2024/25", { club: "PSG", version: "Gardien", saison: "2024/25" });
  assert.equal(jerseyLine(keeper), "Maillot Pro Gardien 2024/25");
});

test("Spécial is the section, never a word of the title", () => {
  const dior = read("Maillot PSG Dior", { club: "PSG", version: "Spécial", saison: "2024/25", edition: "Dior" });
  assert.equal(dior.kit, null);
  assert.equal(dior.kitLabel, "Dior");
  assert.equal(jerseyTitle(dior), "Maillot PSG Dior 2024/25");
  assert.equal(jerseySlug(dior), "psg-dior-2024-25");

  const kids = read("Fourteen enfant disponible 3-10 ans", { club: "Cameroun", version: "Spécial", age: "3-10 ans" });
  assert.equal(kids.kit, null);
  assert.equal(jerseyTitle(kids), "Maillot Cameroun enfant 3-10 ans");
  assert.equal(jerseyLine(kids), "Maillot enfant 3-10 ans");

  // The SSS form builds its name from the version, so the word can be in the name too.
  const formName = read("Maillot PSG Spécial 2024/25", { club: "PSG", version: "Spécial", saison: "2024/25" });
  assert.equal(jerseyTitle(formName), "Maillot PSG 2024/25");
  assert.equal(jerseyTitle(read("Maillot PSG Spéciale")), "Maillot PSG");
});

test("an edition field wins over the name, and Spécial wins over a kit in the name", () => {
  const facts = read("Maillot PSG Domicile", { club: "PSG", version: "Spécial", edition: "Dior" });
  assert.equal(facts.kit, null);
  assert.equal(jerseyTitle(facts), "Maillot PSG Dior");
  assert.equal(jerseyTitle(read("Maillot PSG Domicile", { club: "PSG", version: "Spécial" })), "Maillot PSG");
});

test("the dashboard's saved values read back, accents or not", () => {
  for (const version of ["3ème", "3eme", "Troisième", "troisieme", "3"]) {
    assert.equal(read("Maillot Arsenal", { club: "Arsenal", version }).kitLabel, "Troisième");
  }
  for (const version of ["Spécial", "special", "Spéciale", "Spéciaux", "Édition spéciale"]) {
    assert.equal(read("Maillot Arsenal", { club: "Arsenal", version }).kit, null, version);
  }
  assert.equal(read("Maillot PSG", { team: "PSG", kit: "special" }).kit, null);
  assert.equal(readKit("Spécial"), null);
});

test("with a club in metadata, the name no longer describes the jersey", () => {
  const facts = read("Maillot PSG Dior Extérieur Collector 2024/25 enfant 3-10 ans", { club: "PSG", version: "Spécial" });
  assert.equal(facts.kitLabel, "");
  assert.equal(facts.season, "");
  assert.equal(facts.audience, "");
  assert.equal(facts.version, "Pro");
  assert.equal(jerseyTitle(facts), "Maillot PSG");
  assert.equal(read("Maillot PSG Domicile", { club: "PSG" }).kit, null);
  assert.equal(jerseyFacts({ name: "Maillot PSG", sku: "PSG-COLLECTOR", metadata: { club: "PSG" } }).version, "Pro");
  assert.equal(jerseyFacts({ name: "Maillot PSG", tags: ["ligue 1"], metadata: { club: "PSG" } }).competition, "");
});

test("an edition goes after a known version, and collector lives in metadata", () => {
  const facts = read("Maillot PSG", { club: "PSG", version: "Domicile", saison: "2024/25", edition: "Ligue des Champions" });
  assert.equal(facts.kit, "Domicile");
  assert.equal(jerseyTitle(facts), "Maillot PSG Domicile Ligue des Champions 2024/25");
  assert.equal(jerseySlug(facts), "psg-domicile-ligue-des-champions-2024-25");
  assert.equal(read("Maillot PSG", { club: "PSG", version: "Domicile", collector: true }).version, "Collector");
  assert.equal(jerseyTitle(read("Maillot PSG", { club: "PSG", version: "Gardien", edition: "Dior" })), "Maillot PSG Gardien Dior");
});

test("the order fields speak the words of the SSS product form", () => {
  const fields = (metadata) => Object.fromEntries(jerseyFields(read("Maillot", metadata)).map((f) => [f.label, f.value]));
  assert.deepEqual(fields({ club: "Arsenal", version: "3ème", saison: "2024/25" }), { Club: "Arsenal", Version: "3ème", Saison: "2024/25" });
  assert.deepEqual(fields({ club: "PSG", version: "Spécial", saison: "2024/25", edition: "Dior" }), { Club: "PSG", Version: "Spécial", Saison: "2024/25", Édition: "Dior" });
  assert.deepEqual(fields({ club: "Cameroun", version: "Spécial", age: "3-10 ans" }), { Club: "Cameroun", Version: "Spécial", Âge: "3-10 ans" });
  assert.deepEqual(fields({ club: "PSG" }), { Club: "PSG" });
});

test("no version stays unknown instead of Domicile", () => {
  assert.equal(read("Maillot Marseille").kit, null);
  assert.equal(read("Maillot Marseille").team, "Marseille");
});

test("the dashboard's older keys still work", () => {
  const facts = read("Maillot X", { team: "Chelsea", kit: "exterieur", season: "2023/24" });
  assert.equal(facts.team, "Chelsea");
  assert.equal(facts.kit, "Extérieur");
  assert.equal(facts.season, "2023/24");
});

test("names without metadata: kit, team and season", () => {
  assert.equal(read("Maillot Manchester United 3").kit, "Troisième");
  assert.equal(read("Maillot Manchester United 3").team, "Manchester United");
  const city = read("Maillot Manchester City 3ème 2024/25");
  assert.deepEqual([city.team, city.kit, city.season], ["Manchester City", "Troisième", "2024/25"]);
  assert.equal(read("Maillot Arsenal Extérieur 24-25").season, "24-25");
});

test("an age range is never read as a season", () => {
  const facts = read("Maillot PSG enfant 10-14 ans");
  assert.equal(facts.season, "");
  assert.equal(facts.audience, "enfant 10-14 ans");
  assert.equal(facts.kit, null);
  assert.equal(read("Maillot PSG 10-11 ans").season, "");
  assert.equal(read("Maillot PSG 3-10").kit, null);
});

test("adult is the default audience, and stays out of the title", () => {
  const facts = read("Maillot PSG", { club: "PSG", version: "Domicile", age: "Adulte" });
  assert.equal(facts.audience, "");
  assert.equal(facts.version, "Pro");
  assert.equal(read("Maillot PSG", { club: "PSG", age: "Enfant" }).audience, "enfant");
});

test("a SKU counter is not a third kit, but the SKU can say home or away", () => {
  assert.equal(jerseyFacts({ name: "Maillot Chelsea", sku: "CHE-3" }).kit, null);
  assert.equal(jerseyFacts({ name: "Maillot Chelsea", sku: "CHE-EXT-2425" }).kit, "Extérieur");
});

test("collector is a line, not a version", () => {
  const facts = read("Maillot PSG", { club: "PSG", version: "Collector" });
  assert.equal(facts.version, "Collector");
  assert.equal(facts.kit, null);
  assert.equal(read("Maillot PSG Domicile", {}, { tags: ["collector"] }).version, "Collector");
});

test("readKit ignores words that only look like object keys", () => {
  assert.equal(readKit("constructor"), null);
  assert.equal(readKit("toString"), null);
});
