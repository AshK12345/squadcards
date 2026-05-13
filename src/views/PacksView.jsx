import { useState, useEffect } from 'react';
import { MIN_PACK } from '../constants';
import PackOpenFlow from '../components/PackOpenFlow';
import SendModal from '../components/SendModal';
import { createShareablePack } from '../utils/share';
import { drawFromPool } from '../utils/pack';

export default function PacksView({
  active,
  collection,
  deviceId,
  currentPack,
  setCurrentPack,
  incomingPack,
  setIncomingPack,
  showToast,
}) {
  const [packName, setPackName]   = useState('The Squad Pack');
  const [packSize, setPackSize]   = useState(5);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showSend, setShowSend]   = useState(false);
  const [sealing, setSealing]     = useState(false);

  // Auto-open incoming shared pack
  useEffect(() => {
    if (incomingPack && active) {
      setCurrentPack({ name: incomingPack.name, cards: incomingPack.cards, shareUrl: null });
      setShowOverlay(true);
    }
  }, [incomingPack, active]);

  const buildPack = async () => {
    if (collection.length < MIN_PACK) {
      showToast(`Need at least ${MIN_PACK} cards in your collection!`);
      return;
    }
    setSealing(true);
    const cards = drawFromPool(collection, packSize);
    const name  = packName || 'Mystery Pack';

    const { url } = await createShareablePack(cards, name, deviceId);
    setCurrentPack({ name, cards, shareUrl: url });
    showToast('💥 Pack sealed!');
    setSealing(false);
  };

  const closePack = () => {
    setShowOverlay(false);
    setIncomingPack(null);
    if (window.location.hash.includes('pack=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const displayName   = currentPack?.name?.toUpperCase() ?? 'PACK';
  const displayCount  = currentPack?.cards?.length ?? 0;

  return (
    <div className={`view ${active ? 'active' : ''}`} id="view-packs">
      <div className="pack-area">

        {/* ── Builder ── */}
        <div className="pack-builder">
          <h3>Build a Pack 💥</h3>
          <div className="form-row">
            <label className="form-label">Pack Name</label>
            <input
              className="form-input"
              placeholder="The Squad Pack"
              value={packName}
              onChange={e => setPackName(e.target.value)}
              style={{ marginBottom: 10 }}
            />
          </div>

          <div className="form-row">
            <label className="form-label">Pack Size</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[3, 5, 7, 10].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPackSize(n)}
                  style={{
                    padding: '6px 16px',
                    fontFamily: 'inherit',
                    fontWeight: 800,
                    fontSize: 13,
                    border: '2px solid #1a1a1a',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: packSize === n ? '#1a1a1a' : '#fff',
                    color: packSize === n ? '#fff' : '#1a1a1a',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {collection.length === 0 ? (
            <div className="pack-card-select">
              <span style={{ fontSize: 12, color: '#bbb', fontWeight: 700 }}>
                Save some cards first!
              </span>
            </div>
          ) : (
            <div className="pack-min-note">
              {collection.length} card{collection.length !== 1 ? 's' : ''} in pool · rarity-weighted draw ✦
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
            onClick={buildPack}
            disabled={sealing}
            type="button"
          >
            {sealing ? 'Sealing...' : 'Seal the Pack 🤝'}
          </button>
        </div>

        {/* ── Sealed pack ── */}
        {currentPack && (
          <div style={{ textAlign: 'center' }}>
            <div className="pack-visual" onClick={() => setShowOverlay(true)}>
              <div className="pack-body">
                <div className="pack-title-text">{displayName}</div>
                <div className="pack-count-badge">{displayCount} cards</div>
              </div>
            </div>
            <div className="swipe-hint">Tap to rip it open 👆</div>
            <button
              className="btn btn-secondary"
              style={{ marginTop: 16 }}
              onClick={() => setShowSend(true)}
              type="button"
            >
              📨 Send this Pack
            </button>
          </div>
        )}
      </div>

      {showOverlay && currentPack && (
        <PackOpenFlow
          pack={currentPack.cards}
          packName={currentPack.name}
          onClose={closePack}
        />
      )}

      {showSend && currentPack && (
        <SendModal
          pack={currentPack.cards}
          packName={currentPack.name}
          shareUrl={currentPack.shareUrl}
          onClose={() => setShowSend(false)}
        />
      )}
    </div>
  );
}
