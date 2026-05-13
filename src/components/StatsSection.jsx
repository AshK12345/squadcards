import { useState } from 'react';
import BipolarSlider from './BipolarSlider';
import { fmtBi } from '../constants';
import { evaluateStats } from '../utils/ai';

export default function StatsSection({ stats, onStatChange, name, type, showToast }) {
  const [loading, setLoading] = useState(false);

  const handleAIEval = async () => {
    if (!name && !type) {
      showToast('Add a name or vibe first!');
      return;
    }
    setLoading(true);
    try {
      const scores = await evaluateStats(name || '', type || '');
      const clamp = (v, mn, mx) => Math.min(mx, Math.max(mn, Math.round(v) || 0));
      const newVals = {
        rizz: clamp(scores.rizz, -999, 999),
        aura: clamp(scores.aura, -999, 999),
        clout: clamp(scores.clout, 0, 999),
        chuddness: clamp(scores.chuddness, 0, 999),
      };
      stats.forEach((s, i) => {
        if (newVals[s.key] !== undefined) onStatChange(i, newVals[s.key]);
      });
      showToast('✦ Stats evaluated!');
    } catch (e) {
      showToast('AI eval failed — drag to adjust');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="ai-stat-row">
        <span className="ai-stat-hint">AI-evaluated · drag to adjust</span>
        <button
          className="btn-ai-stats"
          onClick={handleAIEval}
          disabled={loading}
          type="button"
        >
          {loading ? 'Evaluating...' : '✦ Evaluate'}
        </button>
      </div>

      <div className="stats-section">
        {stats.map((s, i) => (
          <div key={s.key}>
            {s.bipolar ? (
              <div>
                <div className="stat-row">
                  <span className="stat-emoji">{s.emoji}</span>
                  <span className="stat-name">{s.name}</span>
                  <BipolarSlider
                    value={s.val}
                    onChange={(val) => onStatChange(i, val)}
                  />
                  <span className={`stat-val${s.val < 0 ? ' is-neg' : ''}`}>
                    {fmtBi(s.val)}
                  </span>
                </div>
                <div className="bipolar-legend">
                  <span>−999</span>
                  <span>0</span>
                  <span>+999</span>
                </div>
              </div>
            ) : (
              <div className="stat-row">
                <span className="stat-emoji">{s.emoji}</span>
                <span className="stat-name">{s.name}</span>
                <input
                  type="range"
                  className="stat-slider"
                  min="0"
                  max="999"
                  step="1"
                  value={s.val}
                  onChange={(e) => onStatChange(i, parseInt(e.target.value))}
                />
                <span className="stat-val">{s.val}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
