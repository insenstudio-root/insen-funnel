"use client";
/**
 * Événement de CONVERSION : generate_lead, déclenché une fois à l'arrivée sur
 * /merci après une soumission de formulaire. Les valeurs (form_type, hotel_source,
 * campagne) sont passées dans l'URL par le formulaire — aucune donnée personnelle.
 * À marquer comme conversion (« événement clé ») dans GA4.
 */
import { useEffect, useRef } from "react";
import { gaEvent } from "@/lib/ga";

export function MerciConversion({
  formType,
  hotelSource,
  campagne,
}: {
  formType: string;
  hotelSource: string;
  campagne: string;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    gaEvent("generate_lead", {
      form_type: formType,
      hotel_source: hotelSource || "direct",
      campagne: campagne || "",
    });
  }, [formType, hotelSource, campagne]);
  return null;
}
