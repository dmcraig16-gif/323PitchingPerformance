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

## Proof section

The testimonials section is in the page but hidden (`id="proof-quotes"`, `hidden` attribute). When you have real quotes from founding clients, replace the `QUOTE` and `FIRST NAME, AGE OR LEVEL` text, remove `hidden`, and delete any card you don't fill. Never publish placeholder text.

## Photos

Hero: `assets/photos/mound-night-*`. Story section: `assets/photos/delivery-cmu-*` (shown in black and white by CSS, lazy-loaded). Each comes in WebP and JPEG at 800px and 1600px. `prayer-mound-*` is ready but unused.

## Instagram

- Bio link: `https://yoursite.com/?utm_source=instagram&utm_medium=bio`
- Story links can deep-link to a section: `/#how` (program vs mentor), `/#mission` (story), `/#programs` (what you get) or `/#apply` (opens the application). Older links (`/#proof`, `/#program-remote`, `/#program-inperson`, `/#program-mental`, `/#coach`, `/#standard`, `/#inside`, `/#faq`) still resolve.

The UTM tags are saved with each application, so you can see which links bring in athletes.

## Brand assets

`assets/` holds logos cropped from the brand kit: the primary logo, the wordmark, the marks, the social icons, the favicon, and the share image (`og-image.jpg`).
