'use client';
import { useCallback, useEffect, useState } from 'react';

/**
 * A filter that lives in the URL instead of only in component state.
 *
 * Filters used to be local state, so a filtered list could not be shared, the
 * back button skipped straight off the screen, and returning to a tab always
 * reset it to "all". The value is mirrored into the query string with
 * replaceState, which keeps it linkable without pushing a history entry per
 * tap.
 */
export function useUrlFilter<T extends string>(key: string, allowed: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(key) as T | null;
    if (fromUrl && allowed.includes(fromUrl)) setValue(fromUrl);
    // `allowed` is a literal array at every call site; re-running on identity
    // changes would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback((next: T) => {
    setValue(next);
    const url = new URL(window.location.href);
    if (next === fallback) url.searchParams.delete(key);
    else url.searchParams.set(key, next);
    window.history.replaceState(null, '', url.toString());
  }, [key, fallback]);

  return [value, set] as const;
}
