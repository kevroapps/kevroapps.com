# Builds the Arabic pages (under /ar/) from ar_content.A, and adds the language link and hreflang to the English pages.
# Run from the repo root:  python build_ar.py [--english]   (--english also patches the English pages)
import io, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ar_content import A

PLAY = "https://play.google.com/store/apps/details?id=com.islamickids.islamic_coloring"
SITE = "https://kevroapps.com"
# Arabic app names (Captain, 7 Nov 2026; the same as the Play listings). The Latin name goes in brackets at the first mention on each page.
IC_AR = "تلوين إسلامي للأطفال"
AP_AR = "آيات للصغار"
ICL = "Islamic Coloring for Kids"
APL = "Ayah Play"
CSS_V = "21"
LTR = lambda s: f'<span class="ltr">{s}</span>'
# A small "English" tag after a link that opens an English-only page (the word is the approved language-link label).
EN_TAG = f'<span class="dest-lang" lang="en" dir="ltr">{A["lang_to_en"]}</span>'
GALLERY_JS = '  <script src="/js/gallery.js" defer></script>\n'
CONTACT_JS = '  <script src="/js/contact.js" defer></script>\n'


def fig(src, alt, w, h, lazy=False, extra=""):
    """A screenshot that keeps its own proportions and opens larger (js/gallery.js; without script the link opens the image)."""
    lz = ' loading="lazy"' if lazy else ""
    return f'<figure class="shot{extra}"><a href="{src}" data-zoom><img src="{src}" alt="{esc(alt)}" width="{w}" height="{h}"{lz}></a></figure>'

# English path -> Arabic path (pages that exist in both languages)
PAIRS = {"/": "/ar/", "/apps/": "/ar/apps/", "/islamic-coloring/": "/ar/islamic-coloring/", "/quraan-class/": "/ar/quraan-class/",
         "/ayah-play/": "/ar/ayah-play/", "/about/": "/ar/about/", "/contact/": "/ar/contact/"}


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def li(items):
    return "".join(f"            <li>{A[k]}</li>\n" for k in items)


def faq(pairs, overrides=None):
    overrides = overrides or {}
    out = '        <div class="faq">\n'
    for qk, ak in pairs:
        out += f'          <details>\n            <summary>{A[qk]}</summary>\n            <p>{overrides.get(ak, A[ak])}</p>\n          </details>\n'
    return out + "        </div>\n"


def faq_ld(pairs):
    return {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": "ar",
            "mainEntity": [{"@type": "Question", "name": A[q], "acceptedAnswer": {"@type": "Answer", "text": A[a]}} for q, a in pairs]}


def shell(path, en_path, title, desc, og_image, og_alt, main, jsonld=None, current="apps", cta=None, scripts="", noindex=False):
    url = SITE + path
    ld = "".join('  <script type="application/ld+json">' + json.dumps(o, ensure_ascii=False, separators=(",", ":")) + "</script>\n" for o in (jsonld or []))
    cur = lambda k: ' aria-current="page"' if current == k else ""
    # The header button stays on the task of the page: the store button on the coloring page, a question on Ayah Play, nothing elsewhere.
    cta_html = {"play": f'\n        <a href="{PLAY}" class="btn btn-nav" target="_blank" rel="noopener">{A["nav_get"]} &larr;</a>',
                "ask": f'\n        <a href="/ar/contact/?app=ayah-play" class="btn btn-nav">{A["p_ask"]} &larr;</a>'}.get(cta, "")
    robots = '  <meta name="robots" content="noindex">\n' if noindex else ""
    return f'''<!DOCTYPE html>
<html lang="ar" dir="rtl" data-theme-label="{esc(A["theme"])}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}">
{robots}  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0B1322" media="(prefers-color-scheme: dark)">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="{esc(A["brand"])}">
  <meta property="og:locale" content="ar_AR">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SITE}{og_image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{esc(og_alt)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(title)}">
  <meta name="twitter:description" content="{esc(desc)}">
  <meta name="twitter:image" content="{SITE}{og_image}">

  <link rel="canonical" href="{url}">
  <link rel="alternate" hreflang="ar" href="{url}">
  <link rel="alternate" hreflang="en" href="{SITE}{en_path}">
  <link rel="alternate" hreflang="x-default" href="{SITE}{en_path}">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">

  <link rel="preload" href="/fonts/noto-sans-arabic-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/figtree-latin-var.woff2" as="font" type="font/woff2" crossorigin>
  <script>try{{var t=localStorage.getItem("kevro-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}}catch(e){{}}</script>
  <link rel="stylesheet" href="/css/site.css?v={CSS_V}">
  <link rel="stylesheet" href="/css/ar.css?v={CSS_V}">
{ld}</head>
<body>
  <a class="skip-link" href="#main">{A["skip"]}</a>

  <header class="site-header">
    <div class="wrap header-row">
      <a href="/ar/" class="brand" aria-label="{esc(A["brand"])}">
        <img src="/images/kevro-logo.webp" alt="" class="brand-logo logo-for-light" width="56" height="34">
        <img src="/images/kevro-logo-light.webp" alt="" class="brand-logo logo-for-dark" width="56" height="34" loading="lazy">
        <span class="brand-name">{A["brand"]}</span>
      </a>
      <nav class="nav" aria-label="{esc(A["nav_apps"])}">
        <a href="/ar/apps/" class="nav-link"{cur("apps")}>{A["nav_apps"]}</a>
        <a href="/ar/about/" class="nav-link"{cur("about")}>{A["nav_about"]}</a>
        <a href="/ar/contact/" class="nav-link"{cur("contact")}>{A["nav_contact"]}</a>
        <a href="{en_path}" class="nav-link lang-link" lang="en" hreflang="en" aria-label="{esc(A["lang_aria"])}: English">{A["lang_to_en"]}</a>{cta_html}
      </nav>
    </div>
  </header>

{main}
  <footer class="site-footer">
    <div class="wrap footer-row">
      <div class="footer-brand">
        <img src="/images/kevro-apps-footer-mark.png" alt="" class="footer-mark" width="34" height="34" loading="lazy">
        <span class="footer-name">{A["brand"]}</span>
      </div>
      <div class="footer-links">
        <span class="copy">{A["foot_copy"]}</span>
        <a href="/ar/apps/">{A["nav_apps"]}</a>
        <a href="/ar/about/">{A["nav_about"]}</a>
        <a href="/ar/contact/">{A["nav_contact"]}</a>
        <a href="/privacy/" hreflang="en">{A["foot_privacy"]} {EN_TAG}</a>
        <a href="mailto:support@kevroapps.com">support@kevroapps.com</a>
      </div>
    </div>
  </footer>
{scripts}  <script src="/js/chat.js" defer></script>
  <script src="/js/theme.js" defer></script>
</body>
</html>
'''


def crumbs(name_key, path):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": A["brand"], "item": SITE + "/ar/"},
        {"@type": "ListItem", "position": 2, "name": A["crumb_apps"], "item": SITE + "/ar/apps/"},
        {"@type": "ListItem", "position": 3, "name": A[name_key] if name_key in A else name_key, "item": SITE + path}]}


def crumb_nav(name):
    return f'''    <nav class="crumbs wrap" aria-label="{esc(A["crumb_label"])}">
      <a href="/ar/apps/">{A["crumb_apps"]}</a><span aria-hidden="true">/</span><span aria-current="page">{name}</span>
    </nav>
'''


def more_cards(items):
    out = '        <div class="feature-grid two">\n'
    for title, text, chip, href, link in items:
        out += f'''          <article class="feature-panel">
            <h3>{title}</h3>
            <p>{text}</p>
            <div class="panel-links"><span class="chip">{chip}</span><a href="{href}" class="more-link">{link}</a></div>
          </article>
'''
    return out + "        </div>\n"


QC_NAME = 'حلقة القرآن'
QC_H3 = f'<span lang="ar">{QC_NAME}</span>'

# ------------------------------------------------------------------ pages
def home():
    main = f'''  <main id="main">
    <section id="top" class="hero">
      <div class="hero-glow" aria-hidden="true">
        <span class="glow-blue"></span>
        <span class="glow-teal"></span>
      </div>
      <div class="wrap hero-inner">
        <div>
          <div class="badge"><span class="dot"></span>{A["h_badge"]}</div>
          <h1>{A["h_h1"]}</h1>
          <p class="hero-sub">{A["h_lead"]}</p>
          <div class="hero-cta">
            <a href="{PLAY}" class="btn btn-accent" target="_blank" rel="noopener">{A["play_get"]}</a>
            <a href="/ar/islamic-coloring/" class="btn btn-secondary">{A["h_details"]}</a>
          </div>
          <div class="trust">
            <span><span class="dot"></span>{A["h_f1"]}</span>
            <span><span class="dot"></span>{A["h_f2"]}</span>
            <span><span class="dot"></span>{A["h_f3"]}</span>
          </div>
        </div>
        <div class="phone-wrap">
          <div class="hero-figure">
            <div class="phone">
              <div class="phone-screen">
                <div class="slides">
                  <img class="slide is-active" src="/images/screenshots/hero-1.webp" alt="{esc(A["alt_hero"])}" width="594" height="1254" fetchpriority="high">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap">
        <p class="eyebrow">{A["h_eyebrow"]}</p>
        <h2>{A["h_h2"]}</h2>
        <p class="section-sub">{A["h_p"]}</p>
        <div class="feature-grid">
          <article class="feature-panel app-card">
            <span class="app-icon"><img src="/images/islamic-coloring-icon.webp" alt="" width="64" height="64" loading="lazy"></span>
            <h3 class="card-title">{IC_AR}</h3>
            <p>{A["h_card"]}</p>
            <ul class="ticks tight">
{li(["h_c1", "h_c2", "h_c3", "h_c4", "h_c5"])}            </ul>
            <p class="offer">{A["h_offer"]}</p>
            <div class="panel-links"><span class="chip">{A["h_badge"]}</span><a href="{PLAY}" class="more-link" target="_blank" rel="noopener">{A["play_get"]}</a></div>
          </article>
          <article class="feature-panel">
            <h3>{QC_H3}</h3>
            <p>{A["h_qc"]}</p>
            <div class="panel-links"><span class="chip">{A["status_testing_play"]}</span><a href="/ar/quraan-class/" class="more-link">{A["see_qc"]}</a></div>
          </article>
          <article class="feature-panel">
            <h3>{AP_AR}</h3>
            <p>{A["h_ap"]}</p>
            <div class="panel-links"><span class="chip">{A["status_soon"]}</span><a href="/ar/ayah-play/" class="more-link">{A["see_ap"]}</a></div>
          </article>
        </div>
        <p class="fine apps-note">{A["h_notify"].split("؟")[0]}؟ <a href="mailto:support@kevroapps.com?subject=Notify%20me%20about%20new%20Kevro%20apps">{A["h_notify"].split("؟")[1].strip()}</a></p>
      </div>
    </section>

    <section class="section" id="about">
      <div class="wrap">
        <p class="eyebrow">{A["h_about_eyebrow"]}</p>
        <h2>{A["h_about_h2"]}</h2>
        <p class="section-sub">{A["h_about_p"]}</p>
        <div class="feature-grid">
          <article class="feature-panel"><h3>{A["h_v1t"]}</h3><p>{A["h_v1"]}</p></article>
          <article class="feature-panel"><h3>{A["h_v2t"]}</h3><p>{A["h_v2"]}</p></article>
          <article class="feature-panel"><h3>{A["h_v3t"]}</h3><p>{A["h_v3"]}</p></article>
        </div>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap product-split">
        <div>
          <p class="eyebrow">{A["h_priv_eyebrow"]}</p>
          <h2>{A["h_priv_h2"]}</h2>
          <p class="section-sub">{A["h_priv_p"]}</p>
        </div>
        <div class="panel">
          <ul class="ticks tight">
{li(["h_priv1", "h_priv2", "h_priv3"])}          </ul>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <h2>{A["h_q_h2"]}</h2>
        <p class="section-sub">{A["h_q_p"]}</p>
        <p><a href="mailto:support@kevroapps.com" class="btn btn-navy">support@kevroapps.com</a></p>
      </div>
    </section>
  </main>
'''
    return shell("/ar/", "/", A["h_title"], A["h_desc"], "/images/og-image.png", A["h_title"], main, [], current="")


def apps():
    cards = f'''          <article class="feature-panel app-card">
            <span class="app-icon"><img src="/images/islamic-coloring-icon.webp" alt="" width="64" height="64" loading="lazy"></span>
            <h2 class="card-title">{IC_AR}</h2>
            <p>{A["a_ic"]}</p>
            <div class="panel-links"><span class="chip">{A["status_play"]}</span><a href="/ar/islamic-coloring/" class="more-link">{A["see_app"]}</a></div>
          </article>
          <article class="feature-panel app-card">
            <h2 class="card-title">{QC_H3}</h2>
            <p>{A["a_qc"]}</p>
            <div class="panel-links"><span class="chip">{A["status_testing"]}</span><a href="/ar/quraan-class/" class="more-link">{A["see_qc"]}</a></div>
          </article>
          <article class="feature-panel app-card">
            <h2 class="card-title">{AP_AR}</h2>
            <p>{A["a_ap"]}</p>
            <div class="panel-links"><span class="chip">{A["status_soon"]}</span><a href="/ar/ayah-play/" class="more-link">{A["see_ap"]}</a></div>
          </article>'''
    main = f'''  <main id="main">
    <section class="page-hero" aria-labelledby="apps-title">
      <div class="wrap">
        <p class="eyebrow">{A["a_eyebrow"]}</p>
        <h1 id="apps-title">{A["a_h1"]}</h1>
        <p class="page-lead">{A["a_lead"]}</p>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="feature-grid">
{cards}
        </div>
        <p class="fine apps-note">{A["a_note"]}</p>
      </div>
    </section>
  </main>
'''
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "inLanguage": "ar", "name": A["a_h1"], "url": SITE + "/ar/apps/"}]
    return shell("/ar/apps/", "/apps/", A["a_title"], A["a_desc"], "/images/og-apps.png", A["a_title"], main, ld)


def islamic_coloring():
    pairs = [("i_q1", "i_a1"), ("i_q2", "i_a2"), ("i_q3", "i_a3"), ("i_q4", "i_a4"), ("i_q5", "i_a5"), ("i_q6", "i_a6")]
    main = f'''  <main id="main">
{crumb_nav(IC_AR)}    <section class="app-hero" aria-labelledby="app-title">
      <div class="wrap app-hero-grid">
        <div class="app-hero-copy">
          <p class="eyebrow">{A["i_eyebrow"]}</p>
          <div class="app-title-lockup">
            <span class="app-icon app-icon-large">
              <img src="/images/islamic-coloring-icon.webp" alt="{esc(A["alt_icon"])}" width="112" height="112">
            </span>
            <h1 id="app-title">{IC_AR}</h1>
          </div>
          <p class="page-lead">{A["i_lead"]}</p>
          <p class="offer">{A["h_offer"]}</p>
          <div class="hero-cta">
            <a href="{PLAY}" class="btn btn-accent" target="_blank" rel="noopener">{A["play_get"]}</a>
            <a href="/privacy/" class="btn btn-secondary" hreflang="en">{A["privacy_btn"]} {EN_TAG}</a>
          </div>
          <div class="app-facts app-facts-hero">
            <span>{A["i_f1"]}</span>
            <span>{A["i_f2"]}</span>
            <span>{A["i_f3"]}</span>
            <span>{A["i_f4"]}</span>
          </div>
        </div>
        <div class="app-hero-media">
          {fig("/images/screenshots/shot-1.webp", A["alt_shot1"], 300, 633, extra=" raised")}
          {fig("/images/screenshots/shot-2.webp", A["alt_shot2"], 300, 633, extra=" center")}
        </div>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap">
        <h2>{A["i_do_h2"]}</h2>
        <p class="section-sub">{A["i_do_sub"]}</p>
        <div class="feature-grid">
          <article class="feature-panel"><h3>{A["i_do1t"]}</h3><p>{A["i_do1"]}</p></article>
          <article class="feature-panel"><h3>{A["i_do2t"]}</h3><p>{A["i_do2"]}</p></article>
          <article class="feature-panel"><h3>{A["i_do3t"]}</h3><p>{A["i_do3"]}</p></article>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap product-split">
        <div>
          <h2>{A["i_fam_h2"]}</h2>
          <p class="section-sub">{A["i_fam_sub"]}</p>
          <a href="{PLAY}" class="btn btn-navy" target="_blank" rel="noopener">{A["play_open"]}</a>
        </div>
        <div class="panel">
          <h3>{A["i_par_h3"]}</h3>
          <ul class="ticks tight">
{li(["i_par1", "i_par2", "i_par3", "i_par4", "i_par5", "i_par6"])}          </ul>
        </div>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap">
        <div class="section-head compact">
          <div>
            <p class="eyebrow">{A["i_shots_eyebrow"]}</p>
            <h2>{A["i_shots_h2"]}</h2>
          </div>
          <p class="lead">{A["i_shots_lead"]}</p>
        </div>
        <div class="shots app-gallery">
          {fig("/images/screenshots/shot-1.webp", A["alt_shot1"], 300, 633, lazy=True)}
          {fig("/images/screenshots/shot-2.webp", A["alt_shot2"], 300, 633, lazy=True)}
          {fig("/images/screenshots/shot-3.webp", A["alt_shot3"], 300, 633, lazy=True)}
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="faq-title">
      <div class="wrap">
        <h2 id="faq-title">{A["i_faq_h2"]}</h2>
{faq(pairs)}      </div>
    </section>

    <section class="section section-tint" aria-labelledby="more-title">
      <div class="wrap">
        <p class="eyebrow">{A["more_eyebrow"]}</p>
        <h2 id="more-title">{A["more_title"]}</h2>
{more_cards([(QC_H3, A["i_more_qc"], A["status_testing"], "/ar/quraan-class/", A["see_qc"]), (AP_AR, A["i_more_ap"], A["status_soon"], "/ar/ayah-play/", A["see_ap"])])}      </div>
    </section>
  </main>
'''
    ld = [{"@context": "https://schema.org", "@type": "MobileApplication", "name": ICL, "alternateName": IC_AR, "inLanguage": "ar",
           "operatingSystem": "Android", "applicationCategory": "EducationalApplication", "description": A["i_desc"],
           "url": SITE + "/ar/islamic-coloring/", "installUrl": PLAY, "image": SITE + "/images/islamic-coloring-icon.png",
           "publisher": {"@type": "Organization", "name": "Kevro Apps", "alternateName": A["brand"], "url": SITE + "/"}},
          crumbs(IC_AR, "/ar/islamic-coloring/"), faq_ld(pairs)]
    return shell("/ar/islamic-coloring/", "/islamic-coloring/", A["i_title"], A["i_desc"], "/images/og-apps.png", A["i_title"], main, ld, cta="play", scripts=GALLERY_JS)


def quraan_class():
    pairs = [(f"q_q{i}", f"q_a{i}") for i in range(1, 7)]
    A_local_q_a1 = A["q_a1"].replace(A["q_test_link"], '<a href="/tester/" lang="en" hreflang="en">' + A["q_test_link"] + '</a>')
    # the two links inside sentences keep their position by splitting on the link texts
    test_p = A["q_test_p"].replace(A["q_test_link"], f'<a href="/tester/" lang="en" hreflang="en">{A["q_test_link"]}</a>')
    del_p = A["q_del"]
    qc_shots = "".join(f'          {fig(f"/images/screenshots/quraan-class-{n}.webp", A[f"q_alt{n}"], 594, 1333, lazy=True)}\n' for n in range(1, 5))
    main = f'''  <main id="main">
{crumb_nav(QC_H3)}    <section class="app-hero" aria-labelledby="app-title">
      <div class="wrap app-hero-grid">
        <div class="app-hero-copy">
          <p class="eyebrow">{A["q_eyebrow"]}</p>
          <h1 id="app-title">{QC_NAME}</h1>
          <p class="page-lead">{A["q_lead"]}</p>
          <div class="hero-cta">
            <a href="/tester/" class="btn btn-accent" hreflang="en">{A["q_test_btn"]} {EN_TAG}</a>
            <a href="/quraan-class/privacy/#ar" class="btn btn-secondary" hreflang="en">{A["privacy_btn"]}</a>
          </div>
        </div>
        <aside class="panel at-a-glance" aria-label="{esc(A["glance"])}">
          <h2 class="panel-title">{A["glance"]}</h2>
          <ul class="ticks tight">
{li(["q_g1", "q_g2", "q_g3", "q_g4", "q_g5"])}          </ul>
        </aside>
      </div>
    </section>

    <section class="section" aria-labelledby="look-title">
      <div class="wrap">
        <div class="section-head compact">
          <div>
            <p class="eyebrow">{A["i_shots_eyebrow"]}</p>
            <h2 id="look-title">{A["i_shots_h2"]}</h2>
          </div>
          <p class="lead">{A["q_shots_note"]}</p>
        </div>
        <div class="shots shots-four">
{qc_shots}        </div>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap">
        <h2>{A["q_how_h2"]}</h2>
        <p class="section-sub">{A["q_how_sub"]}</p>
        <div class="feature-grid">
          <article class="feature-panel"><h3>{A["q_t_h3"]}</h3><ul class="ticks tight">
{li(["q_t1", "q_t2", "q_t3", "q_t4", "q_t5", "q_t6", "q_t7"])}          </ul></article>
          <article class="feature-panel"><h3>{A["q_s_h3"]}</h3><ul class="ticks tight">
{li(["q_s1", "q_s2", "q_s3"])}          </ul></article>
          <article class="feature-panel"><h3>{A["q_p_h3"]}</h3><ul class="ticks tight">
{li(["q_p1", "q_p2", "q_p3", "q_p4"])}          </ul></article>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap product-split">
        <div>
          <h2>{A["q_priv_h2"]}</h2>
          <p class="section-sub">{A["q_priv_sub"]}</p>
          <a href="/quraan-class/privacy/#ar" class="btn btn-navy" hreflang="en">{A["q_priv_btn"]}</a>
        </div>
        <div class="panel" id="test">
          <h3>{A["q_test_h3"]}</h3>
          <p>{test_p}</p>
          <p class="fine"><a href="/quraan-class/delete-account/#ar" hreflang="en">{del_p}</a></p>
        </div>
      </div>
    </section>

    <section class="section section-tint" aria-labelledby="faq-title">
      <div class="wrap">
        <h2 id="faq-title">{A["q_faq_h2"]}</h2>
{faq(pairs, {"q_a1": A_local_q_a1})}      </div>
    </section>

    <section class="section" aria-labelledby="more-title">
      <div class="wrap">
        <p class="eyebrow">{A["more_eyebrow"]}</p>
        <h2 id="more-title">{A["more_title"]}</h2>
{more_cards([(IC_AR, A["q_more_ic"], A["status_play"], "/ar/islamic-coloring/", A["see_app"]), (AP_AR, A["q_more_ap"], A["status_soon"], "/ar/ayah-play/", A["see_ap"])])}      </div>
    </section>
  </main>
'''
    ld = [crumbs("q_name", "/ar/quraan-class/"), faq_ld(pairs)]
    ld[0]["itemListElement"][2]["name"] = QC_NAME
    return shell("/ar/quraan-class/", "/quraan-class/", A["q_title"], A["q_desc"], "/images/og-image.png", A["q_title"], main, ld, scripts=GALLERY_JS)


def ayah_play():
    pairs = [(f"p_q{i}", f"p_a{i}") for i in range(1, 5)]
    main = f'''  <main id="main">
{crumb_nav(AP_AR)}    <section class="app-hero" aria-labelledby="app-title">
      <div class="wrap app-hero-grid">
        <div class="app-hero-copy">
          <p class="eyebrow">{A["p_eyebrow"]}</p>
          <h1 id="app-title">{AP_AR}</h1>
          <p class="page-lead">{A["p_lead"]}</p>
          <div class="hero-cta">
            <a href="/ayah-play/privacy/" class="btn btn-secondary" hreflang="en">{A["privacy_btn"]} {EN_TAG}</a>
            <a href="mailto:support@kevroapps.com" class="btn btn-secondary">{A["p_ask"]}</a>
          </div>
        </div>
        <aside class="panel at-a-glance" aria-label="{esc(A["glance"])}">
          <h2 class="panel-title">{A["glance"]}</h2>
          <ul class="ticks tight">
{li(["p_g1", "p_g2", "p_g3", "p_g4", "p_g5"])}          </ul>
        </aside>
      </div>
    </section>

    <section class="section section-tint" aria-labelledby="faq-title">
      <div class="wrap">
        <h2 id="faq-title">{A["p_faq_h2"]}</h2>
{faq(pairs)}      </div>
    </section>

    <section class="section" aria-labelledby="more-title">
      <div class="wrap">
        <p class="eyebrow">{A["more_eyebrow"]}</p>
        <h2 id="more-title">{A["more_title"]}</h2>
{more_cards([(IC_AR, A["p_more_ic"], A["status_play"], "/ar/islamic-coloring/", A["see_app"]), (QC_H3, A["p_more_qc"], A["status_testing"], "/ar/quraan-class/", A["see_qc"])])}      </div>
    </section>
  </main>
'''
    ld = [crumbs(AP_AR, "/ar/ayah-play/"), faq_ld(pairs)]
    return shell("/ar/ayah-play/", "/ayah-play/", A["p_title"], A["p_desc"], "/images/og-image.png", A["p_title"], main, ld, cta="ask")


def about():
    main = f'''  <main id="main">
    <section class="page-hero">
      <div class="wrap">
        <p class="eyebrow">{A["b_eyebrow"]}</p>
        <h1>{A["b_h1"]}</h1>
        <p class="page-lead">{A["b_lead"]}</p>
      </div>
    </section>

    <section class="section">
      <div class="wrap legal">
        <p>{A["b_p1"]}</p>
        <p>{A["b_p2"]}</p>
        <p>{A["b_p3"]}</p>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap">
        <h2>{A["b_how_h2"]}</h2>
        <div class="feature-grid">
          <article class="feature-panel"><h3>{A["b_w1t"]}</h3><p>{A["b_w1"]}</p></article>
          <article class="feature-panel"><h3>{A["b_w2t"]}</h3><p>{A["b_w2"]}</p></article>
          <article class="feature-panel"><h3>{A["b_w3t"]}</h3><p>{A["b_w3"]}</p></article>
        </div>
      </div>
    </section>
  </main>
'''
    return shell("/ar/about/", "/about/", A["b_title"], A["b_desc"], "/images/og-image.png", A["b_title"], main, [], current="about")


def contact():
    opts = [("general", "Kevro Apps (general)", A["brand"]), ("islamic-coloring", ICL, IC_AR), ("quraan-class", "Qur'aan Class", QC_NAME), ("ayah-play", APL, AP_AR)]
    options = "".join(f'<option value="{esc(v)}" data-key="{k}">{t}</option>' for k, v, t in opts)
    main = f'''  <main id="main">
    <section class="page-hero">
      <div class="wrap">
        <p class="eyebrow">{A["c_eyebrow"]}</p>
        <h1>{A["c_h1"]}</h1>
        <p class="page-lead">{A["c_lead"]}</p>
        <p class="contact-direct"><a href="mailto:support@kevroapps.com" class="btn btn-secondary">support@kevroapps.com</a></p>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap">
        <div class="split form-split">
          <div class="panel">
            <form action="https://api.web3forms.com/submit" method="POST" class="support-form" data-thanks="/ar/thanks/" data-failed="{esc(A["cf_fail"])}">
              <input type="hidden" name="access_key" value="3707dba5-04f5-4f8a-a95a-b4da69c54841">
              <input type="hidden" name="redirect" value="https://kevroapps.com/ar/thanks/">
              <input type="hidden" name="subject" value="Kevro Apps website message (Arabic page)">
              <input type="text" name="botcheck" style="display:none" tabindex="-1" autocomplete="off">
              <div class="form-grid">
                <label class="field">
                  <span>{A["cf_name"]} <span class="opt">*</span></span>
                  <input type="text" name="name" autocomplete="name" required>
                </label>
                <label class="field">
                  <span>{A["cf_email"]} <span class="opt">*</span></span>
                  <input type="email" name="email" autocomplete="email" dir="ltr" required>
                </label>
                <label class="field full">
                  <span>{A["nav_apps"]}</span>
                  <select name="app">{options}</select>
                </label>
                <label class="field full">
                  <span>{A["cf_msg"]} <span class="opt">*</span></span>
                  <textarea name="message" rows="5" required></textarea>
                </label>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-accent">{A["cf_send"]}</button>
                <p class="form-note">{A["c_resp_v"]}</p>
              </div>
              <p class="form-status" role="status" aria-live="polite"></p>
              <p class="form-note"><a href="/privacy/" hreflang="en">{A["privacy_btn"]}</a> {EN_TAG}</p>
            </form>
          </div>

          <div class="panel plain">
            <h2 class="panel-title">{A["c_h2"]}</h2>
            <p><a href="https://wa.me/97433204084" class="btn btn-secondary" target="_blank" rel="noopener">{A["whatsapp"]}</a></p>
            <p><strong>{A["c_phone"]}</strong><br><a href="tel:+97433204084" dir="ltr">+974&nbsp;3320&nbsp;4084</a></p>
            <p><strong>{A["c_email"]}</strong><br><a href="mailto:support@kevroapps.com">support@kevroapps.com</a></p>
            <p><strong>{A["c_loc"]}</strong><br>{A["c_loc_v"]}</p>
            <p><strong>{A["c_resp"]}</strong><br>{A["c_resp_v"]}</p>
          </div>
        </div>
      </div>
    </section>
  </main>
'''
    return shell("/ar/contact/", "/contact/", A["c_title"], A["c_desc"], "/images/og-image.png", A["c_title"], main, [], current="contact", scripts=CONTACT_JS)


def thanks():
    main = f'''  <main id="main">
    <section class="page-hero centered">
      <div class="wrap">
        <div class="status-mark ok" aria-hidden="true">&#10003;</div>
        <h1>{A["th_msg"]}</h1>
        <div class="link-row">
          <a href="/ar/apps/" class="btn btn-accent">{A["nav_apps"]}</a>
        </div>
      </div>
    </section>
  </main>
'''
    return shell("/ar/thanks/", "/thanks/", A["c_title"], A["c_desc"], "/images/og-image.png", A["c_title"], main, [], current="", noindex=True)

LATIN = re.compile(r'\(Kevro Apps\)|Ayah Play: Quran for Kids|Islamic Coloring for Kids|Puzzle Studio|Ayah Play|Kid Mode|Free Draw|Google Play|Gmail|PDF|[\w.+-]+@[\w-]+\.[\w.]+')


def wrap_latin(html):
    """Every Latin name, email address and store label in the page text is wrapped in <bdi dir="ltr"> so punctuation
    around it stays stable in right to left sentences (Chody's ruling). Attributes, the head and scripts are left alone."""
    head, sep, body = html.partition("<body")
    parts = re.split(r"(<script[\s\S]*?</script>|<[^>]+>)", body)
    for i, part in enumerate(parts):
        if part.startswith("<"):
            continue
        parts[i] = LATIN.sub(lambda m: '<bdi dir="ltr">' + m.group(0) + "</bdi>", part)
    return head + sep + "".join(parts)



CRUMBS = re.compile(r'<nav class="crumbs wrap"[\s\S]*?</nav>')


def add_latin_first_mention(html):
    """The Latin name goes in brackets at the first mention of each Arabic app name in a page's text (Chody's rule, as for the
    studio name). The breadcrumb is skipped, so the bracket lands on the page's own first mention."""
    head, sep, body = html.partition("<body")
    crumbs = CRUMBS.search(body)
    held = None
    if crumbs:
        held = crumbs.group(0)
        body = body.replace(held, "@@CRUMBS@@", 1)
    parts = re.split(r"(<script[\s\S]*?</script>|<[^>]+>)", body)
    for arabic, latin in ((IC_AR, ICL), (AP_AR, APL)):
        for i, part in enumerate(parts):
            if part.startswith("<") or arabic not in part:
                continue
            after = part[part.index(arabic) + len(arabic):] + "".join(parts[i + 1:])
            if after.startswith(' (<bdi dir="ltr">' + latin + "</bdi>)"):
                break   # the string already carries the Latin name at this first mention (Chody's own wording)
            parts[i] = part.replace(arabic, arabic + ' (<bdi dir="ltr">' + latin + "</bdi>)", 1)
            break
    body = "".join(parts)
    if held:
        body = body.replace("@@CRUMBS@@", held, 1)
    return head + sep + body

HEADING = re.compile(r'(<h[123][^>]*>)([\s\S]*?)(</h[123]>)')


def latin_sub(html):
    """In a heading the Latin app name does not share the big type with the Arabic name: it sits under it, smaller, as its
    own left to right island with the brackets inside it (the words and the brackets are unchanged)."""
    head, sep, body = html.partition("<body")

    def fix(m):
        inner = m.group(2)
        for latin in (ICL, APL):
            inner = inner.replace(f' (<bdi dir="ltr">{latin}</bdi>)', f' <span class="app-latin" dir="ltr">(<bdi dir="ltr">{latin}</bdi>)</span>')
        return m.group(1) + inner + m.group(3)
    return head + sep + HEADING.sub(fix, body)


PAGES = {"ar/index.html": home, "ar/apps/index.html": apps, "ar/islamic-coloring/index.html": islamic_coloring,
         "ar/quraan-class/index.html": quraan_class, "ar/ayah-play/index.html": ayah_play, "ar/about/index.html": about, "ar/contact/index.html": contact, "ar/thanks/index.html": thanks}

for path, fn in PAGES.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with io.open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(latin_sub(add_latin_first_mention(wrap_latin(fn()))))
    print("wrote", path)


# ------------------------------------------------------------------ English pages: language link and hreflang
def patch_english():
    import subprocess
    files = subprocess.check_output(["git", "ls-files", "*.html"], text=True).split()
    skip = {"auth/index.html", "kaaba-render.html", "kaaba-test.html"}
    skip |= {f for f in files if f.startswith(("ar/", "demo", "ucmas/", "coloring/"))}
    for f in files:
        if f in skip:
            continue
        s = io.open(f, encoding="utf-8", newline="").read()
        if "css/site.css" not in s:
            continue
        nl = "\r\n" if "\r\n" in s else "\n"
        path = "/" + f[: -len("index.html")] if f.endswith("index.html") else "/" + f
        ar = PAIRS.get(path, "/ar/")
        if 'class="nav-link lang-link"' not in s:
            link = f'<a href="{ar}" class="nav-link lang-link" lang="ar" hreflang="ar" aria-label="Language: Arabic">{A["lang_to_ar"]}</a>'
            m = re.search(r'([ \t]*)(<a href="https://play\.google\.com[^>]*class="btn btn-nav")', s)
            assert m, f
            s = s[: m.start()] + m.group(1) + link + nl + s[m.start():]
        if path in PAIRS and 'hreflang="ar"' not in s.split("</head>")[0]:
            alt = (f'  <link rel="alternate" hreflang="en" href="{SITE}{path}">{nl}  <link rel="alternate" hreflang="ar" href="{SITE}{PAIRS[path]}">{nl}'
                   f'  <link rel="alternate" hreflang="x-default" href="{SITE}{path}">{nl}')
            m = re.search(r'([ \t]*)<link rel="icon" href="/favicon\.ico"', s)
            assert m, f
            s = s[: m.start()] + alt + s[m.start():]
        s = s.replace("css/site.css?v=15", f"css/site.css?v={CSS_V}")
        io.open(f, "w", encoding="utf-8", newline="").write(s)
        print("patched", f)


if "--english" in sys.argv:
    patch_english()
