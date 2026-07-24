/**
 * Notification e-mail des leads via Resend (PRD §4.3 / §5.4).
 * Envoie un e-mail à NOTIFICATION_EMAIL à chaque soumission de formulaire.
 * L'e-mail est le canal garanti : si Supabase n'est pas encore branché, le
 * lead arrive quand même dans la boîte INSEN.
 *
 * ⚠️ Ressource externe (Mehdi exécute) : créer le compte Resend, vérifier le
 *    domaine d'envoi, générer la clé, puis renseigner en variables d'env :
 *      RESEND_API_KEY      = clé API Resend (compte créé depuis contact@insenstudio.com)
 *      NOTIFICATION_EMAIL  = contact@insenstudio.com   (boîte destinataire des leads)
 *      MAIL_FROM           = "INSEN Studio <contact@insenstudio.com>"  (domaine insenstudio.com vérifié)
 *    L'adresse mehdi.allahoum@ ne doit PAS être exposée : tout passe par contact@.
 *    Voir docs/SETUP-RESEND.md.
 */
import { Resend } from "resend";

export type LeadNotification = {
  kind: "contact" | "projet";
  full_name: string;
  email: string;
  phone?: string;
  message?: string;
  fields?: Record<string, string | undefined>; // champs additionnels (secteur, maturité, UTM, consentement…)
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildBodies(lead: LeadNotification) {
  const rows: [string, string][] = [
    ["Nom", lead.full_name],
    ["E-mail", lead.email],
    ["Téléphone", lead.phone || "—"],
  ];
  if (lead.message) rows.push(["Message", lead.message]);
  for (const [k, v] of Object.entries(lead.fields || {})) {
    if (v != null && v !== "") rows.push([k, v]);
  }

  const text =
    `Nouveau lead — formulaire ${lead.kind}\n\n` +
    rows.map(([k, v]) => `${k} : ${v}`).join("\n") +
    `\n\nRépondre directement à ce mail écrit à ${lead.email}.`;

  const html =
    `<div style="font-family:-apple-system,Segoe UI,sans-serif;color:#131312;line-height:1.6;max-width:560px">` +
    `<p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5E5C57;margin:0 0 4px">INSEN — Nouveau lead · formulaire ${esc(lead.kind)}</p>` +
    `<h2 style="font-size:20px;margin:0 0 16px">${esc(lead.full_name)}</h2>` +
    `<table style="border-collapse:collapse;width:100%;font-size:14px">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#5E5C57;vertical-align:top;white-space:nowrap">${esc(
            k
          )}</td><td style="padding:6px 0;border-bottom:1px solid #E5E2DA">${esc(String(v)).replace(
            /\n/g,
            "<br>"
          )}</td></tr>`
      )
      .join("") +
    `</table>` +
    `<p style="font-size:13px;color:#5E5C57;margin-top:20px">Répondez à ce mail pour écrire directement à ${esc(
      lead.email
    )}.</p></div>`;

  return { text, html };
}

export async function notifyInsen(
  lead: LeadNotification
): Promise<{ sent: boolean; id?: string; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL;
  const from = process.env.MAIL_FROM || "INSEN Studio <onboarding@resend.dev>";

  if (!apiKey || !to) {
    // Volontairement non bloquant : on log et on continue (la route répond OK au
    // visiteur ; l'incident de config est visible côté serveur).
    console.error("[notify] Resend non configuré (RESEND_API_KEY / NOTIFICATION_EMAIL manquants).");
    return { sent: false, reason: "config" };
  }

  const resend = new Resend(apiKey);
  const { text, html } = buildBodies(lead);

  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo: lead.email, // Mehdi répond → le message part vers le prospect
    subject: `Nouveau lead — ${lead.full_name}`,
    text,
    html,
  });

  if (error) {
    console.error("[notify] Resend a renvoyé une erreur :", error);
    return { sent: false, reason: error.message || "resend_error" };
  }
  return { sent: true, id: data?.id };
}
