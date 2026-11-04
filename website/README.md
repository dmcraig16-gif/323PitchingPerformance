# 3:23 Pitching Performance: website

One page for 323pitchingperformance.com. It explains the two programs and points every visitor to a discovery call.

Funnel: Instagram (@3.23performance) to the free 323 Community on Skool to this site to a Calendly discovery call to Stripe enrollment to Trainerize.

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
| `discoveryCallUrl` | Your Calendly discovery call. Every button on the page goes here. Set to the "323 Pitching Performance Discovery Call" event |
| `instagramHandle` | Instagram handle without the `@` |
| `communityUrl` | Your free 323 Community on Skool. While empty, the footer's community block stays hidden |

## How the call buttons work

- The two program buttons pre-answer Calendly's "What are you interested in?" question with `Complete Pitching Program` or `Mental Game Mentorship`. That's the `a2` parameter, because it is the second custom question on the event. If you reorder or rename those questions in Calendly, update `data-interest` on those two buttons to match.
- Any `utm_` tags on the page URL carry through to Calendly. Use this as your Instagram bio link to see in Calendly which bookings came from Instagram:
  `https://323pitchingperformance.com/?utm_source=instagram&utm_medium=bio`

## Section links

Use these in stories and DMs: `/#different`, `/#paths`, `/#programming`, `/#mental-game`, `/#mission` (what we believe), `/#how`. Older links (`/#apply`, `/#what`, `/#proof`, `/#programs`, `/#program-remote`, `/#program-inperson`, `/#program-mental`, `/#coach`, `/#standard`, `/#inside`, `/#faq`) still land on a sensible section.

## Photos

`assets/photos/` holds each photo as WebP and JPEG at 800px and 1600px. The hero loads first; the others lazy-load and show in black and white through CSS.

## Proof

There are no testimonials on the page. Add them only when there are real quotes from real founding clients.
