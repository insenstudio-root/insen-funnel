"use client";
/**
 * ProjectForm (PRD §5.3) : 5 champs qualif (secteur, projet en une phrase, maturité,
 * échéance, provenance) + 3 identité (nom, email, tél optionnel). Une colonne, labels
 * clairs, validation Zod inline, états loading/success/error, honeypot invisible.
 * Mobile-first strict. POST /api/leads.
 */
export function ProjectForm() {
  // TODO: form contrôlé + projectLeadSchema (lib/validation/lead) + fetch POST /api/leads.
  // TODO: champ honeypot `_hp` invisible ; états loading/success/error.
  return <form>{/* TODO champs */}</form>;
}
