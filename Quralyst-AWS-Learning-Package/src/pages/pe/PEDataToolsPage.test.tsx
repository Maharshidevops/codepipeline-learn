import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PEDataToolsPage from '@/pages/pe/PEDataToolsPage';
import { peDataToolsService } from '@/services/api';

vi.mock('@/services/api', () => ({
  peDataToolsService: {
    recentUrl: vi.fn(async () => []),
    recentPe: vi.fn(async () => []),
    recentLocation: vi.fn(async () => []),
    recentGics: vi.fn(async () => []),
    listJobs: vi.fn(async () => ({ jobs: [], total: 0, limit: 20, offset: 0 })),
    urlLookup: vi.fn(),
    peLookup: vi.fn(),
    locationLookup: vi.fn(),
    gicsClassify: vi.fn(),
    bulkUrl: vi.fn(async () => ({
      id: 'job-1',
      jobType: 'url_lookup',
      status: 'processing',
      total: 1,
      processed: 0,
      found: 0,
      notFoundCount: 0,
      errorCount: 0,
      createdAt: new Date().toISOString(),
    })),
    bulkPe: vi.fn(),
    bulkLocation: vi.fn(),
    bulkGics: vi.fn(),
    classifyHoldings: vi.fn(),
    getJob: vi.fn(async () => ({
      id: 'job-1',
      jobType: 'url_lookup',
      status: 'completed',
      total: 1,
      processed: 1,
      found: 1,
      notFoundCount: 0,
      errorCount: 0,
      createdAt: new Date().toISOString(),
    })),
    getJobResults: vi.fn(),
    resumeJob: vi.fn(),
  },
}));

function wrap(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('PEDataToolsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three modes: single, paste CSV, upload file', async () => {
    wrap(<PEDataToolsPage />);
    expect(screen.getByRole('heading', { name: /data tools/i })).toBeInTheDocument();
    expect(screen.getByTestId('mode-single')).toBeInTheDocument();
    expect(screen.getByTestId('mode-paste')).toBeInTheDocument();
    expect(screen.getByTestId('mode-upload')).toBeInTheDocument();
    expect(screen.getByTestId('url-company')).toBeInTheDocument();
    expect(screen.getByTestId('demo-csv-panel')).toBeInTheDocument();
  });

  it('can view and download demo CSV for the active tool', async () => {
    const user = userEvent.setup();
    wrap(<PEDataToolsPage />);
    expect(screen.queryByTestId('demo-csv-raw')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('demo-csv-view'));
    expect(screen.getByTestId('demo-csv-raw')).toHaveTextContent(
      'companyName,location,description',
    );
    expect(screen.getByTestId('demo-csv-download')).toBeInTheDocument();
  });

  it('paste CSV mode submits parsed rows', async () => {
    const user = userEvent.setup();
    wrap(<PEDataToolsPage />);
    await user.click(screen.getByTestId('mode-paste'));
    expect(screen.getByTestId('bulk-textarea')).toBeInTheDocument();

    await user.type(
      screen.getByTestId('bulk-textarea'),
      'companyName,location,description{enter}Acme,NY,Widgets',
    );
    await user.click(screen.getByTestId('run-bulk'));

    await waitFor(() => {
      expect(peDataToolsService.bulkUrl).toHaveBeenCalledWith([
        { companyName: 'Acme', location: 'NY', description: 'Widgets' },
      ]);
    });
  });

  it('upload mode accepts CSV and starts a job', async () => {
    const user = userEvent.setup();
    wrap(<PEDataToolsPage />);
    await user.click(screen.getByTestId('mode-upload'));
    expect(screen.getByTestId('bulk-file-input')).toBeInTheDocument();
    expect(screen.queryByTestId('bulk-textarea')).not.toBeInTheDocument();

    const input = screen.getByTestId('bulk-file-input') as HTMLInputElement;
    const file = new File(['companyName,location,description\nAcme,NY,Widgets\n'], 'bulk.csv', {
      type: 'text/csv',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/1 row/i)).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('run-bulk-upload'));
    await waitFor(() => {
      expect(peDataToolsService.bulkUrl).toHaveBeenCalledWith([
        { companyName: 'Acme', location: 'NY', description: 'Widgets' },
      ]);
    });
  });
});
