// PE Corrections page (F27.3) — QURALYST-20 Corrections.tsx chrome + institutional-memory
// surface (recent corrections + learned rules). Gated by /pe RoleRoute (pe:dataset); enable /
// disable / apply are staff-only inside CorrectionsPanel (can('pe:admin')).
// Contract: backend REF-API-CONTRACT.md §PE Dataset — Corrections.
import CorrectionsPanel from '@/components/pe/review/CorrectionsPanel';

export default function PECorrectionsPage() {
  // No .container wrapper — matches Analysis / Q20 AppShell full-width content.
  return <CorrectionsPanel />;
}
