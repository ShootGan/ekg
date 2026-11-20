import { useCallback, useEffect, useState } from 'react';

export interface HashRoute {
  path: string;
  params: URLSearchParams;
  navigate(to: string): void;
}

function read(): { path: string; params: URLSearchParams } {
  const raw = window.location.hash.replace(/^#/, '');
  const cut = raw.indexOf('?');
  const path = cut < 0 ? raw : raw.slice(0, cut);
  const query = cut < 0 ? '' : raw.slice(cut + 1);
  const clean = path.replace(/\/+$/, '');
  return { path: clean === '' ? '/' : clean.startsWith('/') ? clean : '/' + clean, params: new URLSearchParams(query) };
}

export function useHashRoute(): HashRoute {
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onHash = () => setRoute(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((to: string) => {
    const next = to.startsWith('#') ? to : '#/' + to.replace(/^\/+/, '');
    if (window.location.hash === next) setRoute(read());
    else window.location.hash = next;
  }, []);

  return { path: route.path, params: route.params, navigate };
}
