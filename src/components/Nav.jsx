export default function Nav({ activeView, onViewChange }) {
  const tabs = [
    { id: 'create',     label: '✏️ Create'     },
    { id: 'collection', label: '📦 Collection' },
    { id: 'packs',      label: '💥 Packs'      },
  ];

  return (
    <nav className="nav">
      <span className="nav-logo">
        Squad<span>Cards</span> 🃏
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
