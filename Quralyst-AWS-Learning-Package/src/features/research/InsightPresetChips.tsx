// InsightPresetChips (Tier A / A14 / F13) — one-click chips of system preset insight questions.
// Clicking a chip adds its label as a question (the backend swaps in the full prompt at run time).
// Shared by the Target & Strategic wizard insight sections. Renders nothing if presets fail to load.
import { useEffect, useState } from 'react';
import { customInsightsService, type InsightPreset } from '@/services/api';

export interface InsightPresetChipsProps {
  /** Called with the preset label to add as a question. */
  onAdd: (label: string) => void;
}

export default function InsightPresetChips({ onAdd }: InsightPresetChipsProps) {
  const [presets, setPresets] = useState<InsightPreset[]>([]);

  useEffect(() => {
    let active = true;
    customInsightsService
      .getPresets()
      .then((p) => {
        if (active) setPresets(p);
      })
      .catch(() => {
        /* presets are a convenience — silently render nothing on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!presets.length) return null;

  return (
    <div className="d-flex flex-wrap gap-2 mb-3" aria-label="Preset insight questions">
      <span className="text-muted small w-100 mb-1">Quick add a common question:</span>
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          className="btn btn-sm btn-outline-secondary rounded-pill"
          onClick={() => onAdd(p.label)}
        >
          <i className="bi bi-plus" aria-hidden="true" /> {p.label}
        </button>
      ))}
    </div>
  );
}
