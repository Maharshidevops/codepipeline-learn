// Search Templates (Tier A / A7) — typed facade over http(). Saved, named wizard presets per mode
// (target|strategic|financial). `criteria` is the full wizard config, stored/returned literally so it
// round-trips exactly what the form produced. Private by default; `shared` exposes to the org.
import { http } from '../http';
import { endpoints } from '../endpoints';

export type TemplateMode = 'target' | 'strategic' | 'financial';

// The wizard config is free-form (keys are the form's own field names) — kept opaque here.
export type TemplateCriteria = Record<string, unknown>;

export interface SearchTemplate {
  id: string;
  name: string;
  mode: TemplateMode;
  criteria: TemplateCriteria;
  criteria_version: number;
  shared: boolean;
  owner_id: string;
  updated_at: string | null;
}

export interface SearchTemplateCreateInput {
  name: string;
  mode: TemplateMode;
  criteria: TemplateCriteria;
  shared?: boolean;
}

export interface SearchTemplateUpdateInput {
  name?: string;
  criteria?: TemplateCriteria;
  shared?: boolean;
}

export interface SearchTemplatesService {
  list(mode?: TemplateMode): Promise<SearchTemplate[]>;
  get(id: string): Promise<SearchTemplate | null>;
  create(input: SearchTemplateCreateInput): Promise<{ template: SearchTemplate; message: string }>;
  update(
    id: string,
    input: SearchTemplateUpdateInput,
  ): Promise<{ template: SearchTemplate; message: string }>;
  remove(id: string): Promise<{ message: string }>;
}

export const searchTemplatesService: SearchTemplatesService = {
  list: async (mode) => {
    const url = mode
      ? `${endpoints.searchTemplates.list}?mode=${encodeURIComponent(mode)}`
      : endpoints.searchTemplates.list;
    const data = await http<{ templates: SearchTemplate[] }>(url);
    return data.templates ?? [];
  },
  get: async (id) => {
    const data = await http<{ template: SearchTemplate }>(endpoints.searchTemplates.detail(id));
    return data.template ?? null;
  },
  create: async (input) => {
    const env = await http.full<{ template: SearchTemplate }>(endpoints.searchTemplates.create, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return { template: env.data.template, message: env.message ?? '' };
  },
  update: async (id, input) => {
    const env = await http.full<{ template: SearchTemplate }>(
      endpoints.searchTemplates.update(id),
      {
        method: 'PUT',
        body: JSON.stringify(input),
      },
    );
    return { template: env.data.template, message: env.message ?? '' };
  },
  remove: async (id) => {
    const env = await http.full<null>(endpoints.searchTemplates.remove(id), { method: 'DELETE' });
    return { message: env.message ?? '' };
  },
};
