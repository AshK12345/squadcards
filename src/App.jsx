import { useState, useEffect, useCallback } from 'react';
import Nav from './components/Nav';
import Toast from './components/Toast';
import AuthModal from './components/AuthModal';
import GuestUsernameModal from './components/GuestUsernameModal';
import CreateView from './views/CreateView';
import CollectionView from './views/CollectionView';
import PacksView from './views/PacksView';
import TradesView from './views/TradesView';
import { useAuth } from './hooks/useAuth';
import { useCards } from './hooks/useCards';
import { useDeviceId } from './hooks/useDeviceId';
import { useGuestUsername } from './hooks/useGuestUsername';
import { fetchSharedPack } from './utils/share';

export default function App() {
  const auth = useAuth();
  const { user, profile, signOut } = auth;
  const deviceId = useDeviceId();
  const { handle: guestHandle, saveHandle } = useGuestUsername();

  // Pass userId to useCards when signed in so cards load from user account
  const userId = user?.id ?? null;
  const { cards, loading, addCard, removeCard, reloadCards } = useCards(userId);

  const [activeView, setActiveView]   = useState('create');
  const [toast, setToast]             = useState({ msg: '', key: 0 });
  const [currentPack, setCurrentPack] = useState(null);
  const [incomingPack, setIncomingPack] = useState(null);
  const [incomingTradeId, setIncomingTradeId] = useState(null);
  const [showAuth, setShowAuth]       = useState(false);

  // Auto-open auth modal when user is signed in but has no profile yet
  useEffect(() => {
    if (user && !profile) setShowAuth(true);
  }, [user, profile]);

  // Detect shared pack or trade in URL hash on load
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

  // user === undefined means auth is still resolving session (don't flash login UI)
  const authResolved = user !== undefined;

  // Effective display name: signed-in profile username, or guest handle
  const displayName = profile?.username ?? guestHandle ?? null;

  // Block the app until we have *some* username — either Supabase profile or guest handle.
  // While auth is resolving (user===undefined) we wait silently.
  // Once resolved: signed-in users without a profile get AuthModal (username step);
  // signed-out users without a guest handle get GuestUsernameModal.
  const needsUsername = authResolved && displayName === null && !showAuth;

  return (
    <>
      <div className="app">
        <Nav
          activeView={activeView}
          onViewChange={setActiveView}
          user={authResolved ? user : undefined}
          profile={profile}
          displayName={displayName}
          onSignIn={() => setShowAuth(true)}
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

      {/* Guest username gate — shown to signed-out users with no handle yet */}
      {needsUsername && !user && (
        <GuestUsernameModal
          onSave={saveHandle}
          onSignIn={() => setShowAuth(true)}
        />
      )}

      {showAuth && (
        <AuthModal
          auth={auth}
          deviceId={deviceId}
          onClose={() => setShowAuth(false)}
        />
      )}

      <Toast message={toast.msg} toastKey={toast.key} />
    </>
  );
}
