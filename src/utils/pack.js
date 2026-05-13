// Rarity weights — matches the pull rates shown in the UI
const WEIGHTS = { common: 70, uncommon: 20, rare: 7, legendary: 2.5, secret: 0.5 };

/**
 * Probabilistically draw `count` cards from a pool without replacement.
 * Rarer cards have lower weight so they're harder to pull.
 */
export function drawFromPool(pool, count = 5) {
  const remaining = [...pool];
  const drawn = [];
  const n = Math.min(count, remaining.length);

  for (let i = 0; i < n; i++) {
    const totalWeight = remaining.reduce((sum, c) => sum + (WEIGHTS[c.rarity] ?? 70), 0);
    let roll = Math.random() * totalWeight;
    let chosen = remaining.length - 1;

    for (let j = 0; j < remaining.length; j++) {
      roll -= WEIGHTS[remaining[j].rarity] ?? 70;
      if (roll <= 0) { chosen = j; break; }
    }

    drawn.push(remaining[chosen]);
    remaining.splice(chosen, 1);
  }

  return drawn;
}
