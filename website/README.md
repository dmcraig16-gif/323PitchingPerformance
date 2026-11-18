# 323 Pitching Performance: website

One page for 323pitchingperformance.com. It explains the Complete Pitching Program and Mental Game Mentorship, and every section ends at the application.

Funnel: Instagram (@3.23performance) to the free 323 Community on Skool to this site to the application to a Calendly discovery call to Stripe enrollment to the athlete's program sheet and the 323 Community on Skool. The Calendly link is not on this site; it goes at the end of the application, after submit. No prices on the site.

Plain HTML. No build step.

## Publishing

Live at **https://323pitchingperformance.com/**, published with GitHub Pages from `dmcraig16-gif/323Website` (`main`). This repo's own Pages address belongs to the pitch visualizer.

- To update the live site: copy this folder to `323Website` without the `.md` docs and push to `main`. Pages republishes within a couple of minutes.
- Domain: Squarespace DNS points `323pitchingperformance.com` (four A records to 185.199.108-111.153) and `www` (CNAME to dmcraig16-gif.github.io) at GitHub Pages. The `CNAME` file in `323Website` holds the domain; don't delete it.
- Instagram bio link: https://323pitchingperformance.com/?utm_source=instagram&utm_medium=bio

## Files

| File | What it is |
|---|---|
| `index.html` | The page. Layout CSS and a small script live inside it |
| `323-brand.css` | Brand tokens (colors, fonts, radius), the scripture block and the main button. Change a color here and the whole page follows |
| `BRAND.md` | The brand guide. Every change to the site should pass it |
| `APPLICATION.md` | The Tally application: every question, hidden fields, the redirect to Calendly, and where submissions go |
| `assets/` | Logos, icons, share image, photos |

## Settings

Open `index.html` and edit the `CONFIG` block near the bottom:

| Setting | What it does |
|---|---|
| `applicationUrl` | The Tally application's link (`https://tally.so/r/je6ylY`). Phones, Instagram's in-app browser, and any visitor whose popup can't load go here |
| `tallyFormId` | Tally form ID (`je6ylY`). On desktop, Apply buttons open the application as a popup on the page. Both paths pass `program` and `utm_` tags as hidden fields |
| `foundingSpotsLeft` | Founding spots still open (now 5). Drives the hero line and both program badges ("5 founding spots left"). Set to `0` to hide every founding mention, including the founding-rate sentence |
| `coachInstagram` | The coach's Instagram handle (`dc.throws`), linked from the Your coach section |
| `instagramHandle` | Instagram handle without the `@` |
| `communityUrl` | The free 323 Community on Skool. Shows in the footer and as a "Not ready to apply?" line under the final Apply button. Empty hides both |

## How the Apply buttons work

- Every Apply button goes to `applicationUrl`. The program buttons also add `program=` so the application's hidden field records which program they picked. Any `utm_` tags on the page URL carry through, so use this as your Instagram bio link and you can see which applications came from Instagram:
  `https://323pitchingperformance.com/?utm_source=instagram&utm_medium=bio`
- Program copy lives in the two program sections (`#complete`, `#mental-game`) The FAQ holds "Why 6 months?" and "Why 3 months?".
- Founding spots: off (`foundingSpotsLeft: 0`). Founding rates are no longer offered; the setting hides every founding mention.
- Page order is built to convert: what 323 is and Apply on the first screen, the two programs, compare, how to enroll, then why 323, beliefs and FAQ for visitors who need more.

## Section links

Use these in stories and DMs: `/#different` (why 323), `/#coach-bio` (your coach), `/#programs` (what we offer), `/#complete`, `/#mental-game`, `/#how` (how to enroll), `/#faq`, `/#mission` (what we believe). Older links (`/#apply`, `/#paths`, `/#compare`, `/#programming`, `/#different`, `/#what`, `/#proof`, `/#program-remote`, `/#program-inperson`, `/#program-mental`, `/#coach`, `/#standard`, `/#inside`) still land on a sensible section.

## Photos

`assets/photos/` holds each photo as WebP and JPEG at 800px and 1600px. The hero loads first; the others lazy-load and show in black and white through CSS.

## Proof

There are no testimonials on the page. Add them only when there are real quotes from real founding clients.
