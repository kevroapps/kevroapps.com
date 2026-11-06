// Per-visitor limits without storing anything of ours.
// 1. If the Cloudflare rate limiting binding (RATE_LIMITER) is attached, it decides.
// 2. A small in-memory window per Worker instance backs it up and covers the stricter
//    limit on the email handoff. Instances come and go, so this is a brake, not a wall;
//    the Anthropic spend limit set in the Console is the hard cap (see the setup guide).

const windows = new Map();

export function resetLimits() {
  windows.clear();
}

function inMemory(key, max, perMs, now) {
  const hits = (windows.get(key) || []).filter((t) => now - t < perMs);
  if (hits.length >= max) {
    windows.set(key, hits);
    return false;
  }
  hits.push(now);
  windows.set(key, hits);
  if (windows.size > 5000) {
    for (const [k, v] of windows) if (!v.length || now - v[v.length - 1] > perMs) windows.delete(k);
  }
  return true;
}

export async function allow(env, kind, ip, now = Date.now()) {
  const id = `${kind}:${ip || 'unknown'}`;
  const cfg = kind === 'handoff' ? { max: 3, perMs: 3600_000 } : { max: 20, perMs: 60_000 };
  if (!inMemory(id, cfg.max, cfg.perMs, now)) return false;
  if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === 'function') {
    try {
      const { success } = await env.RATE_LIMITER.limit({ key: id });
      if (!success) return false;
    } catch {
      // A broken limiter must not take the assistant down; the in-memory brake still applied.
    }
  }
  return true;
}
