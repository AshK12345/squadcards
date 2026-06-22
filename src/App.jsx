import { useState, useEffect, useCallback } from 'react';
import Nav from './components/Nav';
import Toast from './components/Toast';
import AuthModal from './components/AuthModal';
import CreateView from './views/CreateView';
import CollectionView from './views/CollectionView';
import PacksView from './views/PacksView';
import TradesView from './views/TradesView';
import { useAuth } from './hooks/useAuth';
import { useCards } from './hooks/useCards';
import { useDeviceId } from './hooks/useDeviceId';
import { fetchSharedPack } from './utils/share';

export default function App() {
  const auth = useAuth();
  const { user, profile, signOut } = auth;
  const deviceId = useDeviceId();

  // Cards are always scoped to user_id when logged in
  const userId = user?.id ?? null;
  const { cards, loading, addCard, removeCard, reloadCards } = useCards(userId);

  const [activeView, setActiveView]     = useState('create');
  const [toast, setToast]               = useState({ msg: '', key: 0 });
  const [currentPack, setCurrentPack]   = useState(null);
  const [incomingPack, setIncomingPack] = useState(null);
  const [incomingTradeId, setIncomingTradeId] = useState(null);

  // Detect shared pack or trade in URL hash on load (works even before auth)
  useEffect(() => {
    const packMatch  = window.location.hash.match(/[#&]pack=([^&]+)/);
    const tradeMatch = window.location.hash.match(/[#&]trade=([^&]+)/);
    if (packMatch) {
      fetchSharedPack(packMatch[1]).then(packData => {
        if (packData) { setIncomingPack({ ...packData, packId: packMatch[1] }); setActiveView('packs'); }
      });
    } else if (tradeMatch) {
      setIncomingTradeId(tradeMatch[1]);
      setActiveView('trades');
    }
  }, []);

  const showToast = useCallback((msg) => {
    setToast(prev => ({ msg, key: prev.key + 1 }));
  }, []);

  const handleAddCard = useCallback(async (cardData) => {
    await addCard(cardData);
    showToast(`🎴 ${cardData.name} added!`);
  }, [addCard, showToast]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    showToast('Signed out.');
  }, [signOut, showToast]);

  // ── Auth gate ─────────────────────────────────────────────────────────────
  // user === undefined → still resolving session, show spinner
  // user === null      → signed out, show auth wall (can't be dismissed)
  // user + no profile  → signed in but no username yet, show username step
  // user + profile     → fully authenticated, show the app

  if (user === undefined) {
    // Auth resolving — show minimal loading screen to avoid a flash
    return (
      <div className="auth-loading">
        <div className="auth-loading-logo">
          Slop<span>Cards</span>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    // Not logged in, or logged in but no username yet — full-screen auth wall
    return (
      <>
        <AuthModal
          auth={auth}
          deviceId={deviceId}
          onClose={null}  // null = can't be dismissed
        />
        <Toast message={toast.msg} toastKey={toast.key} />
      </>
    );
  }

  // ── Fully authenticated ───────────────────────────────────────────────────
  return (
    <>
      <div className="app">
        <Nav
          activeView={activeView}
          onViewChange={setActiveView}
          user={user}
          profile={profile}
          onSignIn={null}
          onSignOut={handleSignOut}
        />

        <CreateView
          active={activeView === 'create'}
          collection={cards}
          onSave={handleAddCard}
          showToast={showToast}
        />
        <CollectionView
          active={activeView === 'collection'}
          collection={cards}
          loading={loading}
          onRemove={removeCard}
        />
        <PacksView
          active={activeView === 'packs'}
          collection={cards}
          deviceId={deviceId}
          currentPack={currentPack}
          setCurrentPack={setCurrentPack}
          incomingPack={incomingPack}
          setIncomingPack={setIncomingPack}
          showToast={showToast}
        />
        <TradesView
          active={activeView === 'trades'}
          collection={cards}
          deviceId={deviceId}
          userId={userId}
          reloadCards={reloadCards}
          showToast={showToast}
          incomingTradeId={incomingTradeId}
          clearIncomingTrade={() => setIncomingTradeId(null)}
          addCard={addCard}
          removeCard={removeCard}
        />
      </div>

      <Toast message={toast.msg} toastKey={toast.key} />
    </>
  );
}
