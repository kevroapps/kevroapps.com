# kevroapps.com audit, 4 November 2026

Webby, for VC and Captain. Read only: nothing on the site was changed for this file.

Sources: the live site walked page by page (phone 390px and desktop 1280px, full-page captures), every file in the repo, `AGENCY.md`, `islamic_coloring/docs/store_listing_2026-11.md` and `quran_homework/docs/play_store/listing.md`. Baseline Lighthouse 12 on the live site, 4 Nov 2026 (mobile emulation and desktop preset, one run each).

## Baseline Lighthouse (live, before any change)

| Page | Mobile P / A / BP / SEO | Desktop P / A / BP / SEO |
|---|---|---|
| / | 69 / 91 / 100 / 100 | 83 / 91 / 100 / 100 |
| /apps/ | 71 / 95 / 100 / 100 | 87 / 95 / 100 / 100 |
| /about/ | 88 / 94 / 100 / 100 | 94 / 94 / 100 / 100 |
| /services/ | 88 / 95 / 100 / 100 | 93 / 95 / 100 / 100 |
| /contact/ | 88 / 93 / 100 / 100 | 93 / 93 / 100 / 100 |
| /tester/ | 100 / 100 / 100 / 69 | 100 / 100 / 100 / 69 |
| /quraan-class/privacy/ | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| /privacy/ | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| /ayah-play/privacy/ | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |

P performance, A accessibility, BP best practices. The /tester/ SEO 69 is deliberate (`noindex`).

Home mobile LCP is 9.4 s and apps mobile 7.0 s. Cause: about 2.2 MB of PNG screenshots (Lighthouse estimates 2.2 MB saved by modern formats and 1.3 MB by correct sizing) plus a render-blocking Google Fonts stylesheet.

Hosting checks (read only): GitHub Pages reports HTTPS enforced = on, custom domain kevroapps.com, built from main. `http://` and `www.` both answer 301. Nothing for Captain to switch.

## 1. Content that is wrong or stale

| # | Where | Problem | Proposed fix |
|---|---|---|---|
| C1 | Home | Reads as a one-product site. Qur'aan Class, the agency's first priority, is not on the home page at all. | Add a "More from Kevro Apps" block under the spotlight: Qur'aan Class (in closed testing on Google Play, English and Arabic) and Ayah Play (coming to Google Play). Nothing about prices or release dates. |
| C2 | Home and /apps/ | "100+ downloads" is a frozen number that goes stale and cannot be checked from here. | Remove it. If Captain wants a figure he gives it, dated. |
| C3 | /apps/ | "Updated Aug 18, 2026" is stale (1.1.2 is live). | Remove the date. No version number on the page, so it cannot go stale. |
| C4 | Home and /apps/ | No mention of the Ramadan offer, "42 free items including all 28 Arabic letters", "Android only; iPhone is being looked at", or "one-time purchases, no subscription, no ads" stated together. | State all four, from the store listing. Current terms only: no prices, never a "was" price. Offer line: 30 percent off until the end of Ramadan 2027. |
| C5 | Home testimonials | One review (Umm K) says she would pay "for the premium subscription". The app has no subscription, so the quote contradicts the page's own claim. | Drop that one card (seven remain). Captain's eye needed: these are real Play reviews he chose. |
| C6 | Home testimonials | Reviews use "Allahumma baarik" and similar spellings as the reviewers wrote them. | Keep verbatim (quotations, not our copy). Flag only. |
| C7 | Home, about, contact, services, thanks, 404, privacy | 33 em or en dashes used as punctuation, against the content rules. Services also uses en dashes in ranges ("2–3 days", "4–6 pages", "QAR 40–80"). | Rewrite with commas, colons, full stops or "to". |
| C8 | /apps/ | "Qur'an teacher". House spelling is "Qur'aan". "Ayah Play: Quran for Kids" is the app's own title. | Fix "Qur'aan teacher". Leave the Ayah Play title; Cody should confirm it. |
| C9 | /apps/ | Qur'aan Class card has no Arabic name and does not say English and Arabic. | Add the Arabic name taken only from the Play listing's title line, and "English and Arabic". It is Arabic text on the site, so it goes to Chody through VC before merge. If not cleared in time, the PR ships without it. |
| C10 | /about/ | Names only Islamic Coloring. | One added sentence naming Qur'aan Class and Ayah Play, same facts as C1. |
| C11 | /thanks/ | "I'll get back to you" while the rest of the site says "we". | "We will get back to you." |
| C12 | Home | "Flagship" wording and the hero badge "Released on Google Play" read as marketing for one product. | Keep the spotlight, change the eyebrow to "Available now", drop "flagship". |
| C13 | Home meta description and social tags | Dated wording, no Qur'aan Class. | Rewrite from the current facts. |
| C14 | /contact/ | The Web3Forms access key is in the page source. That is by design for this service (a public key), not a leak, but the form posts to a third party. | No change. Listed so it is known the form is the only third-party call on the site. |

## 2. Technical gaps

| # | Gap | Evidence | Fix |
|---|---|---|---|
| T1 | Images are full-size PNG: screenshots 180 to 430 KB each, og-image 380 KB, header logo 112 KB for a 56px slot, Islamic Coloring icon 142 KB for a 76px slot. | Lighthouse: 2.2 MB format saving, 1.3 MB sizing saving. | WebP at the sizes used (PNG kept for the share image and icons, where crawlers need it), `width` and `height` on every image, `loading="lazy"` below the fold, a preload for the first hero image. |
| T2 | Figtree and Inter loaded from Google Fonts: third party, render blocking, two different families across two stylesheets. | Network dependency check fails on every page. | Self-host one variable font (Figtree, SIL OFL licence), `font-display: swap`, one preload. No third-party request remains. |
| T3 | Two stylesheets (`home.css` 35 KB, `styles.css` 9.5 KB) and two page shells. The privacy, tester, Qur'aan Class and delete-account pages have a different header and no footer. | Files. | One `site.css` with tokens in `:root`, one header and footer on every page. The two old stylesheet files are removed once no page uses them. |
| T4 | No dark mode. | No `prefers-color-scheme` rule anywhere. | Colour tokens plus a dark set, `color-scheme: light dark`, a dark `theme-color`. |
| T5 | Accessibility: contrast fails on 10 of 18 runs (eyebrow blue on tint 4.28:1, grey lead text 3.46:1, avatar initials 2.36:1); contact fields use `span`, not `label`; heading order skips on /contact/; carousel dots below the target size; a name mismatch on a labelled button. | Lighthouse accessibility 91 to 95 on the main pages. | Darken the failing tokens, real labels, correct heading levels, 24px minimum targets, a "Skip to content" link. |
| T6 | No `sitemap.xml`; `robots.txt` has no `Sitemap:` line. | Files. | Add both. Sitemap lists the indexable pages only. |
| T7 | Canonical and `og:url` are written without the trailing slash on /privacy, /tester, /quraan-class/privacy, /quraan-class/delete-account and the Ayah Play page, but Pages serves `/privacy/`. The canonical points at a URL that redirects. | Source. | Trailing-slash canonicals everywhere. |
| T8 | 404 page has no canonical and is indexable. | Source. | `noindex`, shared shell. |
| T9 | One brand share image for every page; no `og:site_name`, `og:locale` or `og:image:alt`. | Source. | Add those. A second card for /apps/ (app icon and a screenshot) is proposed. |
| T10 | Manifest lacks `description`, `lang`, `start_url`, `scope` and a maskable icon. No SVG favicon. | `site.webmanifest`. | Fill in; add `favicon.svg` and a maskable 512 icon from the same Kevro logo. |
| T11 | Hero slideshow and review carousel move without a visible pause control (WCAG 2.2.2). | `index.html`. | Keep behaviour, add a pause button, make sure autoplay is off under reduced motion. No third-party scripts exist and none are added. |
| T12 | `lang="en"` is set; `dir="rtl"` is used inside the Arabic half of the Qur'aan Class policy. Correct. No `hreflang` needed while no Arabic page exists. | Source. | No change. |
| T13 | The CSS cache string differs across pages (`?v=11`, `?v=12`), so a deploy can leave pages on old CSS. | Source. | One version string for all pages. |

## 3. What I propose not to touch

1. **Technology**: stays plain HTML on GitHub Pages. No framework, bundler, CMS, analytics or cookie banner (as briefed).
2. **URLs**: every path that works today keeps working: `/coloring/` (the Instagram redirect to Google Play), `/auth/`, `/thanks/`, `/tester/`, `/quraan-class/delete-account/` and all three privacy URLs that Play Console points at.
3. **Policy wording**: legal text stays as written. Only the page shell around it changes. Effective dates are not mine to change.
4. **/tester/**: stays live and `noindex`, with Marko's words.
5. **Services prices**: `AGENCY.md` lists the Doha website service as parked, yet /services/ still advertises fixed QAR prices and delivery times. I fix dashes and layout only. Whether it stays live is Captain's call (D1).
6. **Client mockups** `/demo/`, `/demo2/`, `/ucmas/`: already `noindex` and in `robots.txt`. They carry their own styles and some emoji on purpose (README). Not touched.
7. **Scratch files** `kaaba-render.html`, `kaaba-test.html`, `kaaba_professional.svg` at the repo root: public, unlinked, no `noindex`. I will add `noindex` and a robots line but not delete them (deleting breaks a URL).
8. **Review wording**: reviewers' own words stay exact, apart from dropping the one card in C5.
9. **Contact form**: Web3Forms stays; only labels and layout change.
10. **README.md**: not committed to (standing guardrail).

## Decisions for Captain (none blocks the PR)

- **D1** Keep /services/ live while the Doha website service is parked? I assume yes for now.
- **D2** Drop the "premium subscription" review card (C5)? I assume yes.
- **D3** Show a download number (C2)? I assume none.
- **D4** Arabic app name on /apps/ (C9) waits for Chody through VC.

## Case for an Arabic version of the site

Short answer: not yet.

For: Qur'aan Class's buyers are Qur'aan teachers and madrasah families, many of whom read Arabic first. The app and its privacy policy already exist in both languages. An Arabic page would serve people searching for the app by its Arabic name, and `hreflang` pairs are cheap once the pages exist.

Against: the studio site today mainly serves Play reviewers, parents of Islamic Coloring and service clients, none of whom are asking for Arabic. Every Arabic page needs Chody's review before it ships and again on each change. Right-to-left layout doubles the screenshot checks. The Play listing already carries the Arabic copy where teachers will read it.

Recommendation: build one Arabic page, `/ar/quraan-class/`, once Qur'aan Class has a public Play listing (closed test ends no earlier than about 17 Nov), using the Arabic text Chody has already reviewed, with `hreflang` back to its English page and a language link in the footer. Do not translate the rest of the site. Reassess after the first paying teacher.
