/**
 * Base /admin — enveloppe commune au login et à l'espace protégé.
 * La garde d'auth vit dans le middleware + le layout du groupe (protected).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
