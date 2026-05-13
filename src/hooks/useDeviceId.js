import { useState, useEffect } from 'react';

const KEY = 'sc-device-id';

function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useDeviceId() {
  const [deviceId] = useState(() => {
    let id = localStorage.getItem(KEY);
    if (!id) { id = generateId(); localStorage.setItem(KEY, id); }
    return id;
  });
  return deviceId;
}
