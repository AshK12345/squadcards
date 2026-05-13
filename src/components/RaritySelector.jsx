import { RARITY_PULL_RATES, RARITY_PULL_COLORS } from '../constants';

const RARITIES = ['common', 'uncommon', 'rare', 'legendary', 'secret'];
const LABELS = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
  secret: 'Secret ✦',
};

export default function RaritySelector({ selected, onChange }) {
  return (
    <div className="rarity-selector">
      {RARITIES.map((r) => (
        <button
          key={r}
          className={`rarity-btn ${selected === r ? 'selected' : ''}`}
          data-r={r}
          onClick={() => onChange(r)}
          type="button"
        >
          {LABELS[r]}
          <br />
          <span
            className="pull-badge"
            style={{ color: RARITY_PULL_COLORS[r] }}
          >
            {RARITY_PULL_RATES[r]}
          </span>
        </button>
      ))}
    </div>
  );
}
