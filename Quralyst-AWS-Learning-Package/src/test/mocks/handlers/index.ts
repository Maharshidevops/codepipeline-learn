// Aggregate all MSW request handlers. Per-domain handlers are added in their phases.
import { authHandlers } from './auth';
import { billingHandlers } from './billing';
import { profileHandlers } from './profile';
import { organizationHandlers } from './organization';
import { adminHandlers } from './admin';
import { resultsHandlers } from './results';
import { researchHandlers } from './research';
import { locationHandlers } from './location';
import { commentsHandlers } from './comments';
import { outcomesHandlers } from './outcomes';
import { firmMemoryHandlers } from './firmMemory';
import { searchTemplatesHandlers } from './searchTemplates';
import { memoryHandlers } from './memory';
import { dealsHandlers } from './deals';
import { notificationsHandlers } from './notifications';
import { emailSyncHandlers } from './emailSync';
import { logsHandlers } from './logs';
import { peHandlers } from './pe';
import { peAdminHandlers } from './peAdmin';
import { peReviewHandlers } from './peReview';
import { peScreenerHandlers } from './peScreener';
import { peSignalsHandlers } from './peSignals';
import { peChangesHandlers } from './peChanges';
import { peAnalyticsHandlers } from './peAnalytics';
import { peTalentFlowHandlers } from './peTalentFlow';
import { peDigestHandlers } from './peDigest';
import { peMarketMapHandlers } from './peMarketMap';
import { peQaHandlers } from './peQa';
import { peTearsheetHandlers } from './peTearsheet';
import { peNewsHandlers } from './peNews';
import { ibHandlers } from './ib';
import { usageHandlers } from './usage';
import { bdScoringHandlers } from './bdScoring';

export const handlers = [
  ...authHandlers,
  ...billingHandlers,
  ...profileHandlers,
  ...organizationHandlers,
  ...adminHandlers,
  ...resultsHandlers,
  ...researchHandlers,
  ...locationHandlers,
  ...commentsHandlers,
  ...outcomesHandlers,
  ...firmMemoryHandlers,
  ...searchTemplatesHandlers,
  ...memoryHandlers,
  ...dealsHandlers,
  ...notificationsHandlers,
  ...emailSyncHandlers,
  ...logsHandlers,
  ...peHandlers,
  ...peAdminHandlers,
  ...peReviewHandlers,
  ...peScreenerHandlers,
  ...peSignalsHandlers,
  ...peChangesHandlers,
  ...peAnalyticsHandlers,
  ...peTalentFlowHandlers,
  ...peDigestHandlers,
  ...peMarketMapHandlers,
  ...peQaHandlers,
  ...peTearsheetHandlers,
  ...peNewsHandlers,
  ...ibHandlers,
  ...usageHandlers,
  ...bdScoringHandlers,
];
