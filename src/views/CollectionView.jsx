import { RARITY_ORDER } from '../constants';
import CardFrame from '../components/CardFrame';

export default function CollectionView({ active, collection, onRemove }) {
  const rareCount = collection.filter((c) => RARITY_ORDER[c.rarity] >= 2).length;

  return (
    <div className={`view ${active ? 'active' : ''}`} id="view-collection">
      <div className="coll-header">
        <h2>My Cards 📦</h2>
        <div className="coll-stats">
          <div className="coll-stat">
            <div className="coll-stat-val">{collection.length}</div>
            <div className="coll-stat-label">Total</div>
          </div>
          <div className="coll-stat">
            <div className="coll-stat-val">{rareCount}</div>
            <div className="coll-stat-label">Rare+</div>
          </div>
        </div>
      </div>

      {collection.length === 0 ? (
        <div className="collection-empty">
          <div style={{ fontSize: 48 }}>🃏</div>
          <p>No cards yet — go create some!</p>
        </div>
      ) : (
        <div className="card-grid">
          {collection.map((card, i) => (
            <div key={card.id} className="card-grid-item">
              <CardFrame card={card} index={i} />
              {onRemove && (
                <button
                  className="card-delete-btn"
                  onClick={() => onRemove(card.id)}
                  type="button"
                  title={`Remove ${card.name}`}
                >×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
