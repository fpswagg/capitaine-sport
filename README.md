# Capitaine Sport

Site Next.js en français pour présenter et vendre des maillots pro à 10 000 FCFA.

## Contenu

- `data/site.json` contient les informations de marque, le contact WhatsApp et le texte du hero.
- `data/jerseys.json` contient les maillots, prix, images locales, catégories et descriptions.
- Chaque bouton de commande redirige vers WhatsApp avec un message prérempli.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
```

## Ajouter un maillot

Ajoute l'image dans `public/jerseys`, puis ajoute une entrée dans `data/jerseys.json` avec un `slug` unique, `price: 10000`, une catégorie `Domicile` ou `Extérieur`, une `version` (`Pro` ou `Collector`) et le chemin local dans `imageUrl`.

Convention de nommage utilisée:

- `-int` => `Domicile`
- `-ext` => `Extérieur`
- `-collector` => version `Collector`
- absence de `-int` / `-ext` => classé en `Domicile` par défaut
