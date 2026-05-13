import { useState, useEffect } from 'react';
import { MIN_PACK } from '../constants';
import PackOpenFlow from '../components/PackOpenFlow';
import SendModal from '../components/SendModal';
import { createShareablePack } from '../utils/share';

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
  const [selectedIds, setSelectedIds] = useState(new Set());
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

  const toggleCard = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const buildPack = async () => {
    if (selectedIds.size < MIN_PACK) {
      showToast(`Need at least ${MIN_PACK} cards!`);
      return;
    }
    setSealing(true);
    const cards = collection.filter(c => selectedIds.has(c.id));
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

  const selectedCount = selectedIds.size;
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

          <label className="form-label">Pick cards (min {MIN_PACK})</label>
          {collection.length === 0 ? (
            <div className="pack-card-select">
              <span style={{ fontSize: 12, color: '#bbb', fontWeight: 700 }}>
                Save some cards first!
              </span>
            </div>
          ) : (
            <div className="pack-card-select">
              {collection.map(card => (
                <div
                  key={card.id}
                  className={`pack-card-chip ${selectedIds.has(card.id) ? 'selected' : ''}`}
                  onClick={() => toggleCard(card.id)}
                >
                  {card.name}
                </div>
              ))}
            </div>
          )}

          <div className={`pack-min-note ${selectedCount > 0 && selectedCount < MIN_PACK ? 'warn' : ''}`}>
            {selectedCount} / {MIN_PACK} selected{selectedCount >= MIN_PACK ? ' ✓' : ''}
          </div>

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
