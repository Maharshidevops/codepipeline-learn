// PresetBar (Tier A / A7 / F7) — save / load / delete named search presets for a wizard.
// Decoupled from any specific form: the page passes `getCurrentCriteria` (read the form) and
// `onLoad` (apply a preset's criteria, defensively). Private by default; a "Share with org"
// toggle exposes a preset to teammates. Self-contained: drop it above a research wizard.
import { useCallback, useEffect, useState } from 'react';
import {
  searchTemplatesService,
  type SearchTemplate,
  type TemplateMode,
  type TemplateCriteria,
} from '@/services/api';
import { useToast } from '@/hooks/useToast';

interface Props {
  mode: TemplateMode;
  getCurrentCriteria: () => TemplateCriteria;
  onLoad: (criteria: TemplateCriteria) => void;
}

export default function PresetBar({ mode, getCurrentCriteria, onLoad }: Props) {
  const toast = useToast();
  const [presets, setPresets] = useState<SearchTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);

  const refresh = useCallback(() => {
    searchTemplatesService
      .list(mode)
      .then(setPresets)
      .catch((e) => toast.error((e as { message?: string })?.message ?? 'Failed to load presets.'));
  }, [mode, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (!id) return;
    const preset = presets.find((p) => p.id === id);
    if (preset) onLoad(preset.criteria);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Give the preset a name.');
      return;
    }
    setSaving(true);
    try {
      const { template, message } = await searchTemplatesService.create({
        name: name.trim(),
        mode,
        criteria: getCurrentCriteria(),
        shared,
      });
      toast.success(message || 'Preset saved.');
      setShowSave(false);
      setName('');
      setShared(false);
      refresh();
      setSelectedId(template.id);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to save preset.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      const { message } = await searchTemplatesService.remove(selectedId);
      toast.success(message || 'Preset deleted.');
      setSelectedId('');
      refresh();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to delete preset.');
    }
  };

  return (
    <div className="preset-bar lb-preset-bar" aria-label="Search presets">
      <div className="d-flex align-items-center gap-2 me-auto">
        <span
          className="lb-preset-bar__icon d-inline-flex align-items-center justify-content-center rounded"
          aria-hidden
        >
          <i className="bi bi-bookmark" />
        </span>
        <div>
          <p className="mb-0 fw-semibold lb-preset-bar__heading" style={{ fontSize: '0.875rem' }}>
            Saved presets
          </p>
          <p className="mb-0 lb-preset-bar__subtext" style={{ fontSize: '0.75rem' }}>
            Reuse a saved set of criteria, or save the current one.
          </p>
        </div>
      </div>

      <select
        id="preset-select"
        className="form-select form-select-sm w-auto"
        value={selectedId}
        onChange={(e) => handleSelect(e.target.value)}
        aria-label="Load a saved preset"
      >
        <option value="">Load preset{presets.length ? ` (${presets.length})` : ''}</option>
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.shared ? ' (shared)' : ''}
          </option>
        ))}
      </select>

      {selectedId && (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={() => void handleDelete()}
        >
          Delete
        </button>
      )}

      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setShowSave((s) => !s)}
      >
        Save current
      </button>

      {showSave && (
        <div className="preset-save d-flex flex-wrap align-items-center gap-2 w-100 mt-1">
          <input
            type="text"
            className="form-control form-control-sm w-auto"
            placeholder="Preset name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Preset name"
          />
          <label className="form-check-label small d-flex align-items-center gap-1">
            <input
              type="checkbox"
              className="form-check-input mt-0"
              checked={shared}
              onChange={(e) => setShared(e.target.checked)}
              aria-label="Share with organization"
            />
            Share with org
          </label>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}
