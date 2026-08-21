// ViewPreviousResultPage — Data tab body for the result workspace
// (/quralyst-research/result/:id/data). Target/Strategic lists use the modular
// ResultDetailView (CRM is inline there). Summary / Preview remain on ResultLayout tabs/routes.
import { useParams } from 'react-router-dom';
import ResultDetailView from '@/features/results/ResultDetailView';

export default function ViewPreviousResultPage() {
  const { resultId } = useParams<{ resultId: string }>();

  if (!resultId) {
    return <div className="p-4 text-muted">Missing result id.</div>;
  }

  return (
    <div className="container-fluid page-top-padding">
      <ResultDetailView resultId={resultId} />
    </div>
  );
}
