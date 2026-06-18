const KEY = 'sc-ai-memory';
const PARTNERS_KEY = 'sc-trade-partners';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function save(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); }
  catch {}
}

/** Retrieve stored memory for a person by name (case-insensitive). */
export function getMemory(name) {
  if (!name) return null;
  return load()[name.toLowerCase()] || null;
}

/**
 * Record a flavor text the user actually selected.
 * Keeps the 6 most recent unique picks per person.
 */
export function saveFlavor(name, text) {
  if (!name || !text) return;
  const all = load();
  const key = name.toLowerCase();
  const entry = all[key] || { flavors: [], stats: null };
  entry.flavors = [...new Set([text, ...entry.flavors])].slice(0, 6);
  all[key] = entry;
  save(all);
}

/**
 * Record the final stats when a card is saved.
 * Stored as a plain { rizz, aura, clout, chuddness } object.
 */
export function saveStats(name, stats) {
  if (!name || !stats) return;
  const all = load();
  const key = name.toLowerCase();
  const statMap = {};
  stats.forEach(s => { statMap[s.key] = s.val; });
  all[key] = { flavors: [], ...(all[key] || {}), stats: statMap };
  save(all);
}

/** Return the list of card names the user has actually traded with. */
export function getTradePartners() {
  try { return JSON.parse(localStorage.getItem(PARTNERS_KEY) || '[]'); }
  catch { return []; }
}

/**
 * Record the name from a card received in a trade (the partner's card).
 * Keeps the 12 most recent unique names.
 */
export function saveTradePartner(cardName) {
  if (!cardName) return;
  const current = getTradePartners();
  const updated = [...new Set([cardName, ...current])].slice(0, 12);
  try { localStorage.setItem(PARTNERS_KEY, JSON.stringify(updated)); } catch {}
}
