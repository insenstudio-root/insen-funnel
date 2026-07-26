"use client";
/**
 * /admin/login — connexion admin (email + mot de passe, Supabase Auth).
 * Après connexion, redirection vers /admin (le middleware valide la session).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "@/app/admin/admin.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setError("Identifiants invalides.");
        setLoading(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Connexion impossible. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <div className={styles.login}>
      <form className={styles.loginCard} onSubmit={onSubmit}>
        <h1 className={styles.loginTitle}>INSEN — Back-office</h1>
        <p className={styles.loginSub}>Connexion à l&apos;espace leads.</p>
        <div className={styles.loginField}>
          <label className={styles.loginLabel} htmlFor="email">Email</label>
          <input
            className={styles.loginInput} id="email" type="email" autoComplete="username"
            required value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.loginField}>
          <label className={styles.loginLabel} htmlFor="password">Mot de passe</label>
          <input
            className={styles.loginInput} id="password" type="password" autoComplete="current-password"
            required value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className={styles.loginBtn} type="submit" disabled={loading}>
          {loading ? "Connexion…" : "Se connecter"}
        </button>
        {error && <p className={styles.loginError} role="alert">{error}</p>}
      </form>
    </div>
  );
}
