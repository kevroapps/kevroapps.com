# kevroapps.com

Static site for **Kevro Apps** — an independent software studio in Doha. Hosted on
GitHub Pages at the custom domain `kevroapps.com`.

Plain HTML5 + CSS. No framework and no build step. The homepage carries a small
amount of vanilla JavaScript (hero slideshow, testimonial carousel, scroll-aware
header); every other page is static.

## What the site covers

The site serves two related audiences:

- **App users** — the homepage showcases *Islamic Coloring for Kids* (live on Google Play).
- **Service clients** — small businesses buying websites, landing pages, and
  automation. Covered by `/about/`, `/services/`, and `/contact/`.

## File structure

```
.
├── index.html          Home: hero, featured app, services bridge, testimonials,
│                       about, privacy strip
├── 404.html            Not-found page (GitHub Pages serves this automatically)
├── about/              Studio story and how-we-work values
├── services/           Service tiers with starting prices, inclusions, payment terms
├── contact/            Contact form (Web3Forms) + direct contact details
├── thanks/             Post-submit confirmation, form redirects here
├── apps/               Apps listing (currently one entry)
├── privacy/            Privacy policy for Islamic Coloring for Kids
├── tester/             Closed-test recruitment page (noindex)
├── demo/               Education-centre demo template for prospective clients
├── demo2/              Second client-facing demo
├── ucmas/              UCMAS Doha client page
├── css/
│   ├── home.css        Main stylesheet — index, about, services, contact, thanks, 404
│   └── styles.css      Older stylesheet — apps, privacy, tester
├── images/             Logos, favicons, OG image, app screenshots
├── CNAME               Custom domain for GitHub Pages
├── robots.txt          Allows everything except the sample/pitch pages
└── README.md           This file
```

`ucmas/`, `demo/`, `demo2/`, and `tester/` are kept out of search results: each carries
`<meta name="robots" content="noindex, nofollow">` and each is listed in `robots.txt`.
They stay reachable by direct link — nothing on the site links to them. `ucmas/` and
`demo2/` are speculative concepts for real businesses, so both open with a notice saying
so, and any figure or review on them that is not independently sourced is marked as a
placeholder. Keep it that way when editing them.

Subpages use the folder-with-index pattern for clean URLs: `/about`, `/services`,
`/contact`, `/privacy`.

`demo/`, `demo2/`, and `ucmas/` are self-contained with inline `<style>` blocks — they
do not depend on either stylesheet.

## Cache busting

`home.css` is linked with a query string (`/css/home.css?v=10`). **Bump that number in
every page that links it whenever you edit `home.css`**, otherwise returning visitors
keep the old cached stylesheet. Pages currently on `v=10`: `index.html`, `404.html`,
`about/`, `services/`, `contact/`, `thanks/`.

## Local preview

Open `index.html` directly in a browser — no server needed. Note that root-relative
paths (`/css/…`, `/images/…`) will not resolve from the filesystem; run a local server
if you need them:

```
python -m http.server 8000
```

## Contact form (Web3Forms)

`contact/index.html` posts to `https://api.web3forms.com/submit` and redirects to
`/thanks/` on success. Enquiries are delivered to `support@kevroapps.com`.

A live access key is set in the hidden `access_key` field. Web3Forms access keys are
public by design — the form posts from the browser, so the key is visible in page
source and belongs in the repo. It identifies the destination inbox; it is not a
secret and grants no account access.

If the key ever needs replacing (new account, rotated key), get one at web3forms.com —
it is emailed to you — swap the field value, then submit a test enquiry and confirm it
lands in the inbox. A key that has not been confirmed by email is inactive, and an
inactive or wrong key means submissions are silently discarded.

The `botcheck` hidden input is a honeypot — leave it in place and leave it empty.

## Deploying to GitHub Pages

Pushes to `main` deploy automatically. Repo: `kevroapps/kevroapps.com`.

First-time setup, if it ever needs redoing:

1. **Settings → Pages** → Source: **Deploy from a branch**, Branch: **main** / **/ (root)**.
2. Under **Custom domain**, enter `kevroapps.com`. GitHub reads the `CNAME` file.
3. Tick **Enforce HTTPS** once the certificate is issued (usually within an hour of DNS propagating).

## DNS at Namecheap

On the **Advanced DNS** tab for `kevroapps.com`. Delete any conflicting default records first.

**Apex (`kevroapps.com`)** — four A records pointing at GitHub Pages:

```
A    @    185.199.108.153
A    @    185.199.109.153
A    @    185.199.110.153
A    @    185.199.111.153
```

**Subdomain (`www.kevroapps.com`)** — one CNAME record:

```
CNAME    www    kevroapps.github.io.
```

Propagation usually takes 15 minutes to an hour. Verify with `nslookup kevroapps.com` —
you should see the four IPs above. If they ever change, GitHub's "Managing a custom
domain for your GitHub Pages site" docs page has the current list.

## Updating content

- **Service prices:** `services/index.html`. Prices are framed as starting points
  ("from QAR 1,500"); keep that framing so quotes stay flexible.
- **Privacy policy:** edit `privacy/index.html` directly.
- **OG image:** `images/og-image.png`, 1200x630. Meta tags across the site already point at it.
- **Testimonials:** the carousel in `index.html` clones cards for looping — add new
  `<figure class="quote-card">` blocks to the track and the JS handles the rest.

## Adding a new app

Copy the `<section class="featured">` block in `apps/index.html`, paste it below the
existing one, and update the heading, description, and Play Store link. No CSS changes needed.
