// Per-route page titles (Phase 34). Routes declare `handle: { title }` in router.tsx; the
// deepest matched handle wins and becomes "<Page> · Quralyst" on route change. Dynamic segments
// (result workspace tabs) carry their tab name in the handle. Titles are supplementary for
// history/bookmarks — the existing route-change focus management stays primary for screen readers.
import { useEffect } from 'react';
import { useMatches } from 'react-router-dom';

interface TitleHandle {
  title?: string;
}

export function usePageTitle(): void {
  const matches = useMatches();

  useEffect(() => {
    const titled = [...matches].reverse().find((m) => (m.handle as TitleHandle)?.title);
    const title = titled ? (titled.handle as TitleHandle).title : undefined;
    document.title = title ? `${title} · Quralyst` : 'Quralyst';
  }, [matches]);
}
