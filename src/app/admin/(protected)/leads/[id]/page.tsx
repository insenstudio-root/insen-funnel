/**
 * /admin/leads/[id] — fiche lead : détails + attribution + suivi (timeline
 * lead_events, changement de statut, ajout de note).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { LeadTimeline } from "@/components/admin/LeadTimeline";
import { addNoteAction } from "@/lib/admin/actions";
import { SECTOR_LABELS, CHANNEL_LABELS, leadSource } from "@/lib/admin/leads";
import type { Lead, LeadEvent } from "@/lib/admin/leads";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";

function Field({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldKey}>{k}</span>
      <span className={styles.fieldVal}>{v}</span>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: leadData } = await supabase.from("leads").select("*").eq("id", params.id).single();
  if (!leadData) notFound();
  const l = leadData as Lead;

  const { data: eventsData } = await supabase
    .from("lead_events").select("*").eq("lead_id", l.id).order("created_at", { ascending: false });
  const events = (eventsData || []) as LeadEvent[];

  // notes = JSON déposé par /api/leads (consentement, source, page…)
  let meta: Record<string, unknown> = {};
  try {
    meta = l.notes ? (JSON.parse(l.notes) as Record<string, unknown>) : {};
  } catch {
    meta = {};
  }
  const campaign = [l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(" / ");
  const addNote = addNoteAction.bind(null, l.id);

  return (
    <>
      <Link className={styles.back} href="/admin">← Tous les leads</Link>

      <div className={styles.detailHead}>
        <div>
          <h1 className={styles.detailName}>{l.full_name}</h1>
          <div className={styles.detailContact}>
            <a href={`mailto:${l.email}`}>{l.email}</a>
            {l.phone ? ` · ${l.phone}` : ""}
          </div>
        </div>
        <StatusSelect leadId={l.id} current={l.status} />
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Détails & attribution</p>
          <Field k="Société" v={l.company} />
          <Field k="Secteur" v={l.sector ? SECTOR_LABELS[l.sector] || l.sector : null} />
          <Field k="Projet / message" v={l.project_summary} />
          <Field k="Site / réseaux" v={typeof meta.current_site === "string" ? meta.current_site : null} />
          <Field k="Canal" v={CHANNEL_LABELS[l.channel] || l.channel} />
          <Field k="Source" v={leadSource(l)} />
          <Field k="Hôtel (utm_content)" v={l.utm_content} />
          <Field k="Campagne (utm)" v={campaign || null} />
          <Field k="Page d'arrivée" v={l.landing_path} />
          <Field
            k="Consentement RGPD"
            v={meta.consent ? `oui${typeof meta.consent_at === "string" ? ` — ${meta.consent_at}` : ""}` : null}
          />
          <Field k="Reçu le" v={new Date(l.created_at).toLocaleString("fr-FR")} />
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Suivi</p>
          <form className={styles.noteForm} action={addNote}>
            <textarea className={styles.noteInput} name="note" placeholder="Ajouter une note…" required />
            <button className={styles.noteBtn} type="submit">Ajouter la note</button>
          </form>
          <LeadTimeline events={events} />
        </div>
      </div>
    </>
  );
}
