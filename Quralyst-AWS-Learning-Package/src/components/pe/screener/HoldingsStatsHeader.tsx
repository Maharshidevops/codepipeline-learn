// Holdings header stat row (F29.2) — coverage counts from /api/pe/screener/holdings-stats
// (total / withDescription / withGeography / withInvestmentDate / withWebsite). Soft tiles
// matching QURALYST-20 Holdings coverage strip.
import { useQuery } from '@tanstack/react-query';
import { peScreenerService } from '@/services/api';
import { peScreenerKeys } from './peScreenerKeys';

const TILES: {
  key: 'total' | 'withDescription' | 'withGeography' | 'withInvestmentDate' | 'withWebsite';
  label: string;
}[] = [
  { key: 'total', label: 'Total holdings' },
  { key: 'withDescription', label: 'With description' },
  { key: 'withGeography', label: 'With geography' },
  { key: 'withInvestmentDate', label: 'With inv. date' },
  { key: 'withWebsite', label: 'With website' },
];

export default function HoldingsStatsHeader() {
  const { data } = useQuery({
    queryKey: peScreenerKeys.holdingsStats,
    queryFn: () => peScreenerService.getHoldingsStats(),
    staleTime: 60_000,
  });

  return (
    <div className="pes-stats" aria-label="Holdings coverage">
      {TILES.map((t) => (
        <div className="pes-stats__tile" key={t.key}>
          <div className="pes-stats__val">{data ? data[t.key].toLocaleString() : '—'}</div>
          <div className="pes-stats__label">{t.label}</div>
        </div>
      ))}
    </div>
  );
}
