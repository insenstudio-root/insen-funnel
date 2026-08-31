/** @type {import('next').NextConfig} */

// HOSTA vit sous go.insenstudio.com/hosta-intelligence (arbitrage Mehdi du
// 31/08/2026, doc côté HOSTA : hosta-intelligence/docs/10-deploiement.md).
// Ce projet garde le domaine ; HOSTA est un projet Vercel à part, proxifié.
// HOSTA_ORIGIN = l'URL du déploiement HOSTA (ex. https://hosta-xxx.vercel.app),
// à poser dans les variables d'env Vercel de CE projet. Tant qu'elle est
// absente, rien ne change : ni rewrite, ni nouvelle home.
const HOSTA_ORIGIN = process.env.HOSTA_ORIGIN;

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!HOSTA_ORIGIN) return [];
    return [
      { source: "/hosta-intelligence", destination: `${HOSTA_ORIGIN}/hosta-intelligence` },
      { source: "/hosta-intelligence/:path*", destination: `${HOSTA_ORIGIN}/hosta-intelligence/:path*` },
    ];
  },
  async redirects() {
    return [
      {
        // Avec HOSTA en place, la home de go. est /hosta-intelligence.
        // En 307, pas en 301 : l'ancienne cible (www) a circulé en permanent
        // et une home peut encore changer. Les parcours /projet,
        // /consultation, /merci ne sont PAS concernés (racine exacte).
        // Sans HOSTA_ORIGIN, l'ancien renvoi vitrine reste en place.
        source: "/",
        destination: HOSTA_ORIGIN ? "/hosta-intelligence" : "https://www.insenstudio.com",
        statusCode: HOSTA_ORIGIN ? 307 : 301,
      },
    ];
  },
};

export default nextConfig;
