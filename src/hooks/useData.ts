import { useCallback, useEffect, useState } from 'react';
import { friendlyError } from '../lib/errors';
import { supabaseConfigured } from '../lib/supabase';

export function useData<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({
    data: null,
    loading: supabaseConfigured,
    error: supabaseConfigured ? null : 'The website is not connected to its database yet.',
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((e) => alive && setState({ data: null, loading: false, error: friendlyError(e) }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
