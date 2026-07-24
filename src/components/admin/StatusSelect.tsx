"use client";
/**
 * StatusSelect (PRD §5.3) : changement de statut d'un lead → écrit via route API
 * (lead_events(status_changed)). Statuts : nouveau · call_reserve · call_effectue ·
 * proposition · signe · perdu · non_qualifie.
 */
export function StatusSelect() {
  // TODO: <select> des statuts + onChange → POST route API (jamais d'update client direct).
  return <select>{/* TODO options */}</select>;
}
