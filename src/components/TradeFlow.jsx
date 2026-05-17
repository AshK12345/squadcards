import { useState } from 'react';
import { acceptTrade } from '../utils/trade';
import CardFrame from './CardFrame';

const BURST_RARITIES = new Set(['uncommon', 'rare', 'legendary', 'secret']);
const FLIP_HALF = 200;

export default function TradeFlow({ trade, myCollection, myDeviceId, onDone, onClose }) {
  const [phase, setPhase]         = useState('preview'); // preview | pick | confirming | done | taken
  const [flipPhase, setFlipPhase] = useState('back');    // back | closing | opening | front
  const [selected, setSelected]   = useState(null);
  const [result, setResult]       = useState(null);
  const [burstKey, setBurstKey]   = useState(0);

  const initCard    = trade.initiator_card_snapshot;
  const showFront   = flipPhase === 'opening' || flipPhase === 'front';
  const flipAnim    = flipPhase === 'closing' ? 'pof-flipX-out'
                    : flipPhase === 'opening' ? 'pof-flipX-in' : '';
  const eligible    = myCollection.filter(c => !String(c.id).startsWith('temp-'));
  const isSelf      = myDeviceId === trade.initiator_device_id;

  const revealCard = () => {
    if (flipPhase !== 'back') return;
    setFlipPhase('closing');
    setTimeout(() => setFlipPhase('opening'), FLIP_HALF);
    setTimeout(() => { setFlipPhase('front'); setPhase('pick'); }, FLIP_HALF * 2);
  };

  const confirmTrade = async () => {
    if (!selected) return;
    setPhase('confirming');
    const res = await acceptTrade(trade, selected, myDeviceId);
    if (res.error) { setPhase('taken'); return; }
    setResult(res);
    if (res.upgraded && BURST_RARITIES.has(res.newRarity)) setBurstKey(k => k + 1);
    setPhase('done');
  };

  const stopProp = e => e.stopPropagation();

  return (
    <div
      className="pof-backdrop"
      onClick={phase === 'preview' ? revealCard : undefined}
    >
      {/* Rarity upgrade burst */}
      {result?.upgraded && (
        <div key={burstKey} className={`pof-reveal-burst pof-burst-${result.newRarity}`} />
      )}

      {phase !== 'confirming' && (
        <button className="pof-close" onMouseDown={stopProp} onTouchStart={stopProp} onClick={onClose} type="button">✕</button>
      )}

      {/* ── PREVIEW + PICK ── */}
      {(phase === 'preview' || phase === 'pick') && (
        <div className="trf-scene">
          {isSelf ? (
            <p className="trf-hint">You can't trade with yourself!</p>
          ) : (
            <>
              <p className="trf-hint" style={{ marginBottom: 14 }}>
                {phase === 'preview' ? 'Tap to see what\'s on offer' : initCard.name}
              </p>

              <div className="trf-card-wrap">
                <div className={`pof-flip-card ${flipAnim}`}>
                  {showFront ? (
                    <CardFrame card={initCard} index={0} noTilt />
                  ) : (
                    <div className="pof-card-back"><TrfLogo /></div>
                  )}
                </div>
              </div>

              {phase === 'pick' && (
                <div className="trf-picker" onClick={stopProp}>
                  <p className="trf-subhint">Pick a card to trade:</p>
                  {eligible.length === 0 ? (
                    <p className="trf-empty">You have no cards to trade.</p>
                  ) : (
                    <div className="trf-card-list">
                      {eligible.map((c, i) => (
                        <div
                          key={c.id}
                          className={`trf-card-option rarity-${c.rarity} ${selected?.id === c.id ? 'trf-selected' : ''}`}
                          onClick={() => setSelected(c)}
                        >
                          <CardFrame card={c} index={i} noTilt />
                        </div>
                      ))}
                    </div>
                  )}
                  {selected && (
                    <button
                      className="btn btn-primary trf-confirm-btn"
                      onMouseDown={stopProp} onTouchStart={stopProp}
                      onClick={confirmTrade}
                      type="button"
                    >
                      🤝 Trade {selected.name} for {initCard.name}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── CONFIRMING ── */}
      {phase === 'confirming' && (
        <div className="trf-scene">
          <p className="trf-hint">Completing trade...</p>
        </div>
      )}

      {/* ── TAKEN ── */}
      {phase === 'taken' && (
        <div className="trf-scene">
          <p className="trf-hint" style={{ textAlign: 'center', maxWidth: 260 }}>
            ⚠️ This trade was already accepted or cancelled.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onMouseDown={stopProp} onClick={onClose} type="button">
            Close
          </button>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && result && (
        <div className="trf-scene" onClick={stopProp}>
          <p className="trf-hint" style={{ marginBottom: 6 }}>
            {result.upgraded
              ? `⬆️ Upgraded to ${result.newRarity}!`
              : '✓ Trade complete!'}
          </p>
          {result.upgraded && (
            <p className="trf-subhint" style={{ marginBottom: 14 }}>
              Lucky! {result.originalRarity} → {result.newRarity}
            </p>
          )}
          <div className="trf-card-wrap">
            <CardFrame card={result.newCard} index={0} noTilt />
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 20 }}
            onMouseDown={stopProp} onTouchStart={stopProp}
            onClick={onDone}
            type="button"
          >
            Sweet ✓
          </button>
        </div>
      )}
    </div>
  );
}

function TrfLogo() {
  return (
    <svg
      className="pof-sc-logo"
      viewBox="0 0 230 328"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="scGradTrf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.38)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
        </linearGradient>
      </defs>
      <text x="115" y="186" fontFamily="Nerko One, cursive" fontSize="178"
        textAnchor="middle" dominantBaseline="central" fill="rgba(0,0,0,0.28)">SC</text>
      <text x="115" y="185" fontFamily="Nerko One, cursive" fontSize="178"
        textAnchor="middle" dominantBaseline="central" fill="url(#scGradTrf)">SC</text>
    </svg>
  );
}
