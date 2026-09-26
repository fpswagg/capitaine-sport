# Capitaine Sport — branche `main-sss`

Site Next.js en français pour présenter et vendre des maillots, branché sur le service **SSS**.

## Ce qui vient de SSS

- **Catalogue** : les maillots sont lus via `GET /stores/:storeId/products` (clé business `sss_…`, côté serveur uniquement). Les pages sont régénérées toutes les 60 s.
- **Assistant « Le Capitaine »** : bulle de chat connectée au bot client de la boutique (`/api/v1/bot/:key`, clé publique `cb_…`). Nom, photo, message d'accueil et questions suggérées se règlent dans le dashboard SSS (`/app/client-bot`).
- **Contact** : le formulaire `/contact` crée un enregistrement `feedback` (`POST /stores/:storeId/sasto/feedback`).

Copie `.env.example` vers `.env.local` et remplis les valeurs.

## Domicile / Extérieur

SSS n'a pas de champ dédié. Le site détermine la catégorie dans cet ordre :

1. attribut du produit `side` / `kit` (ex. `exterieur`)
2. **tags** : `domicile`, `home`, `int` → Domicile ; `exterieur`, `away`, `ext`, `third` → Extérieur
3. nom de la catégorie SSS
4. suffixe du SKU (`arsenal-ext`, `psg-int`) — même convention qu'avant
5. le nom du produit (« Maillot Extérieur … »)

Sans indice, le maillot est classé **Domicile**. Le plus simple : mettre le tag `exterieur` ou un SKU en `-ext`. Le tag `collector` donne la version Collector ; `attributes.team` et `attributes.competition` sont utilisés s'ils existent.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
```

`data/jerseys.json` et `public/jerseys/` ne sont plus lus par le site ; ils restent comme source pour importer l'ancien catalogue dans SSS.
