import { useState, useEffect } from 'react';

export default function AuthModal({ onClose, auth, deviceId }) {
  const { user, profile, signInWithGoogle, signInWithEmail, createProfile, countDeviceCards, claimDeviceCards } = auth;

  // Determine starting step
  const initStep = () => {
    if (user && !profile) return 'username';
    return 'login';
  };

  const [step, setStep]         = useState(initStep);
  const [email, setEmail]       = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const [username, setUsername] = useState('');
  const [userBusy, setUserBusy] = useState(false);
  const [userErr, setUserErr]   = useState('');
  const [deviceCount, setDeviceCount] = useState(0);
  const [claimBusy, setClaimBusy] = useState(false);

  // Advance step when auth state changes
  useEffect(() => {
    if (user && !profile && step === 'login') setStep('username');
    if (user && !profile && step === 'email-sent') setStep('username');
  }, [user, profile]);

  // When entering claim step, count device cards
  useEffect(() => {
    if (step === 'claim' && deviceId) {
      countDeviceCards(deviceId).then(n => {
        setDeviceCount(n);
        if (n === 0) onClose(); // nothing to claim — done
      });
    }
  }, [step]);

  const handleGoogle = () => signInWithGoogle();

  const handleEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailBusy(true); setEmailErr('');
    const err = await signInWithEmail(email.trim());
    setEmailBusy(false);
    if (err) setEmailErr(err.message);
    else setStep('email-sent');
  };

  const handleUsername = async (e) => {
    e.preventDefault();
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3) { setUserErr('Min 3 characters. Letters, numbers, _ only.'); return; }
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
    if (e.target === e.currentTarget && step === 'login') onClose();
  };

  const handleClose = () => {
    if (step === 'login') { onClose(); return; }
    // On username/claim steps — sign out instead of just closing
    auth.signOut().then(onClose);
  };

  return (
    <div className="modal-overlay visible" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-close" onClick={handleClose}>✕</div>

        {/* ── LOGIN ── */}
        {step === 'login' && (
          <>
            <h3 style={{ marginBottom: 4 }}>Join SlopCards</h3>
            <div className="modal-sub" style={{ marginBottom: 20 }}>
              Save your cards across devices &amp; trade with usernames
            </div>

            <button className="btn btn-google" onClick={handleGoogle} type="button">
              <GoogleIcon /> Continue with Google
            </button>

            <div className="auth-divider"><span>or</span></div>

            <form onSubmit={handleEmail}>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <input
                  className="form-input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              {emailErr && <p className="auth-error">{emailErr}</p>}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                disabled={emailBusy} type="submit">
                {emailBusy ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          </>
        )}

        {/* ── EMAIL SENT ── */}
        {step === 'email-sent' && (
          <>
            <h3 style={{ marginBottom: 8 }}>Check your inbox</h3>
            <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
              We sent a login link to <strong>{email}</strong>. Click it to finish signing in.
            </p>
            <button className="btn btn-secondary" onClick={() => setStep('login')} type="button">
              Use a different method
            </button>
          </>
        )}

        {/* ── USERNAME SETUP ── */}
        {step === 'username' && (
          <>
            <h3 style={{ marginBottom: 4 }}>Pick your username</h3>
            <div className="modal-sub" style={{ marginBottom: 20 }}>
              This is how people see you when you trade
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
                {userBusy ? 'Saving...' : 'Save Username'}
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
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 8, flexShrink: 0 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
