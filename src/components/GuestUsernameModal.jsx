import { useState } from 'react';
import ScLogo from './ScLogo';

export default function GuestUsernameModal({ onSave, onSignIn }) {
  const [handle, setHandle] = useState('');
  const [err, setErr]       = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 2)  { setErr('At least 2 characters.'); return; }
    if (clean.length > 20) { setErr('Max 20 characters.'); return; }
    onSave(clean);
  };

  return (
    <div className="modal-overlay visible">
      <div className="modal" style={{ textAlign: 'center' }}>
        <ScLogo idPrefix="gum" className="guest-modal-logo" />
        <h2 style={{ fontFamily: "'Fredoka One', sans-serif", marginBottom: 4 }}>
          Slop<span style={{ color: '#ff3b3b' }}>Cards</span>
        </h2>
        <p className="modal-sub" style={{ marginBottom: 20 }}>
          Pick a handle so your squad can find you
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ marginBottom: 10, position: 'relative' }}>
            <span className="auth-at">@</span>
            <input
              className="form-input"
              style={{ paddingLeft: 28, textAlign: 'left' }}
              placeholder="coolkid99"
              value={handle}
              onChange={e => { setHandle(e.target.value); setErr(''); }}
              maxLength={20}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <p style={{ fontSize: 11, color: '#888', marginBottom: 10, marginTop: -4, textAlign: 'left' }}>
            2–20 chars · letters, numbers, underscores · shown when trading
          </p>
          {err && <p className="auth-error">{err}</p>}
          <button className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
            type="submit">
            Let's go →
          </button>
        </form>

        <button className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
          onClick={onSignIn}
          type="button">
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
}
