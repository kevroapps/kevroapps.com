# Chat knowledge

What the website assistant knows. One file per app, plus one for the studio. The assistant answers only from these files and the rules in `worker/src/prompt.js`.

- Edit a file here, then run `npm run build:knowledge` inside `worker/` to regenerate `worker/src/knowledge.js`. A test fails if the two are out of step.
- Each file ends with a "Source" line. Facts come from those sources, never from memory. VC checks the facts before the Worker is deployed.
- Never put prices, release dates or version numbers in these files. The assistant is told to say it does not know and to offer the support email.
- Keep the copy rules: no dashes as punctuation, "Qur'aan" and "Allaah" spellings, English in English (memorisation, competition), no crescent used as a symbol of Islam.
