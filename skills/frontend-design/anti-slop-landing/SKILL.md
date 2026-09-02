---
name: anti-slop-landing
description: Use when building or reviewing a marketing landing page, portfolio, or redesign. Reads the brief first, infers the design direction, and ships interfaces that avoid the templated AI look - per the taste-skill rulebook (design read, dials, pre-flight check).
license: MIT
compatible_agents: claude-code, claude-desktop, cursor, gemini-cli
---

# Anti-Slop Landing Skill

Landing pages, portfolios, and redesigns. **Not** dashboards, data tables, or
multi-step product UI. Every rule here is contextual - none of it fires
automatically. Read the brief, then pull only what fits.

## 0. Brief inference (read the room first)

Before touching code, infer what the user actually wants. Bad output is almost
always the model jumping to a default aesthetic instead of reading the brief.

1. **Page kind** - landing (SaaS / consumer / agency / event), portfolio (dev /
   designer / studio), redesign (preserve vs overhaul), editorial / blog.
2. **Vibe words** - "minimalist", "calm", "Linear-style", "brutalist", "premium
   consumer", "playful", "editorial", "dark tech".
3. **Reference signals** - URLs, screenshots, named products / competitors.
4. **Audience** - B2B procurement panel vs design-conscious consumer vs a
   recruiter scanning a portfolio. The audience picks the aesthetic.
5. **Brand assets** - existing logo, color, type, photography.
6. **Quiet constraints** - accessibility-first, regulated, trust-first. These
   override aesthetic preference.

**Output a one-line design read** before any code:

> Reading this as: a B2B SaaS landing for technical buyers, with a Linear-style
> minimalist language, leaning toward Tailwind utilities + Geist + restrained
> motion.

**Anti-default discipline:** do not default to AI-purple gradients, centered hero
over dark mesh, three equal feature cards, glassmorphism on everything, or Inter +
slate-900. Reach past these based on the read.

## 1. Three dials

Set after the design read; every layout / motion / density decision is gated by them.

- `DESIGN_VARIANCE` (1 = perfect symmetry, 10 = artsy chaos)
- `MOTION_INTENSITY` (1 = static, 10 = cinematic)
- `VISUAL_DENSITY` (1 = airy gallery, 10 = cockpit dashboard)

Baseline `8 / 6 / 4` unless the read overrides. A "minimalist / calm" brief pulls
variance down to 5-6 and motion to 3-4; a "premium consumer" brief sits at 7-8 /
5-7 / 3-4; a "trust-first / public-sector" brief drops to 3-4 / 2-3 / 4-5.

## 2. Design system map

For many briefs, a real system is the right answer. **One system per project, and
use the official package.** Don't recreate Carbon by hand or mix Fluent with
Material in one tree.

| Brief reads as | Reach for |
|---|---|
| Enterprise SaaS / dashboards | `@fluentui/react-components` |
| Google-flavored product | `@material/web` |
| IBM-style B2B analytics | `@carbon/react` |
| GitHub devtool / community | `@primer/react-brand` |
| Public-sector (UK) | `govuk-frontend` |
| Public-sector (US) | `uswds` |
| Fast local-business MVP | Bootstrap 5.3 |
| Accessible React foundation | `@radix-ui/themes` |
| Owned-code SaaS components | shadcn/ui (never ship default state) |
| Modern indie SaaS | Tailwind v4 + `dark:` |

When the brief is an **aesthetic, not a system** (glassmorphism, brutalist,
editorial, dark-tech, aurora), build it with native CSS + Tailwind + a maintained
component library, and label honest approximations in comments (there is no
official Apple liquid-glass.css).

## 3. Hard layout discipline (shipping one of these is broken work)

- **Hero fits the initial viewport.** Headline ≤ 2 lines, subtext ≤ 20 words and
  ≤ 4 lines, CTA visible without scroll. If it overflows, cut copy or reduce font
  scale - don't add top padding.
- **Hero top padding cap `pt-24`** at desktop. More means it floats mid-viewport.
- **Hero stack, max 4 text elements.** One eyebrow OR brand strip, headline,
  subtext, CTAs (1 primary + max 1 secondary). No tiny tagline below the CTAs, no
  trust micro-strip in the hero.
- **"Used by / Trusted by" logo wall lives UNDER the hero, never inside it.**
- **Nav one line at desktop, height ≤ 80px.**
- **`min-h-[100dvh]`**, never `h-screen` (mobile address-bar jump).
- **No 3-equal-card feature row.** Use 2-col zig-zag, asymmetric grid, bento, or
  a horizontal-scroll alternative.
- **Zigzag alternation cap:** no 3+ consecutive image+text-split sections.
- **Eyebrow restraint:** max 1 per 3 sections (count `uppercase tracking`
  micro-labels; hero counts as one).
- **Bento cell count = your content count.** No empty cells. Vary composition to
  avoid one-sided repetition, and make 2-3 cells visually real (image, gradient,
  pattern - never all white-on-white text cards).
- **Shape consistency lock:** one radius scale for the page (all-sharp, all-soft,
  or all-pill, or a documented rule).

## 4. The em-dash ban (non-negotiable)

The `—` character is the single most common AI tell. It is banned: headlines,
eyebrows, body copy, quotes, attribution, captions, and button labels. Use a
period, comma, colon, or parentheses. The only permitted dash is the regular
hyphen `-` (compound words / ranges) and the minus sign in math. If a single `—`
or `–` appears anywhere user-visible, the page fails.

## 5. Content & visual assets

- **Real images are required.** Image-gen tool first, then
  `https://picsum.photos/seed/<descriptive>/<w>/<h>`, then clearly-labeled
  placeholder slots. **Div-based fake screenshots and hand-rolled decorative SVGs
  are banned.** A pure-text page is not minimalism; it is incomplete work.
- **Logo walls use real SVG logos** (Simple Icons / devicon) or a generated
  monogram mark - never plain text wordmarks, and never category labels under
  each logo.
- **Copy self-audit:** re-read every visible string. Flag anything grammatically
  broken, with unclear referents, or reading as AI-cute. Rewrite it as plain
  functional copy. No fake-precise numbers (92%, 4.1x, 48k) unless real.
- **One copy register per page.** Don't mix technical mono, editorial prose, and
  marketing punch.

## 6. Motion

- Motion must be **motivated** (hierarchy, storytelling, feedback, state
  transition). "It looked cool" is not a reason. GSAP-everywhere is amateur.
- **Max one marquee per page.**
- **Animate only `transform` and `opacity`.** Never `top`, `left`, `width`,
  `height`.
- **Respect `prefers-reduced-motion`** for anything above the lowest band - wrap
  with `useReducedMotion()` / gate with the `no-preference` media query.
- **Never `window.addEventListener("scroll")`.** Use `useScroll()`,
  `ScrollTrigger`, IntersectionObserver, or CSS scroll-driven animations.
- For pinned sections, the canonical GSAP skeletons use `start: "top top"`,
  `pin: true`, `scrub: 1`; for a sticky-stack, pin every card except the last and
  drive transforms off the next card's trigger.

## 7. Accessibility guardrails

- **Both modes from the start** (light / dark via `dark:` or tokens) unless the
  brief is print-emulating. Respect `prefers-color-scheme`.
- **No pure `#000000` or `#ffffff`.** Use off-black and off-white; pure values
  kill depth.
- **Button contrast check:** every CTA text is WCAG AA against its background (no
  white-on-white). Audit every form (inputs, placeholders, focus rings, labels).
- **No AI tells:** no neon outer glows by default, no custom cursors, no generic
  names (Jane Doe), no fake-perfect numbers, no startup-slop brand names (Acme,
  Nexus, SmartFlow), no filler verbs (elevate, seamless, unleash).

## Final pre-flight

Run this before declaring the page done; if any box fails, it is not done:

- [ ] Design read declared (one-liner).
- [ ] Dials explicit and reasoned from the brief.
- [ ] ZERO em-dashes (`—`) anywhere visible.
- [ ] One theme for the whole page; no mid-page inversion.
- [ ] One accent color locked page-wide.
- [ ] One corner-radius scale page-wide.
- [ ] Hero fits viewport (2-line headline, ≤20-word subtext, CTA visible),
  top padding ≤ `pt-24`, max 4 text elements.
- [ ] Eyebrow count ≤ ceil(sections / 3).
- [ ] No 3-equal-card row; no 3+ consecutive zigzag; no duplicate CTA intent.
- [ ] Logo wall under hero, real SVG logos, logo-only.
- [ ] Real images used; no div-based fake screenshots.
- [ ] Subtext ≤ 25 words by default; quotes ≤ 3 lines; no 20-row data tables.
- [ ] Motion motivated, one marquee max, only transform/opacity, reduced-motion
      honored.
- [ ] Button / form contrast WCAG AA.
- [ ] Empty, loading, and error states provided.
- [ ] Dark mode defined and tested in both modes.
