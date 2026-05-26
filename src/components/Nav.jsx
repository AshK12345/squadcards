export default function Nav({ activeView, onViewChange }) {
  const tabs = [
    { id: 'create',     label: '✏️ Create' },
    { id: 'collection', label: '📦 Cards'  },
    { id: 'packs',      label: '💥 Packs'  },
    { id: 'trades',     label: '🤝 Trade'  },
  ];

  return (
    <nav className="nav">
      <span className="nav-logo">
        Slop<span>Cards</span> 🃏
      </span>
      <div className="nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeView === tab.id ? 'active' : ''}`}
            onClick={() => onViewChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
