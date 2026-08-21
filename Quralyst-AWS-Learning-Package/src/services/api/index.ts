// Barrel for service interfaces. Components import services from here.
// Additional services (results, organization, billing, admin, location, progress, research)
// are added in their respective phases.
export { authService } from './authService';
export type { AuthService } from './authService';
export { billingService } from './billingService';
export type { BillingService } from './billingService';
export { profileService } from './profileService';
export type { ProfileService } from './profileService';
export { preferencesService } from './preferencesService';
export type { PreferencesService } from './preferencesService';
export { processService } from './processService';
export type { ProcessService } from './processService';
export { organizationService } from './organizationService';
export type { OrganizationService } from './organizationService';
export { adminService } from './adminService';
export type { AdminService } from './adminService';
export { resultsService } from './resultsService';
export type {
  ResultsService,
  FitLabel,
  FitOverridePayload,
  FitOverrideResult,
} from './resultsService';
export { researchService } from './researchService';
export type {
  ResearchService,
  StartResult,
  FvDatabaseUploadResult,
  FileMappingPreview,
  MappingColumn,
  MappingConfidence,
  ColumnOverrides,
  HeaderOverrides,
} from './researchService';
export { locationService } from './locationService';
export type { LocationService } from './locationService';
export { progressService } from './progressService';
export type { ProgressService, OpenStreamOptions, StreamProcessType } from './progressService';
export { commentsService } from './commentsService';
export type { CommentsService } from './commentsService';
export { memoryService } from './memoryService';
export type {
  MemoryService,
  UserMemory,
  UserMemoryUpdateInput,
  LearnedKind,
} from './memoryService';
export { customInsightsService } from './customInsightsService';
export type { CustomInsightsService, InsightPreset } from './customInsightsService';
export { enrichService } from './enrichService';
export type { EnrichService, EnrichMode, EnrichStatus, EnrichRowStatus } from './enrichService';
export { customColumnService } from './customColumnService';
export type {
  CustomColumnService,
  CustomColumnStatus,
  CustomColumnStartResult,
} from './customColumnService';
export { mandateService } from './mandateService';
export type {
  MandateService,
  MandatePrefill,
  MandateGeography,
  MandateIntent,
  ParseMandateInput,
} from './mandateService';
export { orgMemoryService } from './orgMemoryService';
export type {
  OrgMemoryService,
  OrgMemory,
  OrgMemoryUpdateInput,
  OrgMemoryResult,
  OrgAutoSignals,
} from './orgMemoryService';
export { outcomesService, OUTCOME_LABELS, normalizeFirmKey } from './outcomesService';
export type {
  OutcomesService,
  OutcomeValue,
  ResultKind,
  ResolvedOutcome,
  Scorecard,
  ScorecardMatrix,
  ScorecardRun,
  ScoreBands,
  ScoreBandCell,
} from './outcomesService';
export { firmMemoryService, signalCount, SIGNAL_LISTS, SIGNAL_LABELS } from './firmMemoryService';
export type {
  FirmMemoryService,
  FirmMemory,
  FirmMemoryUpsertInput,
  SignalList,
} from './firmMemoryService';
export { searchTemplatesService } from './searchTemplatesService';
export type {
  SearchTemplatesService,
  SearchTemplate,
  SearchTemplateCreateInput,
  SearchTemplateUpdateInput,
  TemplateMode,
  TemplateCriteria,
} from './searchTemplatesService';
export { knowledgeService } from './knowledgeService';
export type {
  KnowledgeService,
  KnowledgeEntrySummary,
  KnowledgeEntryDetail,
  KnowledgeEntryInput,
  KnowledgeSearchResult,
  KnowledgeCategory,
  KnowledgeListType,
  EmbeddingStatus,
} from './knowledgeService';
export {
  dealsService,
  BUYER_TYPES,
  BUYER_TYPE_LABELS,
  buyerTypeLabel,
  CONTACT_OUTREACH_STATUSES,
  CONTACT_OUTREACH_LABELS,
  normalizeContactOutreach,
} from './dealsService';
export type {
  DealsService,
  Deal,
  DealStage,
  DealMember,
  DealActivity,
  DealType,
  DealStatus,
  MemberRole,
  BuyerType,
  CompanyRecord,
  RecordContact,
  ContactOutreachStatus,
  DealComment,
  BuyerLogRow,
  BulkAddResult,
  DealBrief,
  DealListLink,
  BriefStatus,
  MemberCandidate,
  PipelineSummaryItem,
} from './dealsService';
export { notificationsService } from './notificationsService';
export type {
  NotificationsService,
  DealNotification,
  NotificationList,
  NotificationType,
} from './notificationsService';
export { emailSyncService } from './emailSyncService';
export type {
  EmailSyncService,
  EmailSyncStatus,
  MailboxStatus,
  MailboxProvider,
  EmailInteractionDto,
  PriorContact,
} from './emailSyncService';
export { peAdminService } from './peAdminService';
export type { PEAdminService } from './peAdminService';
export { peReviewService } from './peReviewService';
export type { PEReviewService } from './peReviewService';
export { peScreenerService } from './peScreenerService';
export type { PEScreenerService } from './peScreenerService';
export { peSignalsService } from './peSignalsService';
export type { PESignalsService } from './peSignalsService';
export { peChangesService } from './peChangesService';
export type { PEChangesService } from './peChangesService';
export { peAnalyticsService } from './peAnalyticsService';
export type { PEAnalyticsService } from './peAnalyticsService';
export { peTalentFlowService } from './peTalentFlowService';
export type { PETalentFlowService } from './peTalentFlowService';
export { peDigestService } from './peDigestService';
export type { PEDigestService } from './peDigestService';
export { peMarketMapService } from './peMarketMapService';
export type { PEMarketMapService } from './peMarketMapService';
export { peQaService } from './peQaService';
export type { PEQaService } from './peQaService';
export { peTearsheetService } from './peTearsheetService';
export type { PETearsheetService } from './peTearsheetService';
export { peNewsService } from './peNewsService';
export type { PENewsService } from './peNewsService';
export { homeNewsService } from './homeNewsService';
export type { HomeNewsService } from './homeNewsService';
export { peDataToolsService } from './peDataToolsService';
export type { PEDataToolsService } from './peDataToolsService';
export { ibService } from './ibService';
export type { IBService } from './ibService';
export { usageService } from './usageService';
export type { UsageService } from './usageService';
export { bdScoringService } from './bdScoringService';
export type { BdScoringService } from './bdScoringService';
export { peService, peFirmKeys } from './peService';
export type {
  PEService,
  PEFirmsQuery,
  PEFirmsList,
  PEHoldingsQuery,
  PEHoldingsList,
  PEHoldingPatch,
  PEHoldingSortBy,
  PEHoldingSortDir,
  PEPeopleQuery,
  PEPeopleList,
  PEEmailOpBody,
} from './peService';
