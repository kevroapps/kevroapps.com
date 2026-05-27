# kevroapps.com

Static landing page for **Kevro Apps**, hosted on GitHub Pages at the custom domain `kevroapps.com`.

Pure HTML5 + one CSS file. No framework, no build step, no JavaScript.

## File structure

```
.
├── index.html       Home: hero + featured app + footer
├── apps.html        Apps listing (currently one entry)
├── privacy.html     Privacy policy (placeholder body — paste real content)
├── css/styles.css   Single stylesheet, mobile-first
├── images/          Logo and OG image (add files here as needed)
├── CNAME            Custom domain for GitHub Pages
└── README.md        This file
```

Total site weight: ~10KB.

## Local preview

Open `index.html` directly in a browser — no server needed.

## Deploying to GitHub Pages

1. Create a public repo at `kevroapps/kevroapps.com` (or any name; the CNAME file is what binds the custom domain).
2. Push everything in this folder to the `main` branch.
3. On GitHub: **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** / folder: **/ (root)**
   - Save.
4. Still on **Settings → Pages**, under **Custom domain**, enter `kevroapps.com` and save. GitHub will detect the `CNAME` file in the repo.
5. Tick **Enforce HTTPS** once the certificate has been issued (usually within an hour after DNS propagates).

## DNS at Namecheap

In the Namecheap dashboard for `kevroapps.com`, set the following on the **Advanced DNS** tab. Delete any conflicting default records first.

**Apex (`kevroapps.com`)** — four A records pointing to GitHub Pages:

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

(Replace `kevroapps` in the CNAME target with the actual GitHub username/org if different.)

Propagation usually takes 15 min – 1 hour. Verify with:

```
nslookup kevroapps.com
```

You should see the four GitHub IPs above. Once that resolves, the GitHub Pages DNS check (Settings → Pages) will go green and Let's Encrypt will issue the cert.

If the IPs change, the current list is documented at GitHub's "Managing a custom domain for your GitHub Pages site" docs page.

## Updating content

- **Privacy policy:** open `privacy.html` and paste the policy text in place of the `<!-- Privacy policy content will be inserted here -->` comment. Update the `<em>to be filled in</em>` stub with the real "Last updated" date.
- **Google Play link:** the featured-app button on both `index.html` and `apps.html` uses `href="#"`. Replace both with the real Play Store URL after launch.
- **OG image:** drop a 1200x630 PNG at `images/og-image.png`. The meta tags already point at that path.

## Adding a new app

Copy the `<section class="featured">` block from `apps.html`, paste it below the existing one, and update the heading, description, and link. No CSS changes needed.
