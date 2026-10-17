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
| `bookingLinks` | Your Calendly, Cal.com or Acuity link for each program. After applying, athletes go to the link for the program they chose |

If `formEndpoint` is empty, applications are **not sent anywhere**. If a booking link is empty, the athlete sees "We'll reach out within 48 hours" instead of a booking button.

## Photos

Put your headshot at `assets/photos/coach.jpg` (portrait, about 4:5). Until it's there, the pitcher mark shows in its place.

## Instagram

- Bio link: `https://yoursite.com/?utm_source=instagram&utm_medium=bio`
- Story links can deep-link to a section, for example `/#program-remote`, `/#program-mental`, `/#program-inperson` or `/#apply`.

The UTM tags are saved with each application, so you can see which links bring in athletes.

## Brand assets

`assets/` holds logos cropped from the brand kit: the primary logo, the wordmark, the marks, the social icons, the favicon, and the share image (`og-image.jpg`).
