/**
 * Source de vérité des enums du funnel /projet — ids + libellés repris mot pour
 * mot de la maquette V2 (projet-v2.dc.html). Consommé par : le schéma Zod
 * (valeurs), les mappers email/DB (value→label) et le formulaire (rendu).
 */
export const SECTEUR_VALUES = [
  "hotellerie", "restauration", "sante", "commerce", "marques", "autre",
] as const;
export const MATURITE_VALUES = ["idee", "defini", "reprendre"] as const;
export const ECHEANCE_VALUES = [
  "des_que_possible", "ce_trimestre", "cette_annee", "pas_de_date",
] as const;

export type Secteur = (typeof SECTEUR_VALUES)[number];
export type Maturite = (typeof MATURITE_VALUES)[number];
export type Echeance = (typeof ECHEANCE_VALUES)[number];

export const SECTEUR_LABELS: Record<Secteur, string> = {
  hotellerie: "Hôtellerie",
  restauration: "Restauration & lieux",
  sante: "Santé",
  commerce: "Commerce & services",
  marques: "Marques & entrepreneurs",
  autre: "Autre",
};
export const MATURITE_LABELS: Record<Maturite, string> = {
  idee: "Une idée à cadrer",
  defini: "Un projet défini, à lancer",
  reprendre: "Un système à reprendre",
};
export const MATURITE_DESC: Record<Maturite, string> = {
  idee: "Le projet reste à définir.",
  defini: "Le besoin est clair, reste à l'installer.",
  reprendre: "Ça existe, mais ça ne travaille pas.",
};
export const ECHEANCE_LABELS: Record<Echeance, string> = {
  des_que_possible: "Dès que possible",
  ce_trimestre: "Ce trimestre",
  cette_annee: "Cette année",
  pas_de_date: "Pas de date",
};

export const SECTEURS = SECTEUR_VALUES.map((v) => ({ value: v, label: SECTEUR_LABELS[v] }));
export const MATURITES = MATURITE_VALUES.map((v) => ({
  value: v, label: MATURITE_LABELS[v], desc: MATURITE_DESC[v],
}));
export const ECHEANCES = ECHEANCE_VALUES.map((v) => ({ value: v, label: ECHEANCE_LABELS[v] }));

export const PROVENANCES = [
  "Recherche Google", "Recommandation", "Réseaux sociaux", "Plaquette / print", "Autre",
] as const;
