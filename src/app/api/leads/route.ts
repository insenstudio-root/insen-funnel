/**
 * POST /api/leads (PRD §4.3) — server-side, service role, JAMAIS d'insert client.
 *
 * Reçoit les soumissions du FORMULAIRE DE CONTACT de la vitrine (cross-origin,
 * insenstudio.com → go.insenstudio.com) ET du formulaire /projet (aiguillage
 * par forme du payload, voir `classifyPayload`).
 * Flux : parse (JSON fetch ou form urlencoded) → honeypot → aiguillage projet/contact →
 *   e-mail Resend à contact@insenstudio.com (canal GARANTI)
 *   + insert best-effort dans `leads` (si Supabase configuré).
 * Réponse : JSON {ok:true} pour fetch ; 303 → /merci pour un POST de formulaire
 *   sans JS. CORS pour l'origine vitrine.
 */
import { NextResponse, type NextRequest } from "next/server";
import { contactLeadSchema, projectLeadSchema } from "../../../lib/validation/lead";
import { classifyPayload, projetEmailFields, projetDbRow } from "../../../lib/leads/projet";
import { notifyInsen } from "../../../lib/email/notify";
import { getAdminClient } from "../../../lib/supabase/admin";

export const runtime = "nodejs"; // le SDK Resend n'est pas compatible edge

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  "https://insenstudio.com,https://www.insenstudio.com"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);
  const ct = req.headers.get("content-type") || "";
  const wantsJson = (req.headers.get("accept") || "").includes("application/json");

  // --- 1. Parse : JSON (fetch) ou formulaire urlencoded (repli sans JS) ---
  let data: Record<string, unknown> = {};
  let isFormPost = false;
  try {
    if (ct.includes("application/json")) {
      data = (await req.json()) as Record<string, unknown>;
    } else if (ct.includes("form")) {
      isFormPost = true;
      const fd = await req.formData();
      fd.forEach((v, k) => (data[k] = typeof v === "string" ? v : ""));
    }
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400, headers: cors });
  }

  // --- 2. Honeypot : champ caché rempli = bot → succès silencieux, aucun envoi ---
  if (typeof data.company_website === "string" && data.company_website.trim() !== "") {
    return isFormPost && !wantsJson
      ? redirectMerci(cors)
      : NextResponse.json({ ok: true }, { headers: cors });
  }

  // --- 3. Aiguillage projet vs contact ---
  const kind = classifyPayload(data);

  if (kind === "projet") {
    const parsed = projectLeadSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "validation", issues: parsed.error.flatten().fieldErrors },
        { status: 400, headers: cors }
      );
    }
    const lead = parsed.data;
    if (!lead.consent_at) lead.consent_at = new Date().toISOString();

    const emailRes = await notifyInsen({
      kind: "projet",
      full_name: lead.full_name,
      email: lead.email,
      phone: lead.phone || undefined,
      message: lead.project_summary,
      fields: projetEmailFields(lead),
    }).catch((e) => {
      console.error("[leads] notifyInsen (projet) a levé :", e);
      return { sent: false as const, reason: "throw" };
    });

    let dbOk = false;
    const db = getAdminClient();
    if (db) {
      const { error } = await db.from("leads").insert(projetDbRow(lead));
      if (error) console.error("[leads] insert projet a échoué :", error.message);
      else dbOk = true;
    }

    if (!emailRes.sent && !dbOk) {
      console.error(
        "[leads] PERTE lead projet (aucun canal) :",
        JSON.stringify({
          full_name: lead.full_name, email: lead.email, phone: lead.phone || null,
          project_summary: lead.project_summary, sector: lead.sector, consent_at: lead.consent_at,
        })
      );
      return NextResponse.json({ ok: false, error: "delivery" }, { status: 502, headers: cors });
    }
    return isFormPost && !wantsJson
      ? redirectMerci(cors)
      : NextResponse.json({ ok: true }, { headers: cors });
  }

  // --- 4. Validation Zod (consentement RGPD obligatoire) ---
  const parsed = contactLeadSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation", issues: parsed.error.flatten().fieldErrors },
      { status: 400, headers: cors }
    );
  }
  const lead = parsed.data;
  if (!lead.consent_at) lead.consent_at = new Date().toISOString();

  // Le parcours /consultation « audit_funnel » emprunte ce même canal (il porte
  // un `message`) ; on marque le type pour le tri côté boîte INSEN.
  const notifKind = lead.source === "audit_funnel" ? "audit" : "contact";

  // --- 5. E-mail Resend (canal garanti) ---
  const emailRes = await notifyInsen({
    kind: notifKind,
    full_name: lead.full_name,
    email: lead.email,
    phone: lead.phone || undefined,
    message: lead.message,
    fields: {
      Source: lead.source,
      "Site / réseaux": lead.current_site || undefined,
      Page: lead.page_path || lead.landing_path,
      Campagne:
        [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ") || undefined,
      Consentement: lead.consent ? `oui (${lead.consent_at || "date non fournie"})` : "non",
      "Texte du consentement": lead.consent_text || undefined,
    },
  }).catch((e) => {
    console.error("[leads] notifyInsen a levé :", e);
    return { sent: false as const, reason: "throw" };
  });

  // --- 6. Persistance best-effort dans `leads` (si Supabase configuré) ---
  let dbOk = false;
  const db = getAdminClient();
  if (db) {
    // NB : le schéma 0001_init.sql n'a pas encore de colonnes de consentement ;
    // on stocke la preuve RGPD + méta dans `notes` en attendant la migration.
    const { error } = await db.from("leads").insert({
      full_name: lead.full_name,
      email: lead.email,
      phone: lead.phone || null,
      project_summary: lead.message,
      utm_source: lead.utm_source || null,
      utm_medium: lead.utm_medium || null,
      utm_campaign: lead.utm_campaign || null,
      utm_content: lead.utm_content || null,
      landing_path: lead.landing_path || null,
      referrer: lead.referrer || null,
      channel: "site",
      notes: JSON.stringify({
        form: notifKind === "audit" ? "audit_funnel" : "contact_vitrine",
        source: lead.source,
        current_site: lead.current_site || null,
        consent: lead.consent,
        consent_text: lead.consent_text,
        consent_at: lead.consent_at,
        utm_term: lead.utm_term,
        page_path: lead.page_path,
        locale: lead.locale,
      }),
    });
    if (error) console.error("[leads] insert Supabase a échoué :", error.message);
    else dbOk = true;
  }

  // --- 7. Si les DEUX canaux ont échoué, on signale l'échec au visiteur ---
  if (!emailRes.sent && !dbOk) {
    console.error(
      "[leads] PERTE lead contact/audit (aucun canal) :",
      JSON.stringify({
        full_name: lead.full_name, email: lead.email, phone: lead.phone || null,
        message: lead.message, source: lead.source, consent_at: lead.consent_at,
      })
    );
    return NextResponse.json({ ok: false, error: "delivery" }, { status: 502, headers: cors });
  }

  // --- 8. Réponse ---
  return isFormPost && !wantsJson
    ? redirectMerci(cors)
    : NextResponse.json({ ok: true }, { headers: cors });
}

function redirectMerci(cors: Record<string, string>) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://go.insenstudio.com";
  return NextResponse.redirect(`${base}/merci?src=form`, { status: 303, headers: cors });
}
