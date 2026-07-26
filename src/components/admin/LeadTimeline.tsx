/**
 * LeadTimeline (PRD §5.3) — liste chronologique des `lead_events` (plus récent
 * en tête). Affiche la note pour note_added et la transition pour status_changed.
 */
import { EVENT_LABELS } from "@/lib/admin/leads";
import type { LeadEvent } from "@/lib/admin/leads";
import styles from "@/app/admin/admin.module.css";

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function LeadTimeline({ events }: { events: LeadEvent[] }) {
  if (!events.length) {
    return <p className={styles.muted} style={{ fontSize: 13 }}>Aucun événement pour l&apos;instant.</p>;
  }
  return (
    <ul className={styles.timeline}>
      {events.map((e) => {
        const p = e.payload || {};
        return (
          <li key={e.id} className={styles.event}>
            <span className={styles.eventDot} aria-hidden="true" />
            <div className={styles.eventBody}>
              <div className={styles.eventType}>{EVENT_LABELS[e.event_type] || e.event_type}</div>
              <div className={styles.eventTime}>{fmt(e.created_at)}</div>
              {e.event_type === "note_added" && p.note ? (
                <div className={styles.eventNote}>{String(p.note)}</div>
              ) : null}
              {e.event_type === "status_changed" && p.to ? (
                <div className={styles.eventNote}>{String(p.from ?? "?")} → {String(p.to)}</div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
