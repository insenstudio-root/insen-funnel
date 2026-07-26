/**
 * /merci — confirmation (maquette merci-v2). Deux variantes selon ?src :
 * `form` (défaut, demande envoyée) et `booking` (créneau confirmé).
 */
import type { Metadata } from "next";
import { FunnelHeader } from "@/components/funnel/FunnelHeader";
import { MerciConversion } from "@/components/analytics/MerciConversion";
import { HOME_URL, bookingHref } from "@/lib/config";
import styles from "./merci.module.css";

export const metadata: Metadata = { title: "Merci — INSEN Studio" };

const CONTENT = {
  form: {
    eyebrow: "DEMANDE ENVOYÉE",
    intro: "Votre demande est bien arrivée. On la lit avec attention et on revient vers vous personnellement.",
    etapes: [
      { num: "01", t: "On lit votre demande — chaque mot." },
      { num: "02", t: "On vous répond personnellement." },
      { num: "03", t: "Un appel, si c'est pertinent." },
    ],
    showBooking: true,
  },
  booking: {
    eyebrow: "CRÉNEAU CONFIRMÉ",
    intro: "C'est noté. L'invitation arrive par email, avec le lien de la visioconférence.",
    etapes: [
      { num: "01", t: "Vous recevez l'invitation par email." },
      { num: "02", t: "On prépare une première lecture de votre situation." },
      { num: "03", t: "Trente minutes en visio — une lecture claire." },
    ],
    showBooking: false,
  },
} as const;

export default function MerciPage({
  searchParams,
}: {
  searchParams: { src?: string; form_type?: string; hotel?: string; camp?: string };
}) {
  const variant = searchParams.src === "booking" ? "booking" : "form";
  const c = CONTENT[variant];
  const booking = bookingHref();
  // Conversion : uniquement quand on arrive d'une soumission (form_type présent).
  const formType = searchParams.form_type;

  return (
    <div className={styles.page}>
      {formType && (
        <MerciConversion
          formType={formType}
          hotelSource={searchParams.hotel || "direct"}
          campagne={searchParams.camp || ""}
        />
      )}
      <FunnelHeader />
      <main className={styles.main}>
        <p className={styles.eyebrow}>
          <span className={styles.dot} aria-hidden="true" />
          {c.eyebrow}
        </p>
        <h1 className={styles.title}>Merci.</h1>
        <p className={styles.intro}>{c.intro}</p>

        <ol className={styles.steps}>
          {c.etapes.map((s) => (
            <li key={s.num} className={styles.step}>
              <span className={styles.num}>{s.num}</span>
              <span className={styles.stepText}>{s.t}</span>
            </li>
          ))}
        </ol>

        {c.showBooking && booking && (
          <a href={booking} className={styles.secondary}>
            <span>Réserver directement un créneau</span>
            <span aria-hidden="true">→</span>
          </a>
        )}

        <a href={HOME_URL} className={styles.primary}>
          <span className={styles.primaryDot} aria-hidden="true" />
          <span>Retour à l'accueil</span>
        </a>
      </main>
    </div>
  );
}
