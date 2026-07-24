/**
 * POST /api/webhooks/calcom (PRD §4.3) — booking Cal.com.
 * Signature vérifiée → upsert lead (match email) → lead_events(booking_*) → statut call_reserve → email.
 */
import { NextResponse, type NextRequest } from "next/server";

export async function POST(_req: NextRequest) {
  // TODO 1: VÉRIFIER LA SIGNATURE (CALCOM_WEBHOOK_SECRET) avant tout traitement — sinon 401.
  // TODO 2: parser l'event (booking created/rescheduled/cancelled).
  // TODO 3: upsert lead par email ; lead_events(booking_*) ; status = call_reserve (si created).
  // TODO 4: email notification interne.
  return NextResponse.json({ ok: true });
}
