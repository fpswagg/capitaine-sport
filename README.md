# Capitaine Sport

Site Next.js français pour présenter et vendre des maillots, avec catalogue, commandes et paramètres de boutique synchronisés avec **SSS**.

## Fonctionnalités

- **Boutique publique** : catalogue de maillots issu de SSS, pages produit, contact et assistant client SSS.
- **Dashboard `/dashboard`** : connexion OAuth « Sign in with SSS », aperçu des ventes et demandes, catalogue et stock, enregistrement des ventes, gestion des demandes et modification des coordonnées/textes de la boutique.
- **Données et droits** : produits, ventes, demandes et boutique viennent de SSS. Le dashboard utilise le jeton OAuth de la personne connectée, lié à son accès et à son rôle dans la boutique. La clé `SSS_API_KEY` n'est utilisée que côté serveur pour le site public et le formulaire de contact.
- **Statistiques** : visites des pages produit et clics WhatsApp enregistrés dans les métadonnées SSS, par jour à l'heure de Douala.

## Configuration

Copie `.env.example` vers `.env.local`, puis renseigne les variables :

- `SSS_API_URL`, `SSS_STORE_ID`, `SSS_API_KEY` : API et boutique SSS pour le site public.
- `NEXT_PUBLIC_SSS_API_URL`, `NEXT_PUBLIC_SSS_BOT_KEY` : assistant client; la clé `cb_…` est publique par conception.
- `SITE_URL` : URL canonique du site (en production : `https://capitaine-sport.vercel.app`).
- `SSS_OAUTH_CLIENT_ID`, `SSS_OAUTH_CLIENT_SECRET`, `SSS_OAUTH_SCOPE` : application OAuth SSS, autorisée sur `https://capitaine-sport.vercel.app/auth/sss/callback`; le scope doit inclure `business` pour les modifications. Le secret peut rester vide pour un client OAuth public si l'application SSS est configurée ainsi.
- `SESSION_SECRET` : secret aléatoire d'au moins 32 caractères pour chiffrer la session HttpOnly. Ne le commite jamais et ne le change pas sans invalider les sessions existantes.
- `SSS_APP_URL` (facultatif) : lien vers l'application SSS.
- `REVALIDATE_SECRET` (facultatif) : secret pour l'invalidation du cache depuis SSS.

L'application OAuth doit être limitée à la boutique Capitaine Sport dans SSS. N'utilise pas de clé business dans le navigateur.

## Domicile / Extérieur / Spéciaux

Tout ce qui décrit un maillot vit dans `metadata` du produit SSS (`lib/jersey-facts.ts`) : `club`, `version`, `saison`, `age`, `edition`, `competition`, `collector`. Tous ces champs se modifient depuis le dashboard du site.

Dès que `metadata.club` existe, le nom, les tags et le SKU ne décrivent plus le maillot : un champ vidé reste vide. Sans `club`, le site lit encore le nom, les tags et le SKU. Les anciennes clés `team`, `kit` et `season` restent lues, et disparaissent au premier enregistrement depuis le dashboard.

Le bloc de commande de la fiche et le message WhatsApp reprennent les libellés du formulaire SSS : Club, Version, Saison, Âge, Édition.

Version `Domicile` → section Domicile ; `Extérieur` et `3ème` → section Extérieur ; `Spécial`, une autre version ou aucune version → section Spéciaux. Le mot « Spécial » n'apparaît jamais dans le titre : le titre garde `metadata.edition` (« Maillot PSG Dior »). Un `age` donne un maillot enfant, jamais présenté comme « Pro ».

Les adresses des maillots existants sont figées par id dans `data/jersey-slugs.json` : renommer un produit ne les casse pas. Un nouveau produit reçoit une adresse calculée.

## Scripts

```bash
npm run dev
npm run typecheck
npm test
npm run build
```

`data/jerseys.json` et `public/jerseys/` ne sont plus lus par le site ; ils restent comme source pour importer l'ancien catalogue dans SSS.
