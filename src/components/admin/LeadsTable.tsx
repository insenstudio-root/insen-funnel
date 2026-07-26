/**
 * LeadsTable (PRD §5.3) — tableau dense : nom + email, société, secteur,
 * statut (badge), source (utm_content/campagne ou « direct »), date. Lignes
 * cliquables vers la fiche.
 */
import Link from "next/link";
import { STATUS_META, SECTOR_LABELS, leadSource } from "@/lib/admin/leads";
import type { Lead } from "@/lib/admin/leads";
import styles from "@/app/admin/admin.module.css";

const cx = styles as Record<string, string>;

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
  } catch {
    return iso;
  }
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  if (!leads.length) {
    return (
      <div className={styles.tableWrap}>
        <p className={styles.empty}>Aucun lead pour ces critères.</p>
      </div>
    );
  }
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Société</th>
            <th>Secteur</th>
            <th>Statut</th>
            <th>Source</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => {
            const src = leadSource(l);
            const meta = STATUS_META[l.status] || STATUS_META.nouveau;
            return (
              <tr key={l.id}>
                <td>
                  <Link className={styles.rowLink} href={`/admin/leads/${l.id}`}>{l.full_name}</Link>
                  <div className={styles.muted}>{l.email}</div>
                </td>
                <td>{l.company || <span className={styles.muted}>—</span>}</td>
                <td>{l.sector ? SECTOR_LABELS[l.sector] || l.sector : <span className={styles.muted}>—</span>}</td>
                <td><span className={`${styles.badge} ${cx["tone_" + meta.tone]}`}>{meta.label}</span></td>
                <td>
                  {src === "direct"
                    ? <span className={styles.sourceDirect}>direct</span>
                    : <span className={styles.source}>{src}</span>}
                </td>
                <td className={styles.nowrap}>{fmtDate(l.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
