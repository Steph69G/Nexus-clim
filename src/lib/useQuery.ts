import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useQuery() {
  const nav = useNavigate();
  const { search, pathname } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const get = (k: string) => params.get(k) ?? undefined;

  const set = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') p.delete(k);
      else p.set(k, String(v));
    });
    nav(`${pathname}?${p.toString()}`, { replace: true });
  };

  return { get, set, all: params, pathname };
}
