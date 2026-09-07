import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { academyLoginAction } from "@/app/academie/actions";
import { AcademyNotice } from "@/components/academy-notice";
import { getAcademySession } from "@/lib/academy-auth";

export const metadata = { title: "Connexion Académie" };

export default async function AcademyLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAcademySession()) redirect("/academie/espace");
  const params = await searchParams;
  return (
    <div className="academy-shell academy-auth-page">
      <section className="academy-auth-intro">
        <p className="academy-eyebrow">Union Touarga Sport</p>
        <h1>Espace Académie</h1>
        <p>Le point de contact entre les familles, les entraîneurs et la formation U10–U21.</p>
        <div className="academy-age-strip">{Array.from({ length: 12 }, (_, index) => <span key={index}>U{index + 10}</span>)}</div>
      </section>
      <section className="academy-auth-form">
        <LockKeyhole size={30} />
        <h2>Connexion</h2>
        <AcademyNotice error={params.error} />
        <form action={academyLoginAction} className="academy-form">
          <label><span>Nom d’utilisateur ou e-mail</span><input name="identifier" autoComplete="username" required /></label>
          <label><span>Mot de passe</span><input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="academy-button academy-button--primary" type="submit">Ouvrir mon espace <ArrowRight size={17} /></button>
        </form>
        <p className="academy-auth-link">Première inscription ? <Link href="/academie/inscription">Créer un dossier joueur</Link></p>
      </section>
    </div>
  );
}