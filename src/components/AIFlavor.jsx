import { useState } from 'react';
import { suggestFlavor } from '../utils/ai';

export default function AIFlavor({ name, type, rarity, stats, photoSrc, onSelect }) {
  const [loading, setLoading] = useState(false);
  const [chips, setChips] = useState([]);
  const [error, setError] = useState(false);

  const handleSuggest = async () => {
    setLoading(true);
    setChips([]);
    setError(false);
    try {
      const suggestions = await suggestFlavor(name || 'your friend', type || '', rarity, stats, photoSrc);
      setChips(suggestions);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 7 }}>
        <button className="btn btn-ai" onClick={handleSuggest} disabled={loading} type="button">
          ✦ AI Suggest
        </button>
        {loading && (
          <span className="ai-loading">
            Cooking
            <span className="dots">
              <span />
              <span />
              <span />
            </span>
          </span>
        )}
      </div>

      {error && (
        <span style={{ fontSize: 11, color: '#e00', fontWeight: 700 }}>Try again!</span>
      )}

      {chips.length > 0 && (
        <div className="ai-chips">
          {chips.map((text, i) => (
            <div
              key={i}
              className="ai-chip"
              onClick={() => onSelect(text)}
            >
              {text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
