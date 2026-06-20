import { fmtBi } from '../constants';

/**
 * Return the first name only when the card title actually looks like a person's
 * name. Phrases like "Did I Stutter" or "NPC Energy" should return '' so the
 * AI receives the full title and doesn't treat the first word as a name.
 *
 * Heuristics:
 *  - 3+ words → almost certainly a phrase, not a name
 *  - Contains a common pronoun/article/verb → phrase
 *  - All-caps single token → acronym/title, not a first name
 */
const PHRASE_SIGNALS = new Set([
  'i','me','my','we','us','you','your','it','its','he','she','they','them',
  'the','a','an','is','are','was','were','be','been','being',
  'did','do','does',"don't","didn't","doesn't",
  'not','no','yes','so','if','but','and','or',
  'to','of','in','on','at','by','for','with','from',
  'will','would','can','could','should','shall','may','might','must','have','has','had',
]);

function firstNameOf(cardTitle) {
  if (!cardTitle?.trim()) return '';
  const words = cardTitle.trim().split(/\s+/);
  if (words.length >= 3) return '';                                         // phrase
  if (words.some(w => PHRASE_SIGNALS.has(w.toLowerCase()))) return '';     // common word
  const first = words[0];
  // Lone all-caps token (e.g. "NPC") → treat as title not a name
  if (first === first.toUpperCase() && first.length > 1) return '';
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

// Format a brief squad context line from other cards in the collection.
// Limited to 4 entries so the AI doesn't over-reference obscure names.
function buildSquadContext(collection = [], currentName = '') {
  const others = collection
    .filter(c => c.name?.toLowerCase() !== currentName?.toLowerCase())
    .slice(-4);
  if (others.length === 0) return '';
  const list = others.map(c => `${c.name}${c.type ? ` (${c.type})` : ''}`).join(', ');
  return `Squad context (use at most 1 reference per suggestion — only if the joke lands without knowing them): ${list}.\n\n`;
}

// Refresh the brainrot theme pool via Claude — called non-blocking every 30 days.
// Returns an array of ~50 brainrot theme strings or null on failure.
export async function refreshBrainrotPool() {
  const prompt = `Generate 50 short brainrot/gen-alpha/internet-culture theme phrases for a trading card app. These will be injected into AI image prompts to add variety.

Each phrase should be 3-6 words, evocative, specific. Include a mix of:
- Classic brainrot (skibidi, sigma, rizz, NPC, ohio, gyatt, fanum, etc.)
- Italian brainrot characters (tralalero tralala, bombardiro crocodilo, cappuccino assassino, tung tung sahur, etc.)
- 2025-2026 trends (chill guy, looksmaxxing, aura farming, glazing, gooning, yapping, etc.)
- Internet archetypes (patrick bateman type, main character disorder, chronically online, etc.)

Output EXACTLY a JSON array of 50 strings and nothing else — no markdown, no explanation:
["phrase 1","phrase 2",...]`;
  try {
    const text = await callClaude(prompt, 1500);
    const cleaned = text.replace(/```json|```/g, '').trim();
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr) && arr.length >= 20) return arr;
  } catch {}
  return null;
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
  const prompt = `Look at this person's photo and write a short "Type / Vibe" label for a Gen Alpha friend trading card.
Use gen alpha slang and brainrot internet lingo. Keep it under 8 words total, use · to separate 2-3 tags.
Examples: "chronically online · main character energy", "sigma mindset · unhinged", "certified rizz lord · ick dealer", "NPC behavior · AFK IRL"
Reply with ONLY the vibe string — no quotes, no explanation.`;
  const raw = await callClaude(prompt, 60, photoSrc);
  return raw.trim().replace(/^["']|["']$/g, '');
}

// Generate a fully AI-created brainrot opponent card for the AI trade feature.
// Rarity is intentionally NOT included — it's assigned randomly client-side
// to prevent any rarity-matching exploit where trading a rare guarantees a rare back.
export async function generateAIOpponentCard() {
  const prompt = `Generate a completely unhinged Gen Alpha / brainrot NPC trading card character. Maximum cringe and silliness.

Output EXACTLY this JSON and nothing else — no markdown, no preamble:
{"name":"silly 2-4 word gen alpha name","type":"short noun label","flavor":"cringe 1-2 sentence flavor under 25 words","rizz":0,"aura":0,"clout":0,"chuddness":0,"emoji":"3-4 expressive emojis"}

Rules:
- type: 2-4 words MAX, noun-forward, punchy — like "NPC sigma overlord", "chaos goblin lord", "rizz demon activated", "skibidi villain arc". NO long sentences.
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

export async function suggestFlavor(name, type, rarity, stats, photoSrc = null, collection = [], memory = null, tradePartners = []) {
  const statsStr = stats
    .map(s => `${s.name}: ${s.bipolar ? fmtBi(s.val) : s.val}`)
    .join(', ');
  const photoLine = photoSrc
    ? ' A photo of this person is attached — let it inspire the flavor text.'
    : '';
  const squadContext = buildSquadContext(collection, name);
  const partnersLine = tradePartners.length > 0
    ? `People this person has actually traded cards with (these names are fair game — both parties will get the joke): ${tradePartners.slice(0, 5).join(', ')}.\n\n`
    : '';
  const memoryLine = memory?.flavors?.length > 0
    ? `Previously approved flavor texts that perfectly nailed this person's vibe — match this humor and tone:\n${memory.flavors.map(f => `  • "${f}"`).join('\n')}\n\n`
    : '';
  const firstName = firstNameOf(name);
  const nameNote = firstName && firstName.toLowerCase() !== name.trim().toLowerCase()
    ? ` Refer to them as "${firstName}" (first name only), not the full card title.`
    : '';
  const prompt = `TCG card flavor text for a friend. Each suggestion: 1–2 sentences, strictly under 25 words. Light roast, not mean.${nameNote}${photoLine}\n\n${squadContext}${partnersLine}${memoryLine}Rarity: ${rarity}. Person: "${name}", Vibe: "${type}", Stats: ${statsStr}.\n\nIMPORTANT: Most suggestions should be self-contained and funny without knowing anyone. At most 1–2 suggestions may reference a name from squad/partners context.\n\nOutput EXACTLY this and nothing else — no explanation, no markdown, no preamble:\n["suggestion 1","suggestion 2","suggestion 3","suggestion 4"]`;
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
