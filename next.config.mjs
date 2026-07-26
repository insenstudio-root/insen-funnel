/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        // go.insenstudio.com/ n'héberge pas de home : on renvoie vers le site
        // vitrine (pour le moment). Les parcours /projet, /consultation, /merci
        // ne sont PAS concernés (source = racine exacte uniquement).
        source: "/",
        destination: "https://www.insenstudio.com",
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
