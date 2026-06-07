# Capitaine Sport — Design System
> *plus qu'un maillot, une attitude*

A complete styling reference for the Capitaine Sport jersey review website. Every decision is rooted in the brand's energy: bold, street-credible, football-obsessed.

---

## 1. Brand Identity

| Property | Value |
|---|---|
| Brand Name | Capitaine Sport |
| Tagline | *plus qu'un maillot, une attitude* |
| Founder | Bryan Fongang |
| Contact | +237 696 57 64 77 |
| Category | Sports jerseys — review & retail |

**Brand personality:** Authoritative but accessible. Like that friend who knows every jersey ever made and will confidently tell you which ones are worth buying. Energetic, opinionated, proud of the culture.

---

## 2. Color System

### Primary Palette

```css
:root {
  /* Brand Orange — the heart of Capitaine Sport */
  --cs-orange-50:  #FFF4EB;
  --cs-orange-100: #FFD9B0;
  --cs-orange-200: #FFBA70;
  --cs-orange-400: #F97316;   /* PRIMARY — main CTAs, highlights */
  --cs-orange-600: #C45A08;   /* hover states, dark accents */
  --cs-orange-800: #7C3300;   /* text on orange tints */
  --cs-orange-900: #3D1900;

  /* Neutrals */
  --cs-black:      #0F0F0F;   /* headings, body text */
  --cs-gray-900:   #1A1A1A;
  --cs-gray-700:   #3D3D3D;
  --cs-gray-500:   #717171;
  --cs-gray-300:   #B8B8B8;
  --cs-gray-100:   #F0EFEB;   /* surface backgrounds */
  --cs-gray-50:    #FAFAF8;   /* page background */
  --cs-white:      #FFFFFF;

  /* Semantic */
  --cs-rating-gold:    #F5A623;   /* star ratings */
  --cs-badge-new:      #16A34A;   /* "New" badge */
  --cs-badge-sale:     #DC2626;   /* "Sale" / "Hot" badge */
  --cs-badge-official: #1D4ED8;   /* "Official" badge */
}
```

### Dark Mode Override

```css
@media (prefers-color-scheme: dark) {
  :root {
    --cs-black:    #F5F5F0;
    --cs-gray-900: #ECECEC;
    --cs-gray-700: #B0B0B0;
    --cs-gray-500: #787878;
    --cs-gray-300: #3A3A3A;
    --cs-gray-100: #1E1E1E;
    --cs-gray-50:  #141414;
    --cs-white:    #0F0F0F;
    /* Orange stays the same — it pops on dark */
  }
}
```

### Color Usage Rules

- **Orange** is the only accent color. Never split attention with teal, purple, etc.
- **Text on orange** must use `--cs-orange-900` (never black) for accessibility.
- **Backgrounds** are almost always white or `--cs-gray-50`. Reserve `--cs-gray-100` for cards.
- **Rating stars** always use `--cs-rating-gold` — it reads warm and premium.
- Limit each page section to **one badge color**. Don't stack red + green + blue badges on the same card.

---

## 3. Typography

### Font Stack

```css
/* Display — headings, hero text, section titles */
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

/* Body — readable, warm, modern sans */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');

/* Accent / Script — taglines, pull quotes, brand moments */
@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');

:root {
  --font-display: 'Bebas Neue', 'Impact', sans-serif;
  --font-body:    'DM Sans', 'Helvetica Neue', sans-serif;
  --font-script:  'Dancing Script', cursive;
}
```

**Why these fonts:**
- **Bebas Neue** matches the condensed, punchy display style seen in both flyers — "LA COUPE DU MONDE", "CAPITAINE SPORT" lettering
- **DM Sans** is warm and readable — great for review content, jersey descriptions
- **Dancing Script** echoes the handwritten italic style used in the flyers (*"Incarne la"*, *"Sport"* script)

### Type Scale

```css
:root {
  /* Display — hero headlines, section punches */
  --text-hero:    clamp(3rem, 8vw, 7rem);    /* Bebas Neue, uppercase */
  --text-display: clamp(2rem, 5vw, 3.5rem);  /* Bebas Neue */
  --text-heading: clamp(1.4rem, 3vw, 2rem);  /* Bebas Neue or DM Sans 700 */

  /* Body */
  --text-xl:   1.25rem;   /* lead paragraphs */
  --text-base: 1rem;      /* body copy */
  --text-sm:   0.875rem;  /* captions, metadata */
  --text-xs:   0.75rem;   /* labels, badges */

  /* Line heights */
  --leading-tight:  1.1;   /* display text */
  --leading-normal: 1.6;   /* body text */
  --leading-loose:  1.8;   /* long-form review content */
}
```

### Usage Examples

```css
/* Hero headline */
.hero-title {
  font-family: var(--font-display);
  font-size: var(--text-hero);
  line-height: var(--leading-tight);
  text-transform: uppercase;
  color: var(--cs-white);
  letter-spacing: 0.02em;
}

/* Section heading */
.section-title {
  font-family: var(--font-display);
  font-size: var(--text-display);
  text-transform: uppercase;
  color: var(--cs-black);
}

/* Brand tagline — script accent */
.tagline {
  font-family: var(--font-script);
  font-size: 1.5rem;
  color: var(--cs-orange-400);
}

/* Review body text */
.review-body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-loose);
  color: var(--cs-gray-700);
}

/* Jersey name / card title */
.jersey-name {
  font-family: var(--font-body);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--cs-black);
}
```

---

## 4. Spacing & Layout

### Base Grid

```css
:root {
  --space-1:  0.25rem;   /*  4px */
  --space-2:  0.5rem;    /*  8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-24: 6rem;      /* 96px */

  --container-max: 1240px;
  --container-pad: clamp(1rem, 4vw, 3rem);

  --grid-cols: 12;
  --grid-gap:  var(--space-6);
}

.container {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
}
```

### Jersey Card Grid

```css
.jersey-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-6);
}
```

### Section Rhythm

Sections alternate between **tight** (hero, CTA strips) and **open** (review content, grids). Use `padding-block: var(--space-16)` as the default section padding, `var(--space-24)` for hero sections.

---

## 5. Component Patterns

### 5.1 Jersey Card

The core repeating unit of the website.

```html
<article class="jersey-card">
  <div class="jersey-card__image-wrap">
    <img src="..." alt="Brazil 2026 Home Jersey" class="jersey-card__image" />
    <span class="badge badge--new">New 2026</span>
    <span class="badge badge--official">Official</span>
  </div>
  <div class="jersey-card__body">
    <p class="jersey-card__team">Brazil</p>
    <h3 class="jersey-card__name">2026 World Cup Home</h3>
    <div class="jersey-card__rating">
      ★★★★☆ <span class="jersey-card__score">4.2</span>
    </div>
    <p class="jersey-card__price">25 000 XAF</p>
    <a href="/jerseys/brazil-2026" class="btn btn--primary">Voir l'avis →</a>
  </div>
</article>
```

```css
.jersey-card {
  background: var(--cs-white);
  border: 1px solid var(--cs-gray-100);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.jersey-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(249, 115, 22, 0.12);
}

.jersey-card__image-wrap {
  position: relative;
  aspect-ratio: 4 / 5;
  background: var(--cs-gray-50);
  overflow: hidden;
}

.jersey-card__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: var(--space-4);
  transition: transform 0.3s ease;
}

.jersey-card:hover .jersey-card__image {
  transform: scale(1.05);
}

.jersey-card__body {
  padding: var(--space-4) var(--space-6);
}

.jersey-card__team {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--cs-orange-400);
  font-weight: 700;
  margin-bottom: var(--space-1);
}

.jersey-card__name {
  font-family: var(--font-display);
  font-size: 1.3rem;
  text-transform: uppercase;
  color: var(--cs-black);
  margin-bottom: var(--space-2);
}

.jersey-card__rating {
  color: var(--cs-rating-gold);
  font-size: var(--text-sm);
  margin-bottom: var(--space-2);
}

.jersey-card__score {
  color: var(--cs-gray-500);
  margin-left: var(--space-1);
}

.jersey-card__price {
  font-weight: 700;
  font-size: var(--text-xl);
  color: var(--cs-orange-600);
  margin-bottom: var(--space-4);
}
```

---

### 5.2 Badges

```css
.badge {
  display: inline-block;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 4px;
  position: absolute;
  top: var(--space-3);
}

.badge--new {
  background: var(--cs-badge-new);
  color: #fff;
  left: var(--space-3);
}

.badge--official {
  background: var(--cs-badge-official);
  color: #fff;
  right: var(--space-3);
}

.badge--sale {
  background: var(--cs-badge-sale);
  color: #fff;
}

/* Starburst / "Nouvelle Collection" style (from flyer) */
.badge--burst {
  background: var(--cs-orange-400);
  color: var(--cs-orange-900);
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%,
                     79% 91%, 50% 70%, 21% 91%, 32% 57%,
                     2% 35%, 39% 35%);
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.65rem;
  line-height: 1.2;
  font-weight: 700;
}
```

---

### 5.3 Buttons

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 12px 24px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
}

/* Primary — orange fill */
.btn--primary {
  background: var(--cs-orange-400);
  color: var(--cs-orange-900);
  border-color: var(--cs-orange-400);
}

.btn--primary:hover {
  background: var(--cs-orange-600);
  border-color: var(--cs-orange-600);
}

/* Secondary — outline */
.btn--secondary {
  background: transparent;
  color: var(--cs-orange-400);
  border-color: var(--cs-orange-400);
}

.btn--secondary:hover {
  background: var(--cs-orange-50);
}

/* Ghost — for dark backgrounds */
.btn--ghost {
  background: transparent;
  color: var(--cs-white);
  border-color: var(--cs-white);
}

.btn--ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Large CTA */
.btn--lg {
  padding: 16px 36px;
  font-size: var(--text-base);
  border-radius: 8px;
}
```

---

### 5.4 Rating Stars

```css
.star-rating {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.star {
  width: 20px;
  height: 20px;
  color: var(--cs-gray-300);
}

.star--filled {
  color: var(--cs-rating-gold);
}

.star--half {
  /* Use two-tone via SVG linearGradient */
  color: var(--cs-rating-gold);
}

/* Score display */
.rating-score {
  font-family: var(--font-display);
  font-size: 1.8rem;
  color: var(--cs-black);
  line-height: 1;
}

.rating-count {
  font-size: var(--text-xs);
  color: var(--cs-gray-500);
}
```

---

### 5.5 Review Score Breakdown

Used in jersey detail pages.

```css
.score-bar {
  display: grid;
  grid-template-columns: 80px 1fr 40px;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.score-bar__label {
  font-size: var(--text-sm);
  color: var(--cs-gray-700);
}

.score-bar__track {
  height: 6px;
  background: var(--cs-gray-100);
  border-radius: 3px;
  overflow: hidden;
}

.score-bar__fill {
  height: 100%;
  background: var(--cs-orange-400);
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.score-bar__value {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--cs-orange-600);
}
```

---

### 5.6 Orange Diagonal Banner

The signature design element from the flyers — the slanted orange band.

```css
.orange-band {
  position: relative;
  background: var(--cs-orange-400);
  padding: var(--space-6) var(--container-pad);
  overflow: hidden;
}

/* Diagonal clip on both ends */
.orange-band--diagonal {
  clip-path: polygon(0 15%, 100% 0, 100% 85%, 0 100%);
  padding-block: var(--space-16);
}

.orange-band__text {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 6vw, 5rem);
  text-transform: uppercase;
  color: var(--cs-orange-900);
  letter-spacing: 0.04em;
}

/* Running marquee text (like the CAPITAINE SPORT band in flyer-01) */
.marquee-band {
  background: var(--cs-orange-400);
  padding: var(--space-4) 0;
  overflow: hidden;
  white-space: nowrap;
}

.marquee-band__inner {
  display: inline-block;
  animation: marquee 18s linear infinite;
}

@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

.marquee-band__item {
  font-family: var(--font-display);
  font-size: 2.5rem;
  text-transform: uppercase;
  color: var(--cs-orange-900);
  margin-right: var(--space-12);
}

/* Every other item slightly lighter */
.marquee-band__item:nth-child(even) {
  color: var(--cs-orange-800);
  opacity: 0.4;
}
```

---

### 5.7 Navigation

```css
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--container-pad);
  background: var(--cs-white);
  border-bottom: 1px solid var(--cs-gray-100);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav__logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  text-decoration: none;
}

.nav__logo-mark {
  /* The "CS" monogram icon */
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.nav__brand {
  font-family: var(--font-display);
  font-size: 1.5rem;
  text-transform: uppercase;
  color: var(--cs-orange-400);
  letter-spacing: 0.04em;
}

.nav__links {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  list-style: none;
}

.nav__link {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--cs-gray-700);
  text-decoration: none;
  transition: color 0.15s;
}

.nav__link:hover,
.nav__link--active {
  color: var(--cs-orange-400);
}

/* Active indicator */
.nav__link--active {
  border-bottom: 2px solid var(--cs-orange-400);
  padding-bottom: 2px;
}

.nav__cta {
  background: var(--cs-orange-400);
  color: var(--cs-orange-900);
  font-weight: 700;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 10px 20px;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.15s;
}

.nav__cta:hover {
  background: var(--cs-orange-600);
}
```

---

### 5.8 Hero Section

```css
.hero {
  position: relative;
  min-height: 85vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: var(--space-12);
  padding: var(--space-16) var(--container-pad);
  background: var(--cs-black);
  overflow: hidden;
}

/* Large ghosted "CS" watermark in the background */
.hero::before {
  content: 'CS';
  font-family: var(--font-display);
  font-size: 40vw;
  color: rgba(249, 115, 22, 0.05);
  position: absolute;
  right: -5%;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  line-height: 1;
}

.hero__eyebrow {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cs-orange-400);
  margin-bottom: var(--space-4);
}

.hero__title {
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 7vw, 6.5rem);
  text-transform: uppercase;
  color: var(--cs-white);
  line-height: 1.0;
  margin-bottom: var(--space-6);
}

.hero__title span {
  color: var(--cs-orange-400);
}

.hero__tagline {
  font-family: var(--font-script);
  font-size: 1.8rem;
  color: var(--cs-orange-200);
  margin-bottom: var(--space-8);
}

.hero__actions {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}
```

---

## 6. Iconography & Imagery

### Icon Usage

Use **outline** icons throughout — consistent with the sport equipment illustration style in the logo.

Recommended icon set: **Tabler Icons** (available via CDN)

```html
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />

<!-- Usage examples -->
<i class="ti ti-shirt" aria-hidden="true"></i>       <!-- jersey -->
<i class="ti ti-shoe" aria-hidden="true"></i>        <!-- boots -->
<i class="ti ti-star" aria-hidden="true"></i>        <!-- rating -->
<i class="ti ti-trophy" aria-hidden="true"></i>      <!-- competition -->
<i class="ti ti-world" aria-hidden="true"></i>       <!-- world cup -->
<i class="ti ti-phone" aria-hidden="true"></i>       <!-- contact -->
```

### Jersey Photography Guidelines

- **Background:** White or `--cs-gray-50` — clean product shots
- **Orientation:** Front-facing, slightly angled (like flyer-01 jersey grid)
- **Aspect ratio:** 4:5 portrait in cards, 1:1 in grids
- **Treatment:** No heavy filters; allow natural fabric colors to dominate
- **Context shots:** Fans-in-stands or stadium atmosphere as background overlay (like flyer-01's crowd top section)

### Brand Photography

- **Black & white subjects** with color pop works well (see flyer-01 person)
- **Stadium/crowd** backgrounds add energy to hero sections
- **Team badge overlaps** (Real Madrid, Barcelona, BVB logos) as decorative background texture (flyer-02 style)

---

## 7. Motion & Animation

```css
/* Base transitions */
:root {
  --transition-fast:   0.12s ease;
  --transition-base:   0.2s ease;
  --transition-slow:   0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Page load reveal — staggered cards */
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.jersey-card {
  animation: slide-up 0.5s var(--transition-slow) both;
}

.jersey-card:nth-child(1) { animation-delay: 0.05s; }
.jersey-card:nth-child(2) { animation-delay: 0.10s; }
.jersey-card:nth-child(3) { animation-delay: 0.15s; }
.jersey-card:nth-child(4) { animation-delay: 0.20s; }

/* Orange accent bar — score fills on scroll */
.score-bar__fill {
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Hover shimmer on jersey image */
.jersey-card__image-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(249, 115, 22, 0.08) 50%,
    transparent 60%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.jersey-card:hover .jersey-card__image-wrap::after {
  opacity: 1;
}
```

---

## 8. Review Page — Specific Components

### Overall Score Block

```css
.review-score-block {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-8);
  background: var(--cs-orange-50);
  border-left: 5px solid var(--cs-orange-400);
  border-radius: 0 12px 12px 0;
  margin-bottom: var(--space-8);
}

.review-score-block__number {
  font-family: var(--font-display);
  font-size: 5rem;
  line-height: 1;
  color: var(--cs-orange-400);
}

.review-score-block__label {
  font-family: var(--font-display);
  font-size: 1.2rem;
  text-transform: uppercase;
  color: var(--cs-black);
}
```

### Verdict Banner

```css
.verdict-banner {
  background: var(--cs-orange-400);
  color: var(--cs-orange-900);
  padding: var(--space-4) var(--space-6);
  clip-path: polygon(0 0, 100% 0, 96% 100%, 4% 100%);
  text-align: center;
  margin-block: var(--space-8);
}

.verdict-banner__label {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  margin-bottom: var(--space-1);
}

.verdict-banner__text {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  text-transform: uppercase;
}
```

---

## 9. Responsive Breakpoints

```css
:root {
  --bp-sm:  640px;
  --bp-md:  768px;
  --bp-lg:  1024px;
  --bp-xl:  1280px;
}

/* Mobile first — adjust grid and type */
@media (max-width: 768px) {
  .hero {
    grid-template-columns: 1fr;
    min-height: 100svh;
    text-align: center;
  }

  .jersey-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .nav__links {
    display: none; /* Replace with hamburger menu */
  }
}

@media (max-width: 480px) {
  .jersey-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 10. Page Templates

### Homepage Sections (in order)

1. **Sticky Nav** — Logo + links + "Commander" CTA
2. **Hero** — Dark BG, big headline, jersey hero image, tagline in script
3. **Marquee Band** — "CAPITAINE SPORT · PLUS QU'UN MAILLOT · UNE ATTITUDE ·" on loop
4. **Featured Jersey** — Full-width feature card with score breakdown
5. **Jersey Grid** — "Nouveaux Maillots 2026" section
6. **Orange Diagonal CTA** — "Ne sois pas spectateur — Incarne la légende"
7. **By Category** — Filter tabs: World Cup | Club | National | Lifestyle
8. **Top Rated** — Horizontal scroll of highest scored jerseys
9. **Footer** — Logo, contact (+237 696 57 64 77), tagline, social links

### Jersey Detail Page Sections

1. **Breadcrumb** — Home > Maillots > Brazil 2026
2. **Product Header** — Jersey image gallery + overall score + price
3. **Quick Verdict Banner** — One-sentence bold verdict
4. **Detailed Score Breakdown** — Quality / Design / Value / Comfort / Authenticity
5. **Written Review** — Long-form, DM Sans body
6. **Gallery** — Detail photos (badge, fabric, numbers)
7. **Commander CTA** — Phone number + "Order Now" button
8. **Related Jerseys** — 4-card grid

---

## 11. Voice & Copy Guidelines

- **Headers:** Always in French. Use Bebas Neue uppercase energy.
  - ✅ `LES MAILLOTS OFFICIELS 2026 SONT DISPONIBLES`
  - ❌ "Check out our new jerseys"

- **Taglines:** Mix French phrases with brand energy.
  - ✅ *"plus qu'un maillot, une attitude"*
  - ✅ "Ne sois pas spectateur — Incarne la légende"

- **CTAs:** Action-forward, direct.
  - ✅ `COMMANDER MAINTENANT`, `VOIR L'AVIS`, `ODER NOW`

- **Ratings copy:** Confident and specific.
  - ✅ "Conçu pour les joueurs — porté par les supporters"
  - ✅ "qualité 100% satisfaction"

- **Phone number:** Always display prominently as `+237 696 57 64 77`

---

## 12. Do's and Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Use Bebas Neue for all headings | Use Inter or Roboto |
| Lead with orange as the only accent | Add purple, teal, or other accent colors |
| Show jersey photos on clean white/gray backgrounds | Use busy photographic jersey backgrounds |
| Use the diagonal clip-path band for CTA sections | Use flat rectangular CTA banners |
| Write copy in French for headers | Mix languages inconsistently |
| Use the script font for brand moments only | Use Dancing Script for body copy |
| Show scores as large Bebas numerals | Use small type for ratings |
| Keep badge colors to one per card | Stack multiple colored badges |

---

*Design system by Capitaine Sport — powered by Bryan Fongang.*
*Contact: +237 696 57 64 77*
