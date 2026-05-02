const RATE_LIMIT_SECONDS = 120; // 2-minute cooldown per IP

async function loadSkill(req) {
  // Derive the base URL from the incoming request so this works on any Vercel
  // deployment (preview, production, or local dev via `vercel dev`).
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host  = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:3000';
  const skillUrl = `${proto}://${host}/SKILL.md`;

  const res = await fetch(skillUrl);
  if (!res.ok) throw new Error(`Failed to load SKILL.md: ${res.status} ${res.statusText}`);
  return res.text();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  // ── Rate limiting via Vercel KV — fails open if KV is unavailable ────────────
  const kvUrl   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken) {
    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const rateLimitKey = `rl:${clientIp}`;

    try {
      const getRes = await fetch(`${kvUrl}/get/${rateLimitKey}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const getData = await getRes.json();

      if (getData.result !== null) {
        const ttlRes = await fetch(`${kvUrl}/ttl/${rateLimitKey}`, {
          headers: { Authorization: `Bearer ${kvToken}` },
        });
        const ttlData = await ttlRes.json();
        const secondsLeft = ttlData.result > 0 ? ttlData.result : RATE_LIMIT_SECONDS;
        return res.status(429).json({
          error: `Rate limit active. Please wait ${secondsLeft} second${secondsLeft !== 1 ? 's' : ''} before generating again.`,
        });
      }

      await fetch(`${kvUrl}/set/${rateLimitKey}/1/ex/${RATE_LIMIT_SECONDS}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}` },
      });
    } catch {
      // KV unavailable — fail open, let the request through
    }
  }

  // ── Load SKILL.md and call Anthropic ─────────────────────────────────────────
  try {
    const system = await loadSkill(req);
    const { system: _drop, ...bodyWithoutSystem } = req.body; // strip any client-sent system

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ ...bodyWithoutSystem, system }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
