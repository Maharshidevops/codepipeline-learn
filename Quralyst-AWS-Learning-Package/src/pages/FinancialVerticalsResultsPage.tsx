// FinancialVerticalsResultsPage — FV results detail (/financial-verticals/results/:resultId).
// Replit Financials Buyer List chrome lives in FinancialResultDetailView (fv-* layout).
import { useParams } from 'react-router-dom';
import FinancialResultDetailView from '@/features/results/resultDetail/FinancialResultDetailView';

export default function FinancialVerticalsResultsPage() {
  const { resultId } = useParams<{ resultId: string }>();

  if (!resultId) {
    return <div className="p-4 text-muted">Missing result id.</div>;
  }

  return (
    <div className="container-fluid page-top-padding">
      <FinancialResultDetailView resultId={resultId} />
    </div>
  );
}
