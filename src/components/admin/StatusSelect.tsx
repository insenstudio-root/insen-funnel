"use client";
/**
 * StatusSelect (PRD §5.3) — change le statut d'un lead. onChange → server action
 * `updateStatusAction` (écriture service-role + event status_changed). Jamais
 * d'update direct côté client.
 */
import { useTransition } from "react";
import { updateStatusAction } from "@/lib/admin/actions";
import { STATUS_META, STATUS_ORDER } from "@/lib/admin/leads";
import type { LeadStatus } from "@/lib/admin/leads";
import styles from "@/app/admin/admin.module.css";

export function StatusSelect({ leadId, current }: { leadId: string; current: LeadStatus }) {
  const [pending, start] = useTransition();
  return (
    <div className={styles.statusForm}>
      <select
        key={current}
        className={styles.statusSelect}
        defaultValue={current}
        disabled={pending}
        aria-label="Statut du lead"
        onChange={(e) => {
          const next = e.target.value as LeadStatus;
          start(() => updateStatusAction(leadId, next, current));
        }}
      >
        {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
      </select>
    </div>
  );
}
