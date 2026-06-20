import { useState, useRef, useEffect } from 'react';

export default function UserMenu({ user, profile, displayName: guestDisplay, onSignIn, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Guest (no account) but has a handle
  if (!user && guestDisplay) {
    return (
      <div className="user-menu" ref={ref}>
        <button
          className="user-avatar user-avatar-guest"
          onClick={() => setOpen(o => !o)}
          type="button"
          aria-label="Account menu"
        >
          {guestDisplay[0].toUpperCase()}
        </button>
        {open && (
          <div className="user-dropdown">
            <div className="user-dropdown-name">@{guestDisplay} <span style={{fontSize:10,color:'#aaa'}}>(guest)</span></div>
            <button className="user-dropdown-item" onClick={() => { setOpen(false); onSignIn(); }} type="button">
              Create Account
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <button className="btn btn-signin" onClick={onSignIn} type="button">
        Sign In
      </button>
    );
  }

  const initials = profile?.username
    ? profile.username[0].toUpperCase()
    : (user.email?.[0] ?? '?').toUpperCase();

  const displayName = profile?.username ? `@${profile.username}` : user.email;

  return (
    <div className="user-menu" ref={ref}>
      <button
        className="user-avatar"
        onClick={() => setOpen(o => !o)}
        type="button"
        aria-label="Account menu"
      >
        {initials}
      </button>
      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-name">{displayName}</div>
          <button className="user-dropdown-item" onClick={() => { setOpen(false); onSignOut(); }} type="button">
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
