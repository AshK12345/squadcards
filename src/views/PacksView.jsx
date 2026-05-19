import { useState, useEffect } from 'react';
import { MIN_PACK } from '../constants';
import PackOpenFlow from '../components/PackOpenFlow';
import ConsentModal from '../components/ConsentModal';
import SendModal from '../components/SendModal';
import { createShareablePack } from '../utils/share';
import { drawFromPool } from '../utils/pack';

const OPENED_KEY = 'sq_opened_packs';
function getOpenedPacks() {
  try { return new Set(JSON.parse(localStorage.getItem(OPENED_KEY) || '[]')); }
  catch { return new Set(); }
}
function markPackOpened(packId) {
  const opened = getOpenedPacks();
  opened.add(packId);
  localStorage.setItem(OPENED_KEY, JSON.stringify([...opened]));
}

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
  const [showConsent, setShowConsent] = useState(false);
  const [showSend, setShowSend]   = useState(false);
  const [sealing, setSealing]     = useState(false);
  const [alreadyOpened, setAlreadyOpened] = useState(false);

  // Auto-open incoming shared pack — check one-time gate first
  useEffect(() => {
    if (incomingPack && active) {
      if (incomingPack.packId && getOpenedPacks().has(incomingPack.packId)) {
        setAlreadyOpened(true);
        return;
      }
      setCurrentPack({ name: incomingPack.name, cards: incomingPack.cards, shareUrl: null });
      setShowConsent(true);
    }
  }, [incomingPack, active]);

  // When collection changes (e.g. card deleted), scrub that card out of any
  // already-sealed pack so it doesn't appear without a refresh
  useEffect(() => {
    setCurrentPack(prev => {
      if (!prev) return prev;
      const validIds = new Set(collection.map(c => c.id));
      const filtered = prev.cards.filter(c => validIds.has(c.id));
      if (filtered.length === prev.cards.length) return prev; // nothing changed
      return filtered.length > 0 ? { ...prev, cards: filtered } : null;
    });
  }, [collection]);

  const buildPack = async () => {
    if (collection.length < MIN_PACK) {
      showToast('Add at least one card to your collection first!');
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

  const handleOpenPackClick = () => {
    setShowConsent(true);
  };

  const handleConsentConfirm = () => {
    setShowConsent(false);
    setShowOverlay(true);
  };

  const handleConsentCancel = () => {
    setShowConsent(false);
    setIncomingPack(null);
    if (window.location.hash.includes('pack=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const closePack = () => {
    setShowOverlay(false);
    // Mark received packs as opened so they can't be re-opened
    if (incomingPack?.packId) {
      markPackOpened(incomingPack.packId);
    }
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
              {[2, 3, 5, 7, 10].map(n => (
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

        {/* ── Already-opened notice (received pack only) ── */}
        {alreadyOpened && (
          <div className="already-opened-notice">
            <div className="already-opened-icon">📭</div>
            <p>You already opened this pack.</p>
            <p className="already-opened-sub">Cards from it are in your collection.</p>
          </div>
        )}

        {/* ── Sealed pack ── */}
        {currentPack && !alreadyOpened && (
          <div style={{ textAlign: 'center' }}>
            <div className="pack-visual" onClick={handleOpenPackClick}>
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

      {showConsent && (
        <ConsentModal
          onConfirm={handleConsentConfirm}
          onCancel={handleConsentCancel}
        />
      )}

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
