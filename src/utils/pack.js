// Rarity weights — matches the pull rates shown in the UI
const WEIGHTS = { common: 70, uncommon: 20, rare: 7, legendary: 2.5, secret: 0.5 };

/**
 * Probabilistically draw `count` cards from a pool with replacement.
 * Rarer cards have lower weight so they're harder to pull.
 * Duplicates are intentional — just like real trading card packs.
 */
export function drawFromPool(pool, count = 5) {
  if (!pool.length) return [];
  const totalWeight = pool.reduce((sum, c) => sum + (WEIGHTS[c.rarity] ?? 70), 0);
  const drawn = [];

  for (let i = 0; i < count; i++) {
    let roll = Math.random() * totalWeight;
    let chosen = pool.length - 1;

    for (let j = 0; j < pool.length; j++) {
      roll -= WEIGHTS[pool[j].rarity] ?? 70;
      if (roll <= 0) { chosen = j; break; }
    }

    drawn.push(pool[chosen]);
  }

  return drawn;
}
