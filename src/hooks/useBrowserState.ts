"use client";

import { useSyncExternalStore } from "react";

/**
 * A subscribable view of a browser value that fires no events of its own,
 * such as `Notification.permission` or a localStorage key.
 *
 * These are external stores, not React state, so they belong in
 * `useSyncExternalStore`. Reading them in an effect and calling setState works
 * but causes a cascading second render on every mount, and React 19 flags it.
 * Callers that change the underlying value call `notify()` afterwards.
 *
 * `read` must return a primitive, or a referentially stable object, because
 * React calls it on every render to check for changes.
 */
export interface BrowserStore<T> {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  notify: () => void;
}

export function createBrowserStore<T>(
  read: () => T,
  serverValue: T,
  /** Optional DOM events that should also trigger a re-read. */
  bind?: (onChange: () => void) => () => void,
): BrowserStore<T> {
  const listeners = new Set<() => void>();
  let unbind: (() => void) | null = null;

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      if (bind && listeners.size === 1) unbind = bind(notify);
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0 && unbind) {
          unbind();
          unbind = null;
        }
      };
    },
    getSnapshot: read,
    getServerSnapshot: () => serverValue,
    notify,
  };
}

export function useBrowserStore<T>(store: BrowserStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

/**
 * A clock that ticks once a minute.
 *
 * Snapshots are rounded to the minute so the value is referentially stable
 * between renders within the same minute, which `useSyncExternalStore`
 * requires. Relative timestamps then age on their own rather than freezing at
 * whatever the page said when it loaded.
 */
const MINUTE = 60_000;

export function useNow(serverNow: number): number {
  return useSyncExternalStore(
    (onChange) => {
      const timer = setInterval(onChange, MINUTE);
      return () => clearInterval(timer);
    },
    () => Math.floor(Date.now() / MINUTE) * MINUTE,
    () => serverNow,
  );
}
