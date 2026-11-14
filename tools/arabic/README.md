# Arabic pages

The Arabic site (`/ar/`) is generated from one text file so every page uses the same reviewed wording.

- `ar_content.py`: all Arabic text, English beside each string. Reviewed by Chody (7 Nov 2026). Change wording here, not in the generated pages.
- `chody_corrections_2026-11-07.json`: the 74 corrections Chody listed, kept so a test can prove they are still byte for byte in the text.
- `build_ar.py`: builds `ar/*/index.html`. Run from the repository root with Python 3:
  - `python tools/arabic/build_ar.py` writes the seven Arabic pages and the Arabic thank you page (`ar/thanks/`, not in the sitemap);
  - `python tools/arabic/build_ar.py --english` also adds the language link and the hreflang links to the English pages (safe to run again).

Rules the pages follow: studio name كيفرو آبس with (Kevro Apps) at its first body mention; Islamic Coloring for Kids and Ayah Play stay in Latin letters; حلقة القرآن stays Arabic; every Latin name, email address and Google Play label sits in `<bdi dir="ltr">`; no dashes as punctuation, no emoji. After editing, run the tests in `worker/` (`node --test`) and have Chody read any new Arabic.

Review pass of 14 Nov 2026 (what the generator now does, so new text keeps to it):
- App names: in a heading the Latin name is not set in the big type. `latin_sub` puts it under the Arabic name as a smaller left to right line (`<span class="app-latin" dir="ltr">(<bdi>...</bdi>)</span>`); the words and brackets are unchanged.
- App names now follow the approved Arabic names (تلوين إسلامي للأطفال, آيات للصغار, حلقة القرآن); older notes saying Latin only are out of date.
- Links to English-only pages carry the small tag `EN_TAG` ("English", the approved language-link word). Qur'aan Class policy and deletion links go to their Arabic sections (`#ar`).
- The header button is per page (`cta=` in `shell`): store on the coloring page, a question on Ayah Play, none elsewhere.
- The contact form and thank you page reuse only words the chat box already carries (`cf_*`, `th_msg`); `worker/test/arpages.test.js` checks they equal `js/chat.js`. New wording waits for Chody.
- 14 Nov 2026 (Chody's wording review): the contact form, thank you page, destination notes ("(بالإنجليزية)" inside the link, "الخطوات بالإنجليزية" under the tester button), screenshot captions and the chat and viewer words are approved. `chody_wording_2026-11-14.json` holds them and `worker/test/arpages.test.js` keeps them byte for byte (the chat and viewer words are checked in `js/chat.js` and `js/gallery.js`). The contact form no longer borrows chat wording except the labels الاسم and البريد الإلكتروني.
- `c_form_note` is retired (the Arabic contact page now has a form). It stays in `chody_corrections_2026-11-07.json` as history; the test names it in `RETIRED`, checks it is no longer an active row, and keeps every other correction protected.
