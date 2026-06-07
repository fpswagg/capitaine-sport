import type { Metadata } from "next";
import { Bebas_Neue, Dancing_Script, DM_Sans } from "next/font/google";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { site } from "@/lib/catalog";
import "./globals.css";

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display"
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body"
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-script"
});

export const metadata: Metadata = {
  title: {
    default: `${site.brand} | Maillots pro à 10 000 FCFA`,
    template: `%s | ${site.brand}`
  },
  description:
    "Capitaine Sport propose des maillots pro domicile et extérieur à 10 000 FCFA, avec commande directe sur WhatsApp.",
  metadataBase: new URL("https://capitaine-sport.com"),
  keywords: [
    "Capitaine Sport",
    "maillots pro",
    "maillots football",
    "maillots FCFA",
    "maillots domicile",
    "maillots extérieur",
    "commande WhatsApp maillot"
  ],
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png"
  },
  openGraph: {
    title: `${site.brand} | Maillots pro à 10 000 FCFA`,
    description:
      "Maillots pro domicile et extérieur disponibles à 10 000 FCFA. Commande simple via WhatsApp.",
    url: "/",
    siteName: site.brand,
    locale: "fr_CM",
    type: "website",
    images: [
      {
        url: "/raw-logo.jpg",
        width: 1024,
        height: 1024,
        alt: `${site.brand} - ${site.tagline}`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.brand} | Maillots pro à 10 000 FCFA`,
    description:
      "Maillots pro domicile et extérieur disponibles à 10 000 FCFA. Commande simple via WhatsApp.",
    images: ["/raw-logo.jpg"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${bebas.variable} ${dmSans.variable} ${dancingScript.variable}`}>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
