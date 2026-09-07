import type { Metadata } from "next";
import { Barlow_Condensed, Manrope } from "next/font/google";
import { SiteShell } from "@/components/site-shell";
import { getSiteContent } from "@/lib/site-content";
import "./globals.css";

export const revalidate = 300;

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
  icons: {
    icon: [{ url: "/uts/crest-white.png", type: "image/png", sizes: "256x256" }],
    shortcut: "/uts/crest-white.png",
    apple: [{ url: "/uts/crest-white.png", sizes: "256x256", type: "image/png" }],
  },
  openGraph: {
    title: "Union Touarga Sport",
    description: "Le club de Rabat depuis 1969.",
    locale: "fr_MA",
    type: "website",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const content = await getSiteContent();

  return (
    <html
      lang="fr"
      className={`${manrope.variable} ${barlowCondensed.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <SiteShell
          stripPrimary={content.stripPrimary}
          stripSecondary={content.stripSecondary}
          footerStatement={content.footerStatement}
          crestWhiteUrl={content.crestWhiteUrl}
        >
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
