import assert from "node:assert/strict";
import { test } from "node:test";

import { jerseyFacts, jerseyLine, jerseySlug, jerseyTitle, readKit } from "../lib/jersey-facts.ts";

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
