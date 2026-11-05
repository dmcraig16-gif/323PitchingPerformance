# 323 Pitching Performance: website

One page for 323pitchingperformance.com. It explains the Complete Pitching Program and Mental Game Mentorship, and every section ends at the application.

Funnel: Instagram (@3.23performance) to the free 323 Community on Skool to this site to the application to a Calendly discovery call to Stripe enrollment to Trainerize. The Calendly link is not on this site; it goes at the end of the application, after submit. No prices on the site.

Plain HTML. No build step. Put the `website/` folder on any static host (Netlify drop, Vercel, GitHub Pages, Cloudflare Pages).

## Files

| File | What it is |
|---|---|
| `index.html` | The page. Layout CSS and a small script live inside it |
| `323-brand.css` | Brand tokens (colors, fonts, radius), the scripture block and the main button. Change a color here and the whole page follows |
| `BRAND.md` | The brand guide. Every change to the site should pass it |
| `assets/` | Logos, icons, share image, photos |

## Settings

Open `index.html` and edit the `CONFIG` block near the bottom:

| Setting | What it does |
|---|---|
| `applicationUrl` | The live application. Every Apply button goes here. While it's empty, the buttons scroll to the closing section, which says applications open soon and points to Instagram. Put the Calendly discovery call link (`https://calendly.com/323mperformance/3-23-performance-discovery-call`) on the application's thank-you screen |
| `instagramHandle` | Instagram handle without the `@` |
| `communityUrl` | Your free 323 Community on Skool. While empty, the footer's community block stays hidden |

## How the Apply buttons work

- Every Apply button goes to `applicationUrl`. Any `utm_` tags on the page URL carry through, so use this as your Instagram bio link and you can see which applications came from Instagram:
  `https://323pitchingperformance.com/?utm_source=instagram&utm_medium=bio`
- Program copy lives in the two program sections (`#complete`, `#mental-game`) and the side-by-side table (`#compare`). The FAQ holds "Why 6 months?" and "Why 3 months?".
- Founding spots: both program sections and the hero say five founding spots are open. Update or remove those lines when they fill.

## Section links

Use these in stories and DMs: `/#programs`, `/#complete`, `/#mental-game`, `/#compare`, `/#how`, `/#faq`, `/#mission` (what we believe). Older links (`/#apply`, `/#paths`, `/#programming`, `/#different`, `/#what`, `/#proof`, `/#program-remote`, `/#program-inperson`, `/#program-mental`, `/#coach`, `/#standard`, `/#inside`) still land on a sensible section.

## Photos

`assets/photos/` holds each photo as WebP and JPEG at 800px and 1600px. The hero loads first; the others lazy-load and show in black and white through CSS.

## Proof

There are no testimonials on the page. Add them only when there are real quotes from real founding clients.
