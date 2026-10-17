# 3:23 Pitching Performance: website

A one-page site for the Instagram bio link. It takes visitors from Instagram to programs, then the application, then a booking call.

Plain HTML. No build step. Put the `website/` folder on any static host (Netlify drop, Vercel, GitHub Pages, Cloudflare Pages).

## Go-live checklist

Open `index.html` and edit the `CONFIG` block near the bottom:

| Setting | What to put there |
|---|---|
| `instagramHandle` | Your handle without the `@` |
| `coachName` | Your name as it should appear under your photo |
| `formEndpoint` | A form endpoint that emails you applications, for example a free [Formspree](https://formspree.io) form URL |
| `newsletterEndpoint` | Where footer newsletter sign-ups go (Mailchimp, ConvertKit, Formspree). Empty means visitors see "Sign-ups open soon" and nothing is sent |
| `bookingLinks` | Your Calendly, Cal.com or Acuity link for each program. After applying, athletes go to the link for the program they chose |

If `formEndpoint` is empty, applications are **not sent anywhere**. If a booking link is empty, the athlete sees "We'll reach out within 48 hours" instead of a booking button.

## Placeholders to replace before launch

- **Testimonials** in the Proof section are bracketed placeholders. Replace them with real quotes, or remove the cards. Don't launch with them.
- **Logo row**: `[JUCO]` needs your school's name. To use real logos, swap each name for an `<img loading="lazy" alt="...">`; the CSS makes them greyscale.

## Photos

Hero photo: `assets/photos/mound-night-*`. It comes in WebP and JPEG at 800px and 1600px widths. The other two photos (`delivery-cmu-*`, `prayer-mound-*`) are compressed and ready but not used in this layout.

## Instagram

- Bio link: `https://yoursite.com/?utm_source=instagram&utm_medium=bio`
- Story links can deep-link to a section: `/#programs`, `/#program-remote`, `/#program-inperson`, `/#program-mental`, `/#proof`, `/#how`, `/#mission` or `/#apply` (opens the application). Older links (`/#coach`, `/#standard`, `/#inside`, `/#faq`) still resolve.

The UTM tags are saved with each application, so you can see which links bring in athletes.

## Brand assets

`assets/` holds logos cropped from the brand kit: the primary logo, the wordmark, the marks, the social icons, the favicon, and the share image (`og-image.jpg`).
