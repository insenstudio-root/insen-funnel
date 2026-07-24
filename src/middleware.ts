/**
 * Middleware (PRD §4.3) :
 *  1. Protège /admin/* — redirige vers login si pas de session Supabase.
 *  2. Capture UTM/referrer en cookie first-touch (30 j) sur les pages publiques
 *     (attribution même si le visiteur navigue avant de convertir).
 */
import { NextResponse, type NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  // TODO Sprint 1 : poser le cookie first-touch (lib/attribution) si absent.
  // TODO Sprint 2 : guard session Supabase sur /admin/* (lib/supabase/server).
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
