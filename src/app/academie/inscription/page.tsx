import { ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { AcademyNotice } from "@/components/academy-notice";
import { AcademyRegistrationForm } from "@/components/academy-registration-form";
import { academyCategories, currentSeason } from "@/lib/academy";

export const metadata = { title: "Inscription Académie U10–U21" };

export default async function AcademyRegistrationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <div className="academy-shell academy-registration-page">
      <header className="academy-registration-heading">
        <p className="academy-eyebrow">Saison {currentSeason()}</p>
        <h1>Inscription Académie U10–U21</h1>
        <p>Un dossier famille pour les mineurs, ou un compte personnel avec pièce d’identité pour les joueurs de 18 à 21 ans.</p>
        <div className="academy-age-strip">{academyCategories.map((category) => <span key={category}>{category}</span>)}</div>
      </header>
      <AcademyNotice error={params.error} />
      <AcademyRegistrationForm />
      <div className="academy-trust-row"><span><ShieldCheck size={18} /> Données protégées</span><span><Users size={18} /> Un compte pour toute la famille</span><Link href="/academie/connexion">Déjà inscrit ? Se connecter</Link></div>
    </div>
  );
}