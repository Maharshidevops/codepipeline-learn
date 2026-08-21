import { THEMES } from '@/styles/themes';
import { useUiStore } from '@/store/uiStore';
import { Badge } from '@/components/ui';
import '@/styles/pages/profile.css';

export default function AppearanceSection() {
  const { theme, setTheme } = useUiStore();
  const currentThemeLabel = THEMES.find((t) => t.id === theme)?.label || 'System';

  return (
    <div className="billing-section settings-appearance-section">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h3 className="billing-title mb-0 border-0 pb-0">Interface Theme</h3>
        <Badge tone="info">Active: {currentThemeLabel}</Badge>
      </div>
      <p className="text-muted small mb-4">
        Customize how Quralyst looks on your device. Choose Light for bright environments, Dark for
        low light, or System to automatically follow your operating system preferences.
      </p>

      <div className="row g-3">
        {THEMES.map((t) => {
          const isActive = theme === t.id;
          return (
            <div key={t.id} className="col-md-4">
              <button
                type="button"
                className={`theme-card ${isActive ? 'is-active' : ''}`}
                onClick={() => setTheme(t.id)}
                aria-pressed={isActive}
              >
                <div className={`theme-card__preview theme-card__preview--${t.id}`}>
                  <div className="preview-sidebar" />
                  <div className="preview-content">
                    <div className="preview-header" />
                    <div className="preview-line w-75" />
                    <div className="preview-line w-50" />
                    <div className="preview-box" />
                  </div>
                </div>
                <div className="theme-card__info">
                  <div className="d-flex align-items-center gap-2">
                    <i className={`bi ${t.icon} theme-card__icon`} aria-hidden="true" />
                    <span className="theme-card__label">{t.label}</span>
                  </div>
                  {isActive && (
                    <i className="bi bi-check-circle-fill theme-card__check" aria-hidden="true" />
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
