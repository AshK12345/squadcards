import { useState, useCallback } from 'react';
import { DEFAULT_STATS } from '../constants';
import RaritySelector from '../components/RaritySelector';
import PhotoUpload from '../components/PhotoUpload';
import StatsSection from '../components/StatsSection';
import AIFlavor from '../components/AIFlavor';
import CardFrame from '../components/CardFrame';

export default function CreateView({ active, collection, onSave, showToast }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [flavor, setFlavor] = useState('');
  const [rarity, setRarity] = useState('common');
  const [photoSrc, setPhotoSrc] = useState(null);
  const [stats, setStats] = useState(DEFAULT_STATS.map((s) => ({ ...s })));

  const cardData = {
    name: name || 'Unknown',
    type: type || 'Mysterious Entity',
    flavor,
    rarity,
    photo: photoSrc,
    stats,
  };

  const handleStatChange = useCallback((index, val) => {
    setStats((prev) => prev.map((s, i) => (i === index ? { ...s, val } : s)));
  }, []);

  const handleSave = () => {
    onSave(cardData);
    handleReset();
  };

  const handleReset = () => {
    setName('');
    setType('');
    setFlavor('');
    setRarity('common');
    setPhotoSrc(null);
    setStats(DEFAULT_STATS.map((s) => ({ ...s })));
  };

  return (
    <div className={`view ${active ? 'active' : ''}`} id="view-create">
      <div className="creator-layout">
        {/* LEFT: form */}
        <div>
          <div className="form-section">
            <h3>The Person</h3>
            <div className="form-row">
              <label className="form-label">Their Name</label>
              <input
                className="form-input"
                placeholder="Jake Peralta"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label className="form-label">Type / Vibe</label>
              <input
                className="form-input"
                placeholder="Chronically Online · AFK IRL · Main character"
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label className="form-label">Photo</label>
              <PhotoUpload photoSrc={photoSrc} onPhoto={setPhotoSrc} />
            </div>
          </div>

          <div className="form-section">
            <h3>Rarity Tier</h3>
            <RaritySelector selected={rarity} onChange={setRarity} />
          </div>

          <div className="form-section">
            <h3>Stats</h3>
            <StatsSection
              stats={stats}
              onStatChange={handleStatChange}
              name={name}
              type={type}
              photoSrc={photoSrc}
              showToast={showToast}
            />
          </div>

          <div className="form-section">
            <h3>Card Text</h3>
            <div className="form-row">
              <label className="form-label">Flavor Text</label>
              <textarea
                className="form-textarea"
                placeholder="Write your roast, or let AI cook..."
                value={flavor}
                onChange={(e) => setFlavor(e.target.value)}
                rows={3}
              />
              <AIFlavor
                name={name}
                type={type}
                rarity={rarity}
                stats={stats}
                photoSrc={photoSrc}
                onSelect={setFlavor}
              />
            </div>
          </div>

          <div className="btn-row">
            <button className="btn btn-primary" onClick={handleSave} type="button">
              Save to Collection 🎴
            </button>
            <button className="btn btn-secondary" onClick={handleReset} type="button">
              Reset
            </button>
          </div>
        </div>

        {/* RIGHT: sticky preview */}
        <div className="preview-sticky">
          <span className="preview-label">preview</span>
          <CardFrame card={cardData} index={collection.length} />
        </div>
      </div>
    </div>
  );
}
