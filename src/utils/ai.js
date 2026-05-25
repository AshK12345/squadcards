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
  const prompt = `Assign TCG card stats for this person. Be funny, opinionated, bold — avoid clustering around 500. Use extremes.\n\n${photoLine}${squadContext}${memoryLine}Person: "${name}"${nameNote} — Vibe: "${type}"\n\n- rizz: social magnetism/smoothness. RANGE -999 to 999. Negative = genuinely awkward.\n- aura: general presence/vibe/energy. RANGE -999 to 999. Negative = bad vibes / cursed energy.\n- clout: social status and influence. RANGE 0 to 999.\n- chuddness: nerd/obsessive/hyperfixation energy. RANGE 0 to 999.\n\nOutput EXACTLY this JSON and nothing else — no markdown, no explanation:\n{"rizz":number,"aura":number,"clout":number,"chuddness":number}`;
  const text = await callClaude(prompt, 400, photoSrc);
  // Normalize Unicode minus/dash chars that Claude sometimes echoes back
  const cleaned = text.replace(/```json|```/g, '').replace(/[\u2212\u2013\u2014]/g, '-').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0].replace(/[\u2212\u2013\u2014]/g, '-'));
    throw new Error('Could not parse stats JSON from AI response');
  }
}

// Analyse an uploaded photo and return a brainrot Type/Vibe string
export async function analyzePhotoVibe(photoSrc) {
  const prompt = `Look at this photo and write a "Type / Vibe" label for a Gen Alpha friend trading card. Go unhinged with the gen alpha / brainrot slang.
Use terms like: no cap, lowkey, NPC, sigma, rizz, slay, understood the assignment, fr fr, main character, mid, ick, chronically online, AFK IRL, based, delulu, giving _____, ate and left no crumbs, etc.
Be specific to what you see — their expression, energy, style.
Under 8 words total, 2-3 punchy tags separated by ·.
Return ONLY the vibe string — no quotes, no explanation, nothing else.`;
  const raw = await callClaude(prompt, 60, photoSrc);
  return raw.trim().replace(/^["']|["']$/g, '');
}

// Generate a fully AI-created brainrot opponent card for the AI trade feature
export async function generateAIOpponentCard() {
  const prompt = `Generate a completely unhinged Gen Alpha / brainrot NPC trading card character. Maximum cringe and silliness.

Output EXACTLY this JSON and nothing else — no markdown, no preamble:
{"name":"silly 2-4 word gen alpha name","type":"brainrot vibe tags under 8 words","flavor":"cringe 1-2 sentence flavor under 25 words","rarity":"common","rizz":0,"aura":0,"clout":0,"chuddness":0,"emoji":"3-4 expressive emojis"}

Rules:
- rarity must be exactly one of: "common", "uncommon", "rare"
- rizz and aura: range -999 to 999, use wild extremes
- clout and chuddness: range 0 to 999, use wild extremes
- emoji: 3-4 emojis that capture this character's unhinged vibe`;
  const text = await callClaude(prompt, 400);
  const cleaned = text.replace(/```json|```/g, '').replace(/[\u2212\u2013\u2014]/g, '-').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0].replace(/[\u2212\u2013\u2014]/g, '-'));
    throw new Error('Could not parse AI opponent card');
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
  const prompt = `TCG card flavor text for a real person. Max brainrot, max gen alpha energy — friend roast vibes, not mean.${nameNote}${photoLine}\n\n${squadContext}${memoryLine}Rarity: ${rarity}. Person: "${name}", Vibe: "${type}", Stats: ${statsStr}.\n\nUse gen alpha slang: no cap, lowkey, slay, NPC behavior, sigma, rizz, understood the assignment, fr fr, bussin, mid, ick, delulu, ate, giving _____, etc. Be specific to their vibe and stats. Each suggestion strictly under 25 words.\n\nOutput EXACTLY this and nothing else — no explanation, no markdown, no preamble:\n["suggestion 1","suggestion 2","suggestion 3","suggestion 4"]`;
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
