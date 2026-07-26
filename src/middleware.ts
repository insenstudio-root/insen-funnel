/**
 * Middleware — garde d'accès du back-office `/admin/*` (PRD §4.3).
 * Rafraîchit la session Supabase (pattern @supabase/ssr) et redirige vers
 * /admin/login toute requête /admin non authentifiée (sauf la page de login).
 * Si Supabase n'est pas configuré (Tier-1), on laisse passer sans garde.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Supabase non branché : back-office inactif, aucune garde (pas de crash).
  if (!url || !anon) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const isLogin = path === "/admin/login";

  if (!user && !isLogin) {
    const to = req.nextUrl.clone();
    to.pathname = "/admin/login";
    return NextResponse.redirect(to);
  }
  if (user && isLogin) {
    const to = req.nextUrl.clone();
    to.pathname = "/admin";
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
