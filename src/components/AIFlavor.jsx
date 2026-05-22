import { useState } from 'react';
import { suggestFlavor } from '../utils/ai';
import { getMemory, saveFlavor } from '../utils/aiMemory';

export default function AIFlavor({ name, type, rarity, stats, photoSrc, collection, onSelect }) {
  const [loading, setLoading] = useState(false);
  const [chips, setChips] = useState([]);
  const [error, setError] = useState(false);

  const handleSuggest = async () => {
    setLoading(true);
    setChips([]);
    setError(false);
    try {
      const memory = getMemory(name);
      const suggestions = await suggestFlavor(name || 'your friend', type || '', rarity, stats, photoSrc, collection || [], memory);
      setChips(suggestions);
    } catch (e) {
      console.error('[AIFlavor] suggestFlavor failed:', e);
      setError(e?.message || 'unknown error');
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
        <span style={{ fontSize: 11, color: '#e00', fontWeight: 700 }}>
          Try again! {error !== true && <span style={{ fontWeight: 400, opacity: 0.7 }}>({String(error).slice(0, 60)})</span>}
        </span>
      )}

      {chips.length > 0 && (
        <div className="ai-chips">
          {chips.map((text, i) => (
            <div
              key={i}
              className="ai-chip"
              onClick={() => { saveFlavor(name, text); onSelect(text); }}
            >
              {text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
