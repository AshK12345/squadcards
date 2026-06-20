import { useState } from 'react';

const LS_KEY = 'sc-guest-handle';

export function useGuestUsername() {
  const [handle, setHandle] = useState(() => {
    try { return localStorage.getItem(LS_KEY) || null; } catch { return null; }
  });

  const saveHandle = (username) => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    try { localStorage.setItem(LS_KEY, clean); } catch {}
    setHandle(clean);
    return clean;
  };

  const clearHandle = () => {
    try { localStorage.removeItem(LS_KEY); } catch {}
    setHandle(null);
  };

  return { handle, saveHandle, clearHandle };
}
