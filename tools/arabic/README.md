# Arabic pages

The Arabic site (`/ar/`) is generated from one text file so every page uses the same reviewed wording.

- `ar_content.py`: all Arabic text, English beside each string. Reviewed by Chody (7 Nov 2026). Change wording here, not in the generated pages.
- `chody_corrections_2026-11-07.json`: the 74 corrections Chody listed, kept so a test can prove they are still byte for byte in the text.
- `build_ar.py`: builds `ar/*/index.html`. Run from the repository root with Python 3:
  - `python tools/arabic/build_ar.py` writes the seven Arabic pages;
  - `python tools/arabic/build_ar.py --english` also adds the language link and the hreflang links to the English pages (safe to run again).

Rules the pages follow: studio name كيفرو آبس with (Kevro Apps) at its first body mention; Islamic Coloring for Kids and Ayah Play stay in Latin letters; حلقة القرآن stays Arabic; every Latin name, email address and Google Play label sits in `<bdi dir="ltr">`; no dashes as punctuation, no emoji. After editing, run the tests in `worker/` (`node --test`) and have Chody read any new Arabic.
