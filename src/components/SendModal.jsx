import { useState } from 'react';

export default function SendModal({ pack, packName, shareUrl, onClose }) {
  const [recipient, setRecipient] = useState('');
  const [copied, setCopied]       = useState(false);

  const url = shareUrl || window.location.href;
  const to  = recipient.trim() || 'you';

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareText     = () => window.open(`sms:?body=${encodeURIComponent(`yo ${to}, i made you a SquadCard pack 🃏\n"${packName}"\n${url}`)}`);
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`yo ${to} 👀 i made you a card pack — "${packName}"\n${url}`)}`);
  const shareEmail    = () => window.open(`mailto:?subject=${encodeURIComponent('You got a SquadCard pack 🃏')}&body=${encodeURIComponent(`Hey ${to},\n\nI made you a card pack called "${packName}"\n\nOpen it: ${url}\n\ndon't say i never gave you anything lmao`)}`);

  return (
    <div
      className="modal-overlay visible"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-close" onClick={onClose}>✕</div>
        <h3>Send Pack 📨</h3>
        <div className="modal-sub">Share with your friends</div>

        <div className="form-row">
          <label className="form-label">Recipient (optional)</label>
          <input
            className="form-input"
            placeholder="Jake, the squad, ur mum..."
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
          />
        </div>

        <div className="share-link-box">{url}</div>

        <div className="share-options">
          <button className={`share-btn ${copied ? 'copied' : ''}`} onClick={copyLink} type="button">
            {copied ? '✓ Copied!' : '📋 Copy Link'}
          </button>
          <button className="share-btn" onClick={shareText}     type="button">💬 Text It</button>
          <button className="share-btn" onClick={shareWhatsApp} type="button">💚 WhatsApp</button>
          <button className="share-btn" onClick={shareEmail}    type="button">📧 Email</button>
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '2px dashed #e0d8c8' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#aaa', marginBottom: 8 }}>
            Pack contents
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {pack.map((c, i) => (
              <span key={i} style={{ background: '#f5f0e8', border: '2px solid #1a1a1a', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                {c.name} <span style={{ opacity: 0.5 }}>{c.rarity}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
