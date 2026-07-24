/**
 * /admin/leads/[id] — fiche lead : timeline lead_events, changement de statut, notes. PRD §4.3.
 */
export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <h1>Lead {params.id}</h1>
      {/* TODO: <LeadTimeline /> + <StatusSelect /> + zone notes (écriture via route API) */}
    </main>
  );
}
