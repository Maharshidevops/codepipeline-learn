// Temporary placeholder for routes not yet built (Phases 2–7 replace these).
interface PagePlaceholderProps {
  name: string;
}

export default function PagePlaceholder({ name }: PagePlaceholderProps) {
  return (
    <div className="container page-top-padding">
      <div className="card">
        <h2 className="dashboard-title">{name}</h2>
        <p className="text-muted mb-0">
          This page is a Phase-0 placeholder. It will be implemented in a later phase.
        </p>
      </div>
    </div>
  );
}
