"use server";
/**
 * Server actions du back-office. Écritures via SERVICE ROLE (bypass RLS — le
 * schéma n'ouvre pas d'insert `authenticated` sur lead_events), MAIS chaque
 * action vérifie d'abord une session admin (requireAdmin) : pas de mutation
 * sans authentification. Cohérent PRD §5.6 (zéro écriture client-side).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { LeadStatus } from "./leads";

async function requireAdmin() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  return user;
}

export async function signOutAction() {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function updateStatusAction(leadId: string, next: LeadStatus, current: LeadStatus) {
  await requireAdmin();
  if (next === current) return;
  const db = getAdminClient();
  if (!db) throw new Error("Supabase non configuré.");
  const { error } = await db.from("leads").update({ status: next }).eq("id", leadId);
  if (error) throw new Error(error.message);
  await db
    .from("lead_events")
    .insert({ lead_id: leadId, event_type: "status_changed", payload: { from: current, to: next } });
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin");
}

export async function addNoteAction(leadId: string, formData: FormData) {
  await requireAdmin();
  const note = String(formData.get("note") || "").trim();
  if (!note) return;
  const db = getAdminClient();
  if (!db) throw new Error("Supabase non configuré.");
  const { error } = await db
    .from("lead_events")
    .insert({ lead_id: leadId, event_type: "note_added", payload: { note } });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/leads/${leadId}`);
}
