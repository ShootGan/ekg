import { useCallback, useEffect, useState } from 'react';

const KEY = 'ekg-real';
const EVT = 'ekg-real-change';

export function readReal(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function useReal(): [boolean, (v: boolean) => void] {
  const [real, setRealState] = useState(readReal);

  useEffect(() => {
    const sync = () => setRealState(readReal());
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setReal = useCallback((v: boolean) => {
    try {
      localStorage.setItem(KEY, v ? '1' : '0');
    } catch {
      /* tylko w pamięci */
    }
    setRealState(v);
    window.dispatchEvent(new Event(EVT));
  }, []);

  return [real, setReal];
}
