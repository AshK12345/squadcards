import { fmtBi } from '../constants';

// Build a Claude message content array, optionally including an image
function buildContent(prompt, photoSrc) {
  if (!photoSrc) return prompt;

  // photoSrc is either a data URL (data:image/...;base64,...) or a remote URL
  if (photoSrc.startsWith('data:')) {
    const [header, data] = photoSrc.split(',');
    const mediaType = header.match(/data:(image\/[^;]+)/)?.[1] ?? 'image/jpeg';
    return [
      {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data },
      },
      { type: 'text', text: prompt },
    ];
  }

  // Remote URL (Supabase public URL after upload)
  return [
    {
      type: 'image',
      source: { type: 'url', url: photoSrc },
    },
    { type: 'text', text: prompt },
  ];
}

async function callClaude(prompt, maxTokens = 500, photoSrc = null) {
  const localKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const content = buildContent(prompt, photoSrc);
  let resp;

  if (localKey) {
    // Local dev: call Anthropic directly
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': localKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content }],
      }),
    });
  } else {
    // Production: go through the server proxy at /api/ai
    resp = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content }],
      }),
    });
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${resp.status}`);
  }
  const data = await resp.json();
  return data.content.map(i => i.text || '').join('');
}

export async function evaluateStats(name, type, photoSrc = null) {
  const photoLine = photoSrc
    ? 'An uploaded photo of this person is also attached — use visual cues (expression, style, energy) to influence the stats.\n\n'
    : '';
  const prompt = `Assign TCG card stats for this person. Be funny, opinionated, bold — avoid clustering around 500. Use extremes.\n\n${photoLine}Person: "${name}" — Vibe: "${type}"\n\n- rizz: social magnetism/smoothness. RANGE −999 to 999. Negative = genuinely awkward.\n- aura: general presence/vibe/energy. RANGE −999 to 999. Negative = bad vibes / cursed energy.\n- clout: social status and influence. RANGE 0 to 999.\n- chuddness: nerd/obsessive/hyperfixation energy. RANGE 0 to 999.\n\nRespond ONLY with JSON, no markdown: {"rizz":number,"aura":number,"clout":number,"chuddness":number}`;
  const text = await callClaude(prompt, 200, photoSrc);
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

export async function suggestFlavor(name, type, rarity, stats, photoSrc = null) {
  const statsStr = stats
    .map(s => `${s.name}: ${s.bipolar ? fmtBi(s.val) : s.val}`)
    .join(', ');
  const photoLine = photoSrc
    ? ' A photo of this person is attached — let it inspire the flavor text.'
    : '';
  const prompt = `TCG card flavor text for a friend. 2 sentences max, under 30 words. Light roast, not mean.${photoLine} Rarity: ${rarity}. Person: "${name}", Vibe: "${type}", Stats: ${statsStr}. Return ONLY a JSON array of 4 strings, no markdown.`;
  const text = await callClaude(prompt, 500, photoSrc);
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    return [
      'Defies all known logic.',
      'Energy so strange it bends light.',
      'Once showed up and nobody asked.',
      'The reason we check our surroundings.',
    ];
  }
}
