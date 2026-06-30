// Vercel serverless function — proxies Pollinations image generation.
// Fetching from the server avoids browser-side rate limiting (Pollinations
// throttles consecutive requests from the same browser IP).
// Returns the image as a base64 data-URL so it can be stored in Supabase.
export const config = { maxDuration: 45 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, seed } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed ?? Math.floor(Math.random() * 999999)}&model=flux`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'SlopCards/1.0' },
      signal: AbortSignal.timeout(40000),
    });

    if (!resp.ok) {
      return res.status(502).json({ error: `Pollinations returned ${resp.status}` });
    }

    const buffer = await resp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = resp.headers.get('content-type') || 'image/jpeg';

    return res.status(200).json({ dataUrl: `data:${contentType};base64,${base64}` });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Image generation failed' });
  }
}
