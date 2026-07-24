/**
 * /admin — layout protégé (guard auth Supabase). PRD §4.3.
 * Inaccessible sans session (redirection login). Le middleware couvre aussi /admin/*.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // TODO: vérifier la session Supabase (lib/supabase/server) ; rediriger si absente.
  return <section>{children}</section>;
}
