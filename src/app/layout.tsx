import type { Metadata } from "next";
import { Barlow_Condensed, Manrope } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Union Touarga Sport | Site du club",
    template: "%s | Union Touarga Sport",
  },
  description:
    "Suivez l'Union Touarga Sport : matchs, résultats, classement, effectif et médias du club de Rabat.",
  keywords: ["Union Touarga Sport", "UTS", "football marocain", "Botola Pro", "Rabat"],
  openGraph: {
    title: "Union Touarga Sport",
    description: "Le club de Rabat depuis 1969.",
    locale: "fr_MA",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${manrope.variable} ${barlowCondensed.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
