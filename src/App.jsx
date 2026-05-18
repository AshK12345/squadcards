import { useState, useEffect, useCallback } from 'react';
import Nav from './components/Nav';
import Toast from './components/Toast';
import CreateView from './views/CreateView';
import CollectionView from './views/CollectionView';
import PacksView from './views/PacksView';
import TradesView from './views/TradesView';
import { useCards } from './hooks/useCards';
import { useDeviceId } from './hooks/useDeviceId';
import { fetchSharedPack } from './utils/share';

export default function App() {
  const [activeView, setActiveView]   = useState('create');
  const { cards, loading, addCard, removeCard, reloadCards } = useCards();
  const deviceId                       = useDeviceId();
  const [toast, setToast]             = useState({ msg: '', key: 0 });
  const [currentPack, setCurrentPack] = useState(null);
  const [incomingPack, setIncomingPack] = useState(null);
  const [incomingTradeId, setIncomingTradeId] = useState(null);

  // When a card is deleted from the collection, scrub it from any open sealed pack
  useEffect(() => {
    if (!currentPack) return;
    const ids = new Set(cards.map(c => c.id));
    const filtered = currentPack.filter(c => !c.id || ids.has(c.id));
    if (filtered.length !== currentPack.length) setCurrentPack(filtered);
  }, [cards]);

  // Detect shared pack or trade in URL hash on load
  useEffect(() => {
    const packMatch  = window.location.hash.match(/[#&]pack=([^&]+)/);
    const tradeMatch = window.location.hash.match(/[#&]trade=([^&]+)/);
    if (packMatch) {
      fetchSharedPack(packMatch[1]).then(packData => {
        if (packData) { setIncomingPack(packData); setActiveView('packs'); }
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

  return (
    <>
      <div className="app">
        <Nav activeView={activeView} onViewChange={setActiveView} />

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
          reloadCards={reloadCards}
          showToast={showToast}
          incomingTradeId={incomingTradeId}
          clearIncomingTrade={() => setIncomingTradeId(null)}
        />
      </div>
      <Toast message={toast.msg} toastKey={toast.key} />
    </>
  );
}
