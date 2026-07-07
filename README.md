# Shivwik Holistic Care — "We're Moving" Placeholder Page

A single, self-contained announcement page to publish right now while the
full new site is finished — built around your existing logo (enhanced:
upscaled, sharpened, and given a transparent background so it sits
cleanly on the dark hero).

## What's inside
- `index.html` — the page itself
- `assets/images/logo-enhanced.png` — your logo, cleaned up (transparent background, sharpened, ~2.2x resolution for crisp display at larger sizes)
- `assets/images/logo-enhanced-onwhite.jpg` — same logo flattened onto white, for places that need a solid background (e.g. some social platforms)
- `assets/images/favicon-*.png` — browser tab / home-screen icons, cropped from the logo's icon mark
- `assets/css/style.css`, `assets/js/forms.js` — styling and form handling

## Publishing
Upload this whole folder (keeping the structure) to your GitHub Pages repo
root, or any static host — no build step needed. If replacing the current
live site temporarily, this can simply be your `index.html`.

## Forms → email
Both the **Book an Appointment** and **Send us a message** forms use
FormSubmit (formsubmit.co), a free relay that emails every submission to
**drsonal@shivwikholisticcare.com** — no backend required.

**One-time activation:** the first submission from your live domain
triggers a confirmation email from FormSubmit — open it and click
**"Activate Form."** After that, every future submission delivers
automatically and silently.

## SEO already in place
- Descriptive title/meta description targeting "physiotherapist Paschim
  Vihar" and the clinic name
- Open Graph tags (so the page previews nicely when shared/linked)
- `PhysicalTherapy` structured data (JSON-LD) with the new address and
  phone, for Google's local business understanding
- `robots.txt` + `sitemap.xml` included — update the domain in both if
  your final URL differs from shivwikholisticcare.com

## Responsive design
Mobile-first layout; the booking/contact forms stack to a single column
below ~860px, the sticky call/book bar appears on phones (<760px), and
all interactive elements meet comfortable touch-target sizing. Tested
logically across the common breakpoints (phone/tablet/desktop) — please
still spot-check on an actual phone browser before pointing your DNS at
it.

## One suggestion
The enhanced logo is noticeably better than the raw upload (sharper
edges, no background box, higher resolution) but it's still fundamentally
the same artwork — same lines, same JPEG-sourced detail. If you'd like a
true redesign rather than a cleanup, the custom vector marks built
earlier (spine-ribbon + crescent, or the SHIVWIK wordmark) are ready to
swap in any time.
