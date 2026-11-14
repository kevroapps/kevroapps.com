"""Writes sitemap.xml: every public page, a lastmod from git history, and hreflang alternates for each English and Arabic pair.

Run from the repository root:  python tools/build_sitemap.py
The Arabic pairs are the same ones the pages link to with hreflang. worker/test/pages.test.js checks the file against the pages.
"""
import subprocess
from pathlib import Path

SITE = "https://kevroapps.com"
# (English path, Arabic path or None), in the order they appear in the file.
PAGES = [
    ("/", "/ar/"), ("/apps/", "/ar/apps/"), ("/about/", "/ar/about/"), ("/services/", None), ("/contact/", "/ar/contact/"),
    ("/privacy/", None), ("/quraan-class/privacy/", None), ("/quraan-class/delete-account/", None), ("/ayah-play/privacy/", None),
    ("/islamic-coloring/", "/ar/islamic-coloring/"), ("/quraan-class/", "/ar/quraan-class/"), ("/ayah-play/", "/ar/ayah-play/"),
]


def file_for(path):
    return Path(path.strip("/") or ".") / "index.html"


def lastmod(*paths):
    dates = []
    for p in paths:
        out = subprocess.run(["git", "log", "-1", "--format=%as", "--", str(file_for(p))], capture_output=True, text=True).stdout.strip()
        if out:
            dates.append(out)
    return max(dates)


def entry(path, pair, alternates):
    lines = ["  <url>", f"    <loc>{SITE}{path}</loc>", f"    <lastmod>{lastmod(path, *([pair] if pair else []))}</lastmod>"]
    if alternates:
        for lang, href in alternates:
            lines.append(f'    <xhtml:link rel="alternate" hreflang="{lang}" href="{SITE}{href}"/>')
    lines.append("  </url>")
    return "\n".join(lines)


def main():
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for en, ar in PAGES:
        alt = [("en", en), ("ar", ar), ("x-default", en)] if ar else None
        out.append(entry(en, ar, alt))
        if ar:
            out.append(entry(ar, en, alt))
    out.append("</urlset>")
    Path("sitemap.xml").write_text("\n".join(out) + "\n", encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
