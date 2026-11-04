# Website assistant: setup steps for Captain

The assistant is a small chat box on kevroapps.com. It answers questions about the apps and, when it cannot, takes a name, an email and a question and sends them to support@kevroapps.com. The website stays plain HTML. The only new moving part is one Cloudflare Worker (`worker/`) that holds the keys, so no key ever sits on the site or in this repository.

Until the keys below are added, the Worker answers every request with "not configured" and the chat box shows a plain line pointing to support@kevroapps.com. Nothing breaks.

**Rule: paste keys only into the Cloudflare dashboard yourself.** Do not type them into any chat with an agent, a file, or a terminal that an agent can see.

## What it costs

Cloudflare Workers free plan and Resend free plan cover it. The Claude API is pay as you go: at a few hundred chats a month it is a few dollars. Set the monthly limit in step 1 so it can never run away.

## Step 1. Anthropic key (the answers)

1. Sign in at console.anthropic.com. If the account has no billing yet, add a card (your own sign-in and card, entered by you).
2. Settings, Limits: set a **monthly spend limit** (for example 10 USD). This is the hard cap; the Worker has no database to count with.
3. API keys, Create key, name it `kevro-chat`. Copy it once. Keep it for step 4.

## Step 2. Resend (the email to support)

Mail for kevroapps.com stays at Namecheap Private Email. Resend sends only from a **sub-domain**, `send.kevroapps.com`, so the root mail records are not touched.

1. Sign up at resend.com (free plan).
2. Domains, Add domain: `send.kevroapps.com`. Resend shows a few DNS records (SPF, DKIM, and sometimes a return-path record).
3. In Namecheap: Domain List, kevroapps.com, Manage, Advanced DNS. Add exactly the records Resend shows, with the host names it gives (they end in `.send`). **Do not edit or delete the existing MX, SPF or DKIM records on the root domain.**
4. Back in Resend press Verify. Verification can take from a few minutes to a few hours.
5. API Keys, Create API key, name `kevro-chat`, permission "Sending access", domain `send.kevroapps.com`. Copy it once. Keep it for step 4.

## Step 3. Cloudflare (the Worker)

1. Create a free account at cloudflare.com (no domain needs to move; DNS stays at Namecheap).
2. On a computer with Node installed, in the `worker/` folder of this repository:
   ```
   npm install
   npx wrangler login
   npx wrangler deploy
   ```
   `wrangler login` opens a browser to sign in to Cloudflare. The deploy prints the Worker address, which looks like `https://kevro-chat.<your-name>.workers.dev`. Send that address to Webby; it goes into the chat box.

## Step 4. Add the two keys (dashboard only)

Cloudflare dashboard, Workers & Pages, `kevro-chat`, Settings, Variables and Secrets, Add. Add two values, each with type **Secret**:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | the key from step 1 |
| `RESEND_API_KEY` | the key from step 2 |

Press Deploy when the dashboard asks.

## Step 5. Check it works

1. Open `https://kevro-chat.<your-name>.workers.dev/health` in a browser. You should see `{"ok":true,"enabled":true,"chat":true,"email":true}`. `chat` or `email` showing `false` means that key is missing. The page never shows a key.
2. Ask the chat box on the site a question, then ask something it cannot know ("Can I get a refund?"). It should offer the email form. Submit the form with your own address and check that the email arrives at support@kevroapps.com and that Reply goes to the address you typed.

## Switching it off, and changing keys

- **Kill switch:** in the same Variables and Secrets page set `CHAT_ENABLED` to `false` (it is a plain variable, already listed). The chat box then shows the plain support email line within a minute. Set it back to `true` to turn it on.
- **Rotate a key:** make a new key in Anthropic or Resend, replace the secret in Cloudflare, then delete the old key at the source.
- **Spend:** Anthropic Console, Usage. The monthly limit from step 1 stops the API at the cap.

## What is and is not stored

- The Worker stores nothing: no database, no logs of what visitors write.
- A visitor's message goes to the Claude API to get an answer, and an email handoff goes through Resend. Each of those services applies its own retention rules. The chat box tells visitors this and tells them not to share a child's name or any private details.
- Cloudflare keeps its usual request counts and the rate limit works on the visitor's address without saving it.

## Open points before it goes live

1. Chody reviews the Arabic of the chat box and the rules in `worker/src/prompt.js`.
2. VC checks the facts in `docs/chat_knowledge/` (each file ends with its source).
3. The widget is added to the pages only after the modernisation PR is merged.
4. Decide whether the site privacy page gets one sentence about the assistant (suggested wording will be in the widget PR).
