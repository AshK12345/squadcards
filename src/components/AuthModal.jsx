import { useState, useEffect } from 'react';

export default function AuthModal({ onClose, auth, deviceId }) {
  const { user, profile, signInWithEmail, createProfile, countDeviceCards, claimDeviceCards } = auth;

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
              We sent a login link to <strong>{email}</strong>. Click it to finish signing in — link expires in 1 hour.
            </p>
            <button className="btn btn-secondary" onClick={() => setStep('login')} type="button">
              Use a different email
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

