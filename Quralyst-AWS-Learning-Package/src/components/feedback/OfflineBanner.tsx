// OfflineBanner — React port of the base.html offline IIFE (debounced offline detection +
// sticky banner; "Connection restored" toast on reconnect). The disconnect beacon is wired in
// Phase 7 alongside the progress stream.
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import './offline-banner.css';

const OFFLINE_DEBOUNCE_MS = 2000;

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const { success } = useToast();
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleOffline = () => {
      window.clearTimeout(timerRef.current);
      // Wait 2s before treating the drop as real (ignore brief blips).
      timerRef.current = window.setTimeout(() => setOffline(true), OFFLINE_DEBOUNCE_MS);
    };
    const handleOnline = () => {
      window.clearTimeout(timerRef.current);
      setOffline((wasOffline) => {
        if (wasOffline) success('Connection restored', '', true);
        return false;
      });
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.clearTimeout(timerRef.current);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [success]);

  if (!offline) return null;

  return (
    <div id="quralyst-offline-banner" className="offline-banner">
      ⚠️ You are offline. Your process continues on our servers — we&apos;ll email you when done.
    </div>
  );
}
