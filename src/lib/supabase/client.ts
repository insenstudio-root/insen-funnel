/**
 * Client Supabase NAVIGATEUR (anon key). Utilisé UNIQUEMENT pour l'auth admin
 * (login / logout) côté client. ⚠️ JAMAIS d'insert lead ici — toute écriture de
 * donnée passe par une route API ou une server action service-role (PRD §5.6).
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}
