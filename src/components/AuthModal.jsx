import { useState, useEffect } from 'react';

export default function AuthModal({ onClose, auth, deviceId }) {
  const { user, profile, signIn, signUp, createProfile, countDeviceCards, claimDeviceCards } = auth;

  // If already authed but no profile, jump straight to username setup
  const initStep = () => (user && !profile ? 'username' : 'auth');

  const [step, setStep]           = useState(initStep);
  const [tab, setTab]             = useState('signin');   // 'signin' | 'signup'

  // Sign-in fields
  const [siLogin, setSiLogin]     = useState('');         // username or email
  const [siPass, setSiPass]       = useState('');
  const [siErr, setSiErr]         = useState('');
  const [siBusy, setSiBusy]       = useState(false);

  // Sign-up fields
  const [suEmail, setSuEmail]     = useState('');
  const [suPass, setSuPass]       = useState('');
  const [suPass2, setSuPass2]     = useState('');
  const [suErr, setSuErr]         = useState('');
  const [suBusy, setSuBusy]       = useState(false);

  // Username setup
  const [username, setUsername]   = useState('');
  const [userErr, setUserErr]     = useState('');
  const [userBusy, setUserBusy]   = useState(false);

  // Claim step
  const [deviceCount, setDeviceCount] = useState(0);
  const [claimBusy, setClaimBusy]     = useState(false);

  // Advance when auth state resolves
  useEffect(() => {
    if (user && !profile && (step === 'auth')) setStep('username');
  }, [user, profile]);

  // Count device cards when reaching claim step
  useEffect(() => {
    if (step === 'claim' && deviceId) {
      countDeviceCards(deviceId).then(n => {
        setDeviceCount(n);
        if (n === 0) onClose();
      });
    }
  }, [step]);

  /* ── handlers ── */
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!siLogin.trim() || !siPass) return;
    setSiBusy(true); setSiErr('');
    const err = await signIn(siLogin.trim(), siPass);
    setSiBusy(false);
    if (err) setSiErr(err.message || 'Sign in failed. Check your credentials.');
    // on success, useEffect advances step
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!suEmail.trim() || !suPass) return;
    if (suPass !== suPass2) { setSuErr('Passwords do not match.'); return; }
    if (suPass.length < 6)  { setSuErr('Password must be at least 6 characters.'); return; }
    setSuBusy(true); setSuErr('');
    const err = await signUp(suEmail.trim(), suPass);
    setSuBusy(false);
    if (err) {
      setSuErr(err.message || 'Sign up failed.');
    } else {
      // Supabase may auto-confirm depending on your settings.
      // If email confirmation is off, user is logged in immediately → useEffect handles it.
      // If on, show a note.
      setStep('verify-email');
    }
  };

  const handleUsername = async (e) => {
    e.preventDefault();
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3)  { setUserErr('Min 3 characters. Letters, numbers, _ only.'); return; }
    if (clean.length > 20) { setUserErr('Max 20 characters.'); return; }
    setUserBusy(true); setUserErr('');
    const { error } = await createProfile(clean);
    setUserBusy(false);
    if (error) {
      setUserErr(error.message.includes('unique') ? 'Username taken — try another.' : error.message);
    } else {
      setStep('claim');
    }
  };

  const handleClaim = async () => {
    setClaimBusy(true);
    await claimDeviceCards(deviceId);
    setClaimBusy(false);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && step === 'auth') onClose();
  };

  const handleClose = () => {
    if (step === 'auth' || step === 'verify-email') { onClose(); return; }
    auth.signOut().then(onClose);
  };

  /* ── render ── */
  return (
    <div className="modal-overlay visible" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-close" onClick={handleClose}>✕</div>

        {/* ── AUTH (sign in / sign up tabs) ── */}
        {step === 'auth' && (
          <>
            {/* Tab toggle */}
            <div className="auth-tabs">
              <button
                className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
                onClick={() => { setTab('signin'); setSiErr(''); setSuErr(''); }}
                type="button"
              >Sign In</button>
              <button
                className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
                onClick={() => { setTab('signup'); setSiErr(''); setSuErr(''); }}
                type="button"
              >Sign Up</button>
            </div>

            {/* ── SIGN IN ── */}
            {tab === 'signin' && (
              <>
                <p className="modal-sub" style={{ marginBottom: 18 }}>
                  Welcome back — sign in with your username
                </p>
                <form onSubmit={handleSignIn}>
                  <div className="form-row" style={{ marginBottom: 10, position: 'relative' }}>
                    <span className="auth-at">@</span>
                    <input
                      className="form-input"
                      style={{ paddingLeft: 28 }}
                      type="text"
                      placeholder="username or email"
                      value={siLogin}
                      onChange={e => setSiLogin(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoFocus
                    />
                  </div>
                  <div className="form-row" style={{ marginBottom: 10 }}>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="password"
                      value={siPass}
                      onChange={e => setSiPass(e.target.value)}
                    />
                  </div>
                  {siErr && <p className="auth-error">{siErr}</p>}
                  <button className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={siBusy} type="submit">
                    {siBusy ? 'Signing in...' : 'Sign In →'}
                  </button>
                </form>
              </>
            )}

            {/* ── SIGN UP ── */}
            {tab === 'signup' && (
              <>
                <p className="modal-sub" style={{ marginBottom: 18 }}>
                  Create an account to save cards &amp; trade by username
                </p>
                <form onSubmit={handleSignUp}>
                  <div className="form-row" style={{ marginBottom: 10 }}>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="your@email.com"
                      value={suEmail}
                      onChange={e => setSuEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-row" style={{ marginBottom: 10 }}>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="password (min 6 chars)"
                      value={suPass}
                      onChange={e => setSuPass(e.target.value)}
                    />
                  </div>
                  <div className="form-row" style={{ marginBottom: 10 }}>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="confirm password"
                      value={suPass2}
                      onChange={e => setSuPass2(e.target.value)}
                    />
                  </div>
                  {suErr && <p className="auth-error">{suErr}</p>}
                  <button className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={suBusy} type="submit">
                    {suBusy ? 'Creating account...' : 'Create Account →'}
                  </button>
                </form>
              </>
            )}
          </>
        )}

        {/* ── VERIFY EMAIL (if Supabase email confirmation is on) ── */}
        {step === 'verify-email' && (
          <>
            <h3 style={{ marginBottom: 8 }}>Check your inbox</h3>
            <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
              We sent a confirmation link to <strong>{suEmail}</strong>.
              Click it to activate your account, then come back and sign in.
            </p>
            <button className="btn btn-secondary" onClick={() => setStep('auth')} type="button">
              Back to Sign In
            </button>
          </>
        )}

        {/* ── USERNAME SETUP ── */}
        {step === 'username' && (
          <>
            <h3 style={{ marginBottom: 4 }}>Pick your username</h3>
            <div className="modal-sub" style={{ marginBottom: 20 }}>
              This is how people find you when trading
            </div>
            <form onSubmit={handleUsername}>
              <div className="form-row" style={{ marginBottom: 10, position: 'relative' }}>
                <span className="auth-at">@</span>
                <input
                  className="form-input"
                  style={{ paddingLeft: 28 }}
                  placeholder="coolkid99"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  maxLength={20}
                  autoFocus
                />
              </div>
              <p style={{ fontSize: 11, color: '#888', marginBottom: 10, marginTop: -4 }}>
                3–20 chars · letters, numbers, underscores
              </p>
              {userErr && <p className="auth-error">{userErr}</p>}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                disabled={userBusy} type="submit">
                {userBusy ? 'Saving...' : 'Save Username →'}
              </button>
            </form>
          </>
        )}

        {/* ── CLAIM DEVICE CARDS ── */}
        {step === 'claim' && deviceCount > 0 && (
          <>
            <h3 style={{ marginBottom: 8 }}>Claim your cards?</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              You have <strong>{deviceCount} card{deviceCount !== 1 ? 's' : ''}</strong> on this device.
              Add them to your account so they follow you everywhere?
            </p>
            <button className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
              disabled={claimBusy} onClick={handleClaim} type="button">
              {claimBusy ? 'Claiming...' : `Yes, claim ${deviceCount} card${deviceCount !== 1 ? 's' : ''}`}
            </button>
            <button className="btn btn-secondary" onClick={onClose} type="button">
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
