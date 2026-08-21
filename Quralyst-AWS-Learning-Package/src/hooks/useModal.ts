// useModal — tiny open/close state helper for <Modal open={...}>.
import { useCallback, useState } from 'react';

export function useModal(initial = false) {
  const [open, setOpen] = useState(initial);
  const show = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  return { open, show, close, toggle, setOpen };
}
