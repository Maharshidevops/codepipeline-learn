// MSW handlers for results (Phase 6). List paginates/filters per tab (12/page) + filename + creator;
// detail/summary/crm return seeded fixtures; save/delete return success.
import { http } from 'msw';
import { endpoints } from '@/services/endpoints';
import { err, ok } from '@/test/mocks/envelope';
import type { ResultSummary, ResultTab } from '@/types';
import {
  mockCriteriaList,
  mockCrmDetail,
  mockResultDetail,
  mockResultUsers,
  mockResultsByTab,
  mockSummaryStats,
  inputFilePreviewFor,
  resultDetailFor,
} from '@/test/mocks/fixtures/results';
import { mockUser } from '@/test/mocks/fixtures/users';

const PER_PAGE = 12;

function applyFilters(rows: ResultSummary[], url: URL): ResultSummary[] {
  let out = [...rows];
  const userFilter = url.searchParams.get('user_filter');
  if (userFilter && userFilter !== 'all') {
    const target = userFilter === 'me' ? mockUser.id : userFilter;
    out = out.filter((r) => r.userId === target);
  }
  const filename = (url.searchParams.get('filename_search') ?? '').toLowerCase();
  if (filename) {
    out = out.filter((r) =>
      (r.filesUploaded ?? []).some((f) =>
        (f.displayFilename || f.fileName).toLowerCase().includes(filename),
      ),
    );
  }
  const sortBy = url.searchParams.get('sort_by') ?? 'newest';
  out.sort((a, b) =>
    sortBy === 'oldest'
      ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt),
  );
  return out;
}

export const resultsHandlers = [
  // Phase 11: list array in data; pagination + tabType in meta.
  http.get('/api/previous-results/users', () => ok(mockResultUsers)),

  http.get('/api/previous-results/:tab', ({ params, request }) => {
    const tab = params.tab as ResultTab;
    const rows = applyFilters(mockResultsByTab[tab] ?? [], new URL(request.url));
    const page = Number(new URL(request.url).searchParams.get('page') ?? '1');
    const totalResults = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / PER_PAGE));
    const slice = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    return ok(slice, {
      meta: {
        tabType: tab,
        pagination: {
          totalItems: totalResults,
          page,
          totalPages,
          perPage: PER_PAGE,
          hasPrev: page > 1,
          hasNext: page < totalPages,
          prevNum: page > 1 ? page - 1 : undefined,
          nextNum: page < totalPages ? page + 1 : undefined,
        },
      },
    });
  }),

  http.get('/api/results/:id/summary', () =>
    ok({
      stats: mockSummaryStats,
      criteriaList: mockCriteriaList,
      processId: mockResultDetail.processId,
      totalMatches: mockSummaryStats.totalMatches,
      totalInputRecords: mockSummaryStats.totalInputRecords,
    }),
  ),
  http.get('/api/results/:id/crm', () => ok(mockCrmDetail)),
  // Detail rows are shaped by the result type (sb_* strategic buyers, fv_* PE firms, else targets).
  http.get('/api/results/:id', ({ params }) => ok(resultDetailFor(String(params.id)))),

  http.get('/api/results/:id/input-files/:fileId', ({ params }) =>
    ok(inputFilePreviewFor(String(params.id), String(params.fileId))),
  ),

  http.get('/api/results/:id/input-files/:fileId/download', () => new Response('mock-input-file')),

  http.post(endpoints.results.saveManualFields, () => ok(null, { message: 'Saved.' })),
  // Fit Override (F6) — echoes the new fit; contract mirrors the FastAPI response.
  http.post('/api/results/:id/fit-override', async ({ request }) => {
    const body = (await request.json()) as { newFit?: string };
    return ok(
      { oldFit: 'No Fit', newFit: body.newFit ?? 'Fit', fitOverridden: true },
      { message: 'Fit updated.' },
    );
  }),
  http.post('/api/quralyst_research/delete-result/:id', () =>
    ok(null, { message: 'Result deleted.' }),
  ),

  http.post('/api/previous-results/:id/send-row-email', async ({ request }) => {
    const body = (await request.json()) as {
      company_name?: string;
      recipient_email?: string;
      preview_only?: boolean;
      custom_subject?: string;
      custom_body_plain?: string;
      confirm_sender_email?: string;
    };
    const replyToEmail = mockUser.email;
    const fromEmail = 'noreply@quralyst.com';
    const subject =
      body.custom_subject || `Partnership conversation with ${body.company_name ?? 'company'}`;
    const bodyPlain =
      body.custom_body_plain ||
      `Hi there,\n\nI am reaching out about ${body.company_name ?? 'your company'}.\n\nBest,\nMock User\n\n—\nReply to: ${replyToEmail}`;
    if (!body.preview_only) {
      const confirmed = (body.confirm_sender_email || '').trim().toLowerCase();
      if (confirmed !== replyToEmail.toLowerCase()) {
        return err(400, `Confirm that replies should go to your work email (${replyToEmail}).`);
      }
    }
    return ok(
      {
        mode: 'smtp_direct',
        subject,
        bodyPlain,
        senderEmail: replyToEmail,
        replyToEmail,
        fromEmail,
        recipientEmail: body.recipient_email || 'contact@example.com',
        requiresSenderConfirm: true,
        directSendAvailable: true,
        sent: !body.preview_only,
        warning: `This email is sent by Quralyst via Amazon SMTP from ${fromEmail}. Replies go to your work email (${replyToEmail}).`,
      },
      {
        message: body.preview_only
          ? `Review your draft. Replies will go to ${replyToEmail}.`
          : `Email sent. Replies will go to ${replyToEmail}.`,
      },
    );
  }),
];
