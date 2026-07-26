/**
 * Layout de l'espace protégé /admin. Vérifie la session Supabase côté serveur
 * (défense en profondeur avec le middleware) et rend la coque (en-tête + logout).
 */
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/admin/actions";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className={styles.login}>
        <div className={styles.loginCard}>
          <h1 className={styles.loginTitle}>Back-office indisponible</h1>
          <p className={styles.loginSub}>
            Supabase n&apos;est pas encore branché (variables d&apos;environnement manquantes). Le
            back-office s&apos;activera dès que la base sera configurée.
          </p>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>INSEN</span>
          <span className={styles.brandSub}>Leads</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.headerUser}>{user.email}</span>
          <form action={signOutAction}>
            <button className={styles.signout} type="submit">Se déconnecter</button>
          </form>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
