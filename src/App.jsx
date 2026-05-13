import { useState, useEffect, useCallback } from 'react';
import Nav from './components/Nav';
import Toast from './components/Toast';
import CreateView from './views/CreateView';
import CollectionView from './views/CollectionView';
import PacksView from './views/PacksView';
import { useCards } from './hooks/useCards';
import { useDeviceId } from './hooks/useDeviceId';
import { fetchSharedPack } from './utils/share';

export default function App() {
  const [activeView, setActiveView]   = useState('create');
  const { cards, loading, addCard, removeCard } = useCards();
  const deviceId                       = useDeviceId();
  const [toast, setToast]             = useState({ msg: '', key: 0 });
  const [currentPack, setCurrentPack] = useState(null);
  const [incomingPack, setIncomingPack] = useState(null);

  // Detect shared pack in URL hash on load
  useEffect(() => {
    const match = window.location.hash.match(/[#&]pack=([^&]+)/);
    if (!match) return;
    fetchSharedPack(match[1]).then(packData => {
      if (packData) {
        setIncomingPack(packData);
        setActiveView('packs');
      }
    });
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
      </div>
      <Toast message={toast.msg} toastKey={toast.key} />
    </>
  );
}
