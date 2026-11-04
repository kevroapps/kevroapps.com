# kevro-chat Worker

Cloudflare Worker behind the kevroapps.com chat assistant. Plain JavaScript modules, one dependency (`@anthropic-ai/sdk`), no framework.

| Endpoint | What it does |
|---|---|
| `POST /chat` | `{messages:[{role,content}], lang}` returns `{reply, handoff}`. `handoff: true` asks the page to show the email form. |
| `POST /handoff` | `{name, email, question, lang, page, transcript?}` emails support@kevroapps.com through Resend, Reply-To set to the visitor. |
| `GET /health` | `{ok, enabled, chat, email}`. No secrets. |

Failures return `{fallback: true, code}` with a 4xx or 5xx status. The page then shows its own reviewed wording and the plain support email. The Worker never sends human-readable error text.

## Behaviour that is tested

CORS only for the site origins; kill switch `CHAT_ENABLED=false`; not configured means fallback; rate limits (20 chats a minute, 3 handoffs an hour per visitor, plus Cloudflare's binding); input limits; honeypot field `website`; header injection stripped; the model request uses `claude-opus-5-5`, low effort, a cached system prompt and server side fallbacks; the model's handoff marker is never shown.

## Work on it

```
npm install
npm run build:knowledge   # after editing docs/chat_knowledge/*.md
npm test
npm run dev               # needs a .dev.vars file with the two keys, never committed
```

Deploy and key steps are in `../docs/chat_agent_setup.md`. Keys are only ever added in the Cloudflare dashboard.
