import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INSEN Studio",
  description: "Réservez un échange avec INSEN Studio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
