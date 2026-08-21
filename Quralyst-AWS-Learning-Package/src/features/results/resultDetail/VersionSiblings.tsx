import { Link } from 'react-router-dom';
import type { ResultVersionSibling } from '@/types';
import { paths } from '@/routes/paths';

export default function VersionSiblings({
  currentId,
  versions,
}: {
  currentId: string;
  versions?: ResultVersionSibling[];
}) {
  if (!versions || versions.length <= 1) return null;
  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
      <span className="small fw-semibold text-muted">Versions:</span>
      {versions.map((v) => {
        const active = v.processId === currentId;
        return (
          <Link
            key={v.processId}
            to={paths.result(v.processId, 'data')}
            className={`badge text-decoration-none ${active ? 'text-bg-primary' : 'text-bg-light border'}`}
            aria-current={active ? 'page' : undefined}
          >
            v{v.version}
            {typeof v.totalMatches === 'number' ? ` · ${v.totalMatches}` : ''}
          </Link>
        );
      })}
    </div>
  );
}
