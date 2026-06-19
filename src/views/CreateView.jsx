import { useState, useCallback } from 'react';
import { DEFAULT_STATS } from '../constants';
import RaritySelector from '../components/RaritySelector';
import PhotoUpload from '../components/PhotoUpload';
import StatsSection from '../components/StatsSection';
import AIFlavor from '../components/AIFlavor';
import CardFrame from '../components/CardFrame';
import ImageCropModal from '../components/ImageCropModal';
import { saveStats } from '../utils/aiMemory';
import { analyzePhotoVibe } from '../utils/ai';

export default function CreateView({ active, collection, onSave, showToast }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [flavor, setFlavor] = useState('');
  const [rarity, setRarity] = useState('common');
  const [photoSrc, setPhotoSrc] = useState(null);       // displayed / baked photo
  const [originalPhoto, setOriginalPhoto] = useState(null); // always the raw upload
  const [showCrop, setShowCrop] = useState(false);
  const [stats, setStats] = useState(DEFAULT_STATS.map((s) => ({ ...s })));
  const [aiKey, setAiKey] = useState(0);
  const [grainSeed] = useState(() => Math.floor(Math.random() * 9999));
  const [imgX, setImgX]         = useState(0);
  const [imgY, setImgY]         = useState(0);
  const [imgScale, setImgScale] = useState(1);
  const [vibeLoading, setVibeLoading] = useState(false);

  const cardData = {
    name: name || 'Unknown',
    type: type || 'Mysterious Entity',
    flavor,
    rarity,
    photo: photoSrc,
    stats,
    grainSeed,
    imgX,
    imgY,
    imgScale,
  };

  const handleStatChange = useCallback((index, val) => {
    setStats((prev) => prev.map((s, i) => (i === index ? { ...s, val } : s)));
  }, []);

  const handleSave = () => {
    if (name) saveStats(name, stats);
    onSave(cardData);
    handleReset();
  };

  const handleReset = () => {
    setName('');
    setType('');
    setFlavor('');
    setRarity('common');
    setPhotoSrc(null);
    setOriginalPhoto(null);
    setStats(DEFAULT_STATS.map((s) => ({ ...s })));
    setAiKey(k => k + 1);
    setImgX(0); setImgY(0); setImgScale(1);
  };

  const handlePhoto = (src) => {
    setPhotoSrc(src);
    setOriginalPhoto(src);   // keep original for re-cropping
    setImgX(0); setImgY(0); setImgScale(1);
    // Auto-generate vibe from photo in the background
    setVibeLoading(true);
    analyzePhotoVibe(src)
      .then(vibe => { if (vibe) setType(vibe); })
      .catch(e => console.warn('[CreateView] vibe analysis failed:', e))
      .finally(() => setVibeLoading(false));
  };

  // Baked crop result — replaces displayed photo, resets position transforms
  const handleCropSave = (bakedSrc) => {
    setPhotoSrc(bakedSrc);
    setImgX(0); setImgY(0); setImgScale(1);
    setShowCrop(false);
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
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label className="form-label">
                Type / Vibe
                {vibeLoading && <span className="vibe-analyzing"> ✦ analyzing...</span>}
              </label>
              <input
                className="form-input"
                placeholder="Type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label className="form-label">Photo</label>
              <PhotoUpload photoSrc={photoSrc} onPhoto={handlePhoto} />
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
              collection={collection}
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
                maxLength={100}
              />
              <AIFlavor
                key={aiKey}
                name={name}
                type={type}
                rarity={rarity}
                stats={stats}
                photoSrc={photoSrc}
                collection={collection}
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
          <CardFrame
            card={cardData}
            index={collection.length}
            onImgClick={photoSrc ? () => setShowCrop(true) : undefined}
          />
          {photoSrc && (
            <button
              className="btn btn-secondary"
              style={{ marginTop: 8, fontSize: 12, padding: '6px 14px' }}
              onClick={() => setShowCrop(true)}
              type="button"
            >
              ✂️ Crop / Rotate
            </button>
          )}
        </div>
      </div>

      {showCrop && originalPhoto && (
        <ImageCropModal
          src={originalPhoto}
          onSave={handleCropSave}
          onCancel={() => setShowCrop(false)}
        />
      )}
    </div>
  );
}
