// "Regenerate PDF" — a Gamma-only re-render from the stored dossier (no research spend), which is
// the fix the backend asks for when a polished export is missing or its link has expired.
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { peTearsheetService } from '@/services/api';
import { emitErrorToast } from '@/lib/toastBus';
import type { ApiError } from '@/types';

export interface UseGammaRerunResult {
  regeneratePdf: () => void;
  regenerating: boolean;
}

/**
 * On success the tearsheet lands in `gammaStatus: 'generating'`, which the pages already poll and
 * render as "Polishing…". A 409 (incomplete tearsheet / no Gamma key) surfaces as an error toast.
 */
export function useGammaRerun(tearsheetId: string, onStarted?: () => void): UseGammaRerunResult {
  const queryClient = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);

  const regeneratePdf = useCallback(() => {
    if (!tearsheetId || regenerating) return;
    setRegenerating(true);
    peTearsheetService
      .rerunGamma(tearsheetId)
      .then((res) => {
        if (res.tearsheet) queryClient.setQueryData(['pe-tearsheet', tearsheetId], res.tearsheet);
        void queryClient.invalidateQueries({ queryKey: ['pe-tearsheet', tearsheetId] });
        onStarted?.();
      })
      .catch((error: unknown) => {
        const apiError = error as ApiError;
        emitErrorToast(
          'Could not regenerate the polished PDF',
          apiError?.message || 'Please try again, or re-run the whole tearsheet.',
        );
      })
      .finally(() => setRegenerating(false));
  }, [onStarted, queryClient, regenerating, tearsheetId]);

  return { regeneratePdf, regenerating };
}
