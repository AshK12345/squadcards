import { supabase, SUPABASE_ENABLED } from '../lib/supabase';
import { DEFAULT_STATS } from '../constants';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ── Create a shareable pack (saves to Supabase when available) ── */
export async function createShareablePack(cards, packName, deviceId) {
  // Only use Supabase if configured and all card IDs are real UUIDs (not temp-)
  const allReal = cards.every(c => UUID_RE.test(String(c.id)));

  if (SUPABASE_ENABLED && deviceId && allReal) {
    const { data, error } = await supabase
      .from('packs')
      .insert({ device_id: deviceId, name: packName, card_ids: cards.map(c => c.id) })
      .select()
      .single();

    if (!error && data) {
      return {
        url:    `${origin()}#pack=${data.id}`,
        packId: data.id,
      };
    }
  }

  // Fallback: encode everything in the URL (no photos)
  return legacyEncode(cards, packName);
}

/* ── Fetch a shared pack by URL token ── */
export async function fetchSharedPack(token) {
  if (UUID_RE.test(token) && SUPABASE_ENABLED) {
    const { data: pack, error } = await supabase
      .from('packs')
      .select('*')
      .eq('id', token)
      .single();

    if (error || !pack) return null;

    const { data: cardRows } = await supabase
      .from('cards')
      .select('*')
      .in('id', pack.card_ids);

    if (!cardRows) return null;

    const ordered = pack.card_ids
      .map(id => cardRows.find(c => c.id === id))
      .filter(Boolean)
      .map(dbToCard);

    return { name: pack.name, cards: ordered };
  }

  // Legacy base64 token
  return legacyDecode(token);
}

/* ── helpers ── */
function origin() {
  return window.location.origin + window.location.pathname;
}

function dbToCard(row) {
  return {
    id:     row.id,
    name:   row.name   || 'Unknown',
    type:   row.type   || '',
    rarity: row.rarity || 'common',
    flavor: row.flavor || '',
    photo:  row.photo_url || null,
    stats:  Array.isArray(row.stats) ? row.stats : DEFAULT_STATS.map(s => ({ ...s })),
  };
}

function legacyEncode(cards, packName) {
  const mini = cards.map(c => ({
    n: c.name, t: c.type, r: c.rarity, f: c.flavor,
    s: c.stats.map(st => st.val),
  }));
  const encoded = btoa(encodeURIComponent(JSON.stringify({ name: packName, cards: mini })));
  return { url: `${origin()}#pack=${encoded}`, packId: null };
}

function legacyDecode(encoded) {
  try {
    const { name, cards } = JSON.parse(decodeURIComponent(atob(encoded)));
    return {
      name,
      cards: cards.map(c => ({
        name: c.n, type: c.t, rarity: c.r, flavor: c.f, photo: null,
        stats: DEFAULT_STATS.map((s, i) => ({ ...s, val: c.s?.[i] ?? s.val })),
        id: Math.random().toString(36).slice(2),
      })),
    };
  } catch { return null; }
}
