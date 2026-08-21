// Knowledge Bank (Tier A / A1) — typed facade over http(). Org-scoped playbooks whose chunks are
// embedded server-side and retrieved into research scoring prompts. See REF-API-CONTRACTS.md.
import { http } from '../http';
import { endpoints } from '../endpoints';

export type KnowledgeCategory = 'scoring_criteria' | 'buy_box' | 'thesis' | 'playbook' | 'general';

export type KnowledgeListType = 'target' | 'strategic' | 'financial';

export type EmbeddingStatus = 'pending' | 'ready' | 'partial' | 'failed';

export interface KnowledgeEntrySummary {
  id: string;
  title: string;
  category: string;
  applies_to: string[];
  tags: string[];
  source_filename: string | null;
  embedding_status: EmbeddingStatus;
  embedding_error: string | null;
  chunk_count: number;
  body_preview: string;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface KnowledgeEntryDetail extends KnowledgeEntrySummary {
  body: string;
  chunks?: { index: number; text: string; embedded: boolean }[];
}

export interface KnowledgeEntryInput {
  title: string;
  body: string;
  category?: KnowledgeCategory;
  applies_to?: KnowledgeListType[];
  tags?: string[];
}

export interface KnowledgeSearchResult {
  entry_id: string;
  title: string;
  category: string;
  score: number;
  snippet: string;
}

export interface KnowledgeService {
  list(): Promise<KnowledgeEntrySummary[]>;
  get(id: string): Promise<KnowledgeEntryDetail>;
  create(input: KnowledgeEntryInput): Promise<KnowledgeEntryDetail>;
  update(id: string, input: Partial<KnowledgeEntryInput>): Promise<KnowledgeEntryDetail>;
  remove(id: string): Promise<{ message: string }>;
  upload(
    file: File,
    meta?: { title?: string; category?: string; appliesTo?: string[] },
  ): Promise<KnowledgeEntryDetail>;
  search(
    query: string,
    opts?: { listType?: KnowledgeListType; topK?: number },
  ): Promise<{ results: KnowledgeSearchResult[]; warning?: string }>;
}

export const knowledgeService: KnowledgeService = {
  list: async () => {
    const data = await http<{ entries: KnowledgeEntrySummary[] }>(endpoints.knowledge.list);
    return data.entries;
  },
  get: async (id) => {
    const data = await http<{ entry: KnowledgeEntryDetail }>(endpoints.knowledge.detail(id));
    return data.entry;
  },
  create: async (input) => {
    const data = await http<{ entry: KnowledgeEntryDetail }>(endpoints.knowledge.create, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.entry;
  },
  update: async (id, input) => {
    const data = await http<{ entry: KnowledgeEntryDetail }>(endpoints.knowledge.detail(id), {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return data.entry;
  },
  remove: async (id) => {
    const env = await http.full(endpoints.knowledge.detail(id), { method: 'DELETE' });
    return { message: env.message ?? '' };
  },
  upload: async (file, meta) => {
    const form = new FormData();
    form.append('file', file);
    if (meta?.title) form.append('title', meta.title);
    if (meta?.category) form.append('category', meta.category);
    if (meta?.appliesTo?.length) form.append('applies_to', meta.appliesTo.join(','));
    const data = await http<{ entry: KnowledgeEntryDetail }>(endpoints.knowledge.upload, {
      method: 'POST',
      body: form,
    });
    return data.entry;
  },
  search: async (query, opts) => {
    const env = await http.full<{ results: KnowledgeSearchResult[] }>(endpoints.knowledge.search, {
      method: 'POST',
      body: JSON.stringify({ query, list_type: opts?.listType, top_k: opts?.topK }),
    });
    return {
      results: env.data.results,
      warning: (env.meta?.warning as string | undefined) ?? undefined,
    };
  },
};
