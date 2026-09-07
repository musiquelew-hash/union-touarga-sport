import { ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { AcademyNotice } from "@/components/academy-notice";
import { AcademyRegistrationForm } from "@/components/academy-registration-form";
import { academyCategories, getAcademyRegistrationSettings } from "@/lib/academy";

export const metadata = { title: "Inscription Académie U10–U21" };

export default async function AcademyRegistrationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [params, settings] = await Promise.all([searchParams, getAcademyRegistrationSettings()]);
  return (
    <div className="academy-shell academy-registration-page">
      <header className="academy-registration-heading">
        <p className="academy-eyebrow">Saison {settings.seasonLabel}</p>
        <h1>{settings.pageTitle}</h1>
        <p>{settings.introText}</p>
        <div className="academy-age-strip">{academyCategories.map((category) => <span key={category}>{category}</span>)}</div>
      </header>
      <AcademyNotice error={params.error} />
      <AcademyRegistrationForm settings={settings} />
      <div className="academy-trust-row"><span><ShieldCheck size={18} /> {settings.trustDataText}</span><span><Users size={18} /> {settings.trustFamilyText}</span><Link href="/academie/connexion">Déjà inscrit ? Se connecter</Link></div>
    </div>
  );
}