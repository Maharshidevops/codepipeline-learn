// ReloadOverlay — full-screen blur overlay (reload-overlay.css; reloadPulse 2s). Shown during
// page reloads / heavy transitions on the research pages.
export interface ReloadOverlayProps {
  visible: boolean;
  message?: string;
}

export default function ReloadOverlay({ visible, message = 'Reloading…' }: ReloadOverlayProps) {
  if (!visible) return null;
  return (
    <div className="reload-overlay">
      <div className="reload-overlay-content">
        <div className="reload-spinner">
          <i className="bi bi-arrow-repeat icon-spin" aria-hidden="true" />
        </div>
        <p className="reload-message">{message}</p>
      </div>
    </div>
  );
}
