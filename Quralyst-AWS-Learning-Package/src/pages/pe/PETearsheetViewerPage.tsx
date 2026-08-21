// Full-page polished tearsheet viewer (no app sidebar) — opens in its own browser tab.
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { TearsheetDeck } from '@/components/pe/tearsheet/TearsheetDeck';
import { PolishedTearsheetView } from '@/components/pe/tearsheet/PolishedTearsheetView';
import { peTearsheetService } from '@/services/api';
import { paths } from '@/routes/paths';
import { buildTearsheetPath } from '@/lib/tearsheet/openTearsheet';
import type { ApiError, Tearsheet } from '@/types';

const GAMMA_POLL_MS = 3000;

function gammaReady(row: Tearsheet | null | undefined): boolean {
  return row?.gammaStatus === 'complete' && !!row.gammaPdfReady;
}

function gammaGenerating(row: Tearsheet | null | undefined): boolean {
  return row?.gammaStatus === 'generating';
}

export default function PETearsheetViewerPage() {
  const { id = '' } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'polished' | 'deck'>('polished');
  const [regenerating, setRegenerating] = useState(false);
  const userChoseDeckRef = useRef(false);

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ['pe-tearsheet', id],
    queryFn: () => peTearsheetService.get(id),
    enabled: !!id,
    staleTime: 0,
    refetchInterval: (query) => {
      const row = query.state.data as Tearsheet | undefined;
      if (row?.status === 'complete' && gammaGenerating(row) && !gammaReady(row)) {
        return GAMMA_POLL_MS;
      }
      if (row && !['complete', 'failed', 'cancelled'].includes(row.status)) {
        return GAMMA_POLL_MS;
      }
      return false;
    },
  });

  useEffect(() => {
    if (data?.companyName) document.title = `${data.companyName} — Tearsheet`;
  }, [data?.companyName]);

  useEffect(() => {
    if (gammaReady(data) && !userChoseDeckRef.current) setMode('polished');
  }, [data]);

  const regenerate = async () => {
    if (!id || regenerating) return;
    const ok = window.confirm(
      `Regenerate the tearsheet for ${data?.companyName ?? 'this company'}? This re-runs research and may incur API costs.`,
    );
    if (!ok) return;
    setRegenerating(true);
    try {
      const next = await peTearsheetService.rerun(id);
      queryClient.setQueryData(['pe-tearsheet', id], next);
      void queryClient.invalidateQueries({ queryKey: ['pe-tearsheet', id] });
    } catch (err) {
      const apiErr = err as ApiError;
      window.alert(apiErr?.message || 'Failed to regenerate tearsheet.');
    } finally {
      setRegenerating(false);
    }
  };

  if (!id) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-light">
        Missing tearsheet id.
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 text-light"
        data-testid="tearsheet-viewer-loading"
      >
        <Spinner />
        <p className="mb-0">Loading tearsheet…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 px-3 text-center text-light"
        data-testid="tearsheet-viewer-error"
      >
        <p className="mb-0">{(error as Error).message || 'Could not load tearsheet.'}</p>
        <Link to={paths.pe.tearsheet} className="btn btn-outline-light btn-sm">
          Back to tearsheets
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const polishing =
    data.status === 'complete' && !!data.content && gammaGenerating(data) && !gammaReady(data);
  const inFlight =
    regenerating ||
    polishing ||
    (!['complete', 'failed', 'cancelled'].includes(data.status) && isFetching);

  if (inFlight) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 text-light"
        data-testid="tearsheet-viewer-polishing"
      >
        <Spinner />
        <h1 className="h5 mb-0">
          {regenerating ? 'Regenerating tearsheet' : 'Polishing tearsheet'}
        </h1>
        <p className="mb-0 text-secondary">{data.companyName}</p>
        <p className="small text-secondary mb-0">
          {polishing
            ? 'Gamma is producing the polished PDF…'
            : 'Research providers are rebuilding the dossier…'}
        </p>
      </div>
    );
  }

  if (data.status === 'failed') {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 px-3 text-center text-light"
        data-testid="tearsheet-viewer-failed"
      >
        <p className="mb-0">{data.errorMessage || 'Generation failed.'}</p>
        <button type="button" className="btn btn-light btn-sm" onClick={() => void regenerate()}>
          Try again
        </button>
      </div>
    );
  }

  const polished = gammaReady(data);

  if (mode === 'polished' && polished) {
    return (
      <PolishedTearsheetView
        data={data}
        fullscreen
        regenerating={regenerating}
        onRegenerate={() => void regenerate()}
        onViewData={() => {
          userChoseDeckRef.current = true;
          setMode('deck');
        }}
      />
    );
  }

  if (data.status === 'complete' && data.content) {
    return (
      <div className="h-100 p-2 p-md-3" style={{ boxSizing: 'border-box' }}>
        <TearsheetDeck
          data={data}
          regenerating={regenerating}
          onRegenerate={() => void regenerate()}
          polishedReady={polished}
          onViewPolished={
            polished
              ? () => {
                  userChoseDeckRef.current = false;
                  setMode('polished');
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="d-flex flex-column align-items-center justify-content-center h-100 gap-3 text-light">
      <p className="mb-0">Tearsheet is not ready yet.</p>
      <Link
        to={buildTearsheetPath(data.companyName, data.website)}
        className="btn btn-outline-light btn-sm"
      >
        Open generation page
      </Link>
    </div>
  );
}
