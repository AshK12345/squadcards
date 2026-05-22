import { fmtBi } from '../constants';

/**
 * Extract the person's first name from a card title so the AI refers to
 * them naturally. e.g. "jack being dumb" → "Jack", "Jake Peralta" → "Jake".
 */
function firstNameOf(cardTitle) {
  if (!cardTitle?.trim()) return '';
  const first = cardTitle.trim().split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

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

  // Abort if the request hangs — prevents loading state getting permanently stuck
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  let resp;
  try {
    if (localKey) {
      // Local dev: call Anthropic directly
      resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
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
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content }],
        }),
      });
    }
  } finally {
    clearTimeout(timer);
  }

  if (!resp) throw new Error('Request aborted or never sent');
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${resp.status}`);
  }
  const data = await resp.json();
  return data.content.map(i => i.text || '').join('');
}

// Format a brief squad context line from other cards in the collection
function buildSquadContext(collection = [], currentName = '') {
  const others = collection
    .filter(c => c.name?.toLowerCase() !== currentName?.toLowerCase())
    .slice(-10);
  if (others.length === 0) return '';
  const list = others.map(c => `${c.name}${c.type ? ` (${c.type})` : ''}`).join(', ');
  return `Other people already in this squad: ${list}. Feel free to reference dynamics, rivalries, or connections between squad members.\n\n`;
}

export async function evaluateStats(name, type, photoSrc = null, collection = [], memory = null) {
  const photoLine = photoSrc
    ? 'An uploaded photo of this person is also attached — use visual cues (expression, style, energy) to influence the stats.\n\n'
    : '';
  const squadContext = buildSquadContext(collection, name);
  const memoryLine = memory?.stats
    ? `Previously established stats for ${name}: rizz ${memory.stats.rizz}, aura ${memory.stats.aura}, clout ${memory.stats.clout}, chuddness ${memory.stats.chuddness}. Maintain this character unless there's a clear reason to evolve them.\n\n`
    : '';
  const firstName = firstNameOf(name);
  const nameNote = firstName && firstName.toLowerCase() !== name.trim().toLowerCase()
    ? ` (refer to them as "${firstName}", not the full title)`
    : '';
  const prompt = `Assign TCG card stats for this person. Be funny, opinionated, bold — avoid clustering around 500. Use extremes.\n\n${photoLine}${squadContext}${memoryLine}Person: "${name}"${nameNote} — Vibe: "${type}"\n\n- rizz: social magnetism/smoothness. RANGE −999 to 999. Negative = genuinely awkward.\n- aura: general presence/vibe/energy. RANGE −999 to 999. Negative = bad vibes / cursed energy.\n- clout: social status and influence. RANGE 0 to 999.\n- chuddness: nerd/obsessive/hyperfixation energy. RANGE 0 to 999.\n\nRespond ONLY with JSON, no markdown: {"rizz":number,"aura":number,"clout":number,"chuddness":number}`;
  const text = await callClaude(prompt, 200, photoSrc);
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Could not parse stats JSON from AI response');
  }
}

export async function suggestFlavor(name, type, rarity, stats, photoSrc = null, collection = [], memory = null) {
  const statsStr = stats
    .map(s => `${s.name}: ${s.bipolar ? fmtBi(s.val) : s.val}`)
    .join(', ');
  const photoLine = photoSrc
    ? ' A photo of this person is attached — let it inspire the flavor text.'
    : '';
  const squadContext = buildSquadContext(collection, name);
  const memoryLine = memory?.flavors?.length > 0
    ? `Previously approved flavor texts that perfectly nailed this person's vibe — match this humor and tone:\n${memory.flavors.map(f => `  • "${f}"`).join('\n')}\n\n`
    : '';
  const firstName = firstNameOf(name);
  const nameNote = firstName && firstName.toLowerCase() !== name.trim().toLowerCase()
    ? ` Refer to them as "${firstName}" (first name only), not the full card title.`
    : '';
  const prompt = `TCG card flavor text for a friend. Each suggestion: 1–2 sentences, strictly under 25 words. Light roast, not mean.${nameNote}${photoLine}\n\n${squadContext}${memoryLine}Rarity: ${rarity}. Person: "${name}", Vibe: "${type}", Stats: ${statsStr}.\n\nOutput EXACTLY this and nothing else — no explanation, no markdown, no preamble:\n["suggestion 1","suggestion 2","suggestion 3","suggestion 4"]`;
  const text = await callClaude(prompt, 800, photoSrc);
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
