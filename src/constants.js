export const HP_MAP = {
  common: '100 HP',
  uncommon: '150 HP',
  rare: '220 HP',
  legendary: '350 HP',
  secret: '∞ HP',
};

export const PIPS = { common: 1, uncommon: 2, rare: 3, legendary: 4, secret: 5 };

export const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, legendary: 3, secret: 4 };

export const MIN_PACK = 5;

export const RARITY_PULL_RATES = {
  common: '70%',
  uncommon: '20%',
  rare: '7%',
  legendary: '2.5%',
  secret: '0.5%',
};

export const RARITY_PULL_COLORS = {
  common: '#ca9a00',
  uncommon: '#2a7a2a',
  rare: '#1a3aaa',
  legendary: '#8a6000',
  secret: '#6a006a',
};

export const DEFAULT_STATS = [
  { key: 'rizz',      emoji: '✨', name: 'Rizz',      val: 0,   bipolar: true  },
  { key: 'aura',      emoji: '🌀', name: 'Aura',      val: 0,   bipolar: true  },
  { key: 'clout',     emoji: '⚡', name: 'Clout',     val: 500, bipolar: false },
  { key: 'chuddness', emoji: '🧠', name: 'Chuddness', val: 500, bipolar: false },
];

export function fmtBi(v) {
  return (v > 0 ? '+' : '') + v;
}
