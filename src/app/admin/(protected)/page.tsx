/**
 * /admin — liste des leads (lecture session authentifiée, RLS). Filtres statut /
 * canal / recherche en query params.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { STATUS_META, STATUS_ORDER, CHANNEL_LABELS } from "@/lib/admin/leads";
import type { Lead, LeadStatus, LeadChannel } from "@/lib/admin/leads";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";

type SP = { status?: string; channel?: string; q?: string };
const CHANNELS: LeadChannel[] = ["site", "outbound", "referral", "autre"];

export default async function AdminLeadsPage({ searchParams }: { searchParams: SP }) {
  const supabase = createClient();
  let query = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(300);

  const status = searchParams.status;
  const channel = searchParams.channel;
  const q = (searchParams.q || "").trim();

  if (status && STATUS_ORDER.includes(status as LeadStatus)) query = query.eq("status", status);
  if (channel && CHANNELS.includes(channel as LeadChannel)) query = query.eq("channel", channel);
  if (q) {
    // Neutralise les caractères significatifs de la syntaxe de filtre PostgREST.
    const safe = q.replace(/[,()*%\\]/g, " ").trim();
    if (safe) query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%,company.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  const leads = (data || []) as Lead[];
  const filtered = Boolean(status || channel || q);

  return (
    <>
      <h1 className={styles.pageTitle}>Leads</h1>
      <p className={styles.pageMeta}>
        {error ? "Erreur de lecture de la base." : `${leads.length} lead${leads.length > 1 ? "s" : ""}${filtered ? " (filtré)" : ""}`}
      </p>

      <form className={styles.filters} method="get">
        <select name="status" defaultValue={status || ""} aria-label="Statut">
          <option value="">Tous statuts</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select name="channel" defaultValue={channel || ""} aria-label="Canal">
          <option value="">Tous canaux</option>
          {CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
        </select>
        <input name="q" placeholder="Nom, email, société…" defaultValue={q} aria-label="Recherche" />
        <button className={styles.filterBtn} type="submit">Filtrer</button>
        {filtered && <Link className={styles.filterReset} href="/admin">Réinitialiser</Link>}
      </form>

      <LeadsTable leads={leads} />
    </>
  );
}
