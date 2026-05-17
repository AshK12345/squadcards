import { useState, useEffect, useRef } from 'react';
import { createTrade, fetchTrade, cancelTrade, subscribeTrade } from '../utils/trade';
import CardFrame from '../components/CardFrame';
import TradeFlow from '../components/TradeFlow';
import { SUPABASE_ENABLED } from '../lib/supabase';

const LS_KEY = 'sc-pending-trade';

export default function TradesView({
  active, collection, deviceId, reloadCards,
  showToast, incomingTradeId, clearIncomingTrade,
}) {
  const [phase, setPhase]             = useState('idle'); // idle | pending | done
  const [pendingTrade, setPendingTrade] = useState(null);
  const [tradeUrl, setTradeUrl]       = useState('');
  const [picked, setPicked]           = useState(null);
  const [copied, setCopied]           = useState(false);
  const [receivedName, setReceivedName] = useState('');
  const [incomingTrade, setIncomingTrade] = useState(null);
  const subRef = useRef(null);

  // Stable ref so subscription callback always sees latest state/fns
  const onTradeUpdateRef = useRef(null);
  onTradeUpdateRef.current = async (trade) => {
    if (trade.status === 'completed') {
      localStorage.removeItem(LS_KEY);
      if (subRef.current) { subRef.current.unsubscribe(); subRef.current = null; }
      await reloadCards();
      setReceivedName(trade.recipient_card_snapshot?.name || 'a card');
      setPendingTrade(null);
      setPhase('done');
      showToast('🤝 Trade complete!');
    } else if (trade.status === 'cancelled') {
      localStorage.removeItem(LS_KEY);
      if (subRef.current) { subRef.current.unsubscribe(); subRef.current = null; }
      setPendingTrade(null);
      setPhase('idle');
    }
  };

  // Restore pending trade from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem(LS_KEY);
    if (!savedId || !deviceId) return;
    fetchTrade(savedId).then(trade => {
      if (!trade || trade.status !== 'pending' || trade.initiator_device_id !== deviceId) {
        localStorage.removeItem(LS_KEY); return;
      }
      setPendingTrade(trade);
      setTradeUrl(`${window.location.origin}${window.location.pathname}#trade=${trade.id}`);
      setPhase('pending');
      subRef.current = subscribeTrade(trade.id, t => onTradeUpdateRef.current(t));
    });
  }, [deviceId]);

  // Incoming trade link
  useEffect(() => {
    if (!incomingTradeId) return;
    fetchTrade(incomingTradeId).then(trade => {
      if (!trade) { showToast('Trade not found or already completed.'); return; }
      if (trade.status !== 'pending') { showToast('This trade is no longer available.'); return; }
      setIncomingTrade(trade);
    });
  }, [incomingTradeId]);

  // Cleanup subscription on unmount
  useEffect(() => () => { if (subRef.current) subRef.current.unsubscribe(); }, []);

  const offerTrade = async () => {
    if (!picked) return;
    const { trade, url, error } = await createTrade(picked, deviceId);
    if (error) { showToast('Could not create trade: ' + error); return; }
    localStorage.setItem(LS_KEY, trade.id);
    setPendingTrade(trade);
    setTradeUrl(url);
    setPhase('pending');
    subRef.current = subscribeTrade(trade.id, t => onTradeUpdateRef.current(t));
    showToast('Trade offer created!');
  };

  const handleCancel = async () => {
    if (!pendingTrade) return;
    await cancelTrade(pendingTrade.id);
    localStorage.removeItem(LS_KEY);
    if (subRef.current) { subRef.current.unsubscribe(); subRef.current = null; }
    setPendingTrade(null); setPicked(null); setPhase('idle');
    showToast('Trade cancelled.');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(tradeUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTradeDone = async () => {
    setIncomingTrade(null);
    clearIncomingTrade();
    await reloadCards();
    if (window.location.hash.includes('trade=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  if (!SUPABASE_ENABLED) {
    return (
      <div className={`view ${active ? 'active' : ''}`} id="view-trades">
        <div className="trade-area">
          <p style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>
            Trading requires a Supabase connection.
          </p>
        </div>
      </div>
    );
  }

  const eligibleCards = collection.filter(c => !String(c.id).startsWith('temp-'));

  return (
    <div className={`view ${active ? 'active' : ''}`} id="view-trades">
      <div className="trade-area">

        {/* ── IDLE: pick a card to offer ── */}
        {phase === 'idle' && (
          <div className="pack-builder">
            <h3>🤝 Offer a Trade</h3>
            <p className="trade-desc">
              Pick one card to offer. Your partner picks one back.
              There's a <strong>15%</strong> chance either card gets a rarity upgrade on delivery.
            </p>

            {eligibleCards.length === 0 ? (
              <p className="trade-empty-note">Save some cards first!</p>
            ) : (
              <>
                <p className="trade-section-label">Your card to offer:</p>
                <div className="trd-picker-grid">
                  {eligibleCards.map((c, i) => (
                    <div
                      key={c.id}
                      className={`trd-picker-cell rarity-${c.rarity} ${picked?.id === c.id ? 'trd-selected' : ''}`}
                      onClick={() => setPicked(c)}
                    >
                      <CardFrame card={c} index={i} noTilt />
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                  onClick={offerTrade}
                  disabled={!picked}
                  type="button"
                >
                  {picked ? `Offer ${picked.name} 🤝` : 'Select a card above'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── PENDING: waiting for partner ── */}
        {phase === 'pending' && pendingTrade && (
          <div className="pack-builder">
            <h3>Trade Pending ⏳</h3>
            <p className="trade-desc">
              Share this link with your trade partner. The trade completes the moment they accept.
            </p>

            <p className="trade-section-label" style={{ marginBottom: 8 }}>Your offer:</p>
            <div className="trd-offer-preview">
              <CardFrame card={pendingTrade.initiator_card_snapshot} index={0} noTilt />
            </div>

            <div className="trd-link-row">
              <input className="form-input" readOnly value={tradeUrl} style={{ flex: 1, fontSize: 11 }} />
              <button className="btn btn-secondary" onClick={copyLink} type="button" style={{ whiteSpace: 'nowrap' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <button
              className="btn trd-cancel-btn"
              onClick={handleCancel}
              type="button"
            >
              Cancel Trade ✕
            </button>
          </div>
        )}

        {/* ── DONE: trade completed ── */}
        {phase === 'done' && (
          <div className="pack-builder" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
            <h3>Trade Complete!</h3>
            <p className="trade-desc">
              You received <strong>{receivedName}</strong>. Check your collection!
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
              onClick={() => { setPhase('idle'); setPicked(null); }}
              type="button"
            >
              Trade Again 🤝
            </button>
          </div>
        )}
      </div>

      {/* ── Incoming trade overlay ── */}
      {incomingTrade && (
        <TradeFlow
          trade={incomingTrade}
          myCollection={eligibleCards}
          myDeviceId={deviceId}
          onDone={handleTradeDone}
          onClose={() => {
            setIncomingTrade(null);
            clearIncomingTrade();
            if (window.location.hash.includes('trade=')) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
        />
      )}
    </div>
  );
}
