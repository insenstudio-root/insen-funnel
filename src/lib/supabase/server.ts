/**
 * Client Supabase SERVER-SIDE (session utilisateur admin, via cookies).
 * Utilisé par le layout/pages `/admin` et les server actions pour lire avec la
 * session authentifiée (RLS `authenticated`). Ne bypass PAS RLS (≠ admin.ts).
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/** true si les variables publiques Supabase sont présentes (sinon back-office inactif). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un Server Component (cookies en lecture seule) :
            // le middleware rafraîchit la session, on ignore sans risque.
          }
        },
      },
    }
  );
}
