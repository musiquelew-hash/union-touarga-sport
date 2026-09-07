import { ArrowRight, FileCheck2, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { registerAcademyPlayerAction } from "@/app/academie/actions";
import { AcademyNotice } from "@/components/academy-notice";
import { academyCategories, currentSeason } from "@/lib/academy";

export const metadata = { title: "Inscription Académie U10–U21" };

export default async function AcademyRegistrationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <div className="academy-shell academy-registration-page">
      <header className="academy-registration-heading">
        <p className="academy-eyebrow">Saison {currentSeason()}</p>
        <h1>Inscription Académie U10–U21</h1>
        <p>Un dossier famille sécurisé pour suivre chaque étape, de la candidature à l’intégration dans un groupe.</p>
        <div className="academy-age-strip">{academyCategories.map((category) => <span key={category}>{category}</span>)}</div>
      </header>
      <AcademyNotice error={params.error} />
      <form action={registerAcademyPlayerAction} className="academy-registration-form">
        <section className="academy-form-section">
          <div className="academy-form-section__heading"><span>01</span><div><h2>Responsable légal</h2><p>Ce compte permettra de suivre le dossier et les séances.</p></div></div>
          <div className="academy-form-grid">
            <label><span>Nom complet</span><input name="guardianName" autoComplete="name" required /></label>
            <label><span>Lien avec le joueur</span><select name="relationship" defaultValue="Parent"><option>Parent</option><option>Tuteur légal</option><option>Autre responsable</option></select></label>
            <label><span>E-mail</span><input name="email" type="email" autoComplete="email" required /></label>
            <label><span>Téléphone</span><input name="phone" type="tel" autoComplete="tel" required /></label>
            <label><span>Téléphone d’urgence</span><input name="emergencyPhone" type="tel" required /></label>
            <label><span>Ville</span><input name="city" defaultValue="Rabat" required /></label>
            <label className="is-wide"><span>Adresse</span><input name="address" autoComplete="street-address" required /></label>
            <label className="is-wide"><span>Mot de passe du compte famille</span><input name="password" type="password" minLength={12} autoComplete="new-password" required /></label>
          </div>
        </section>

        <section className="academy-form-section">
          <div className="academy-form-section__heading"><span>02</span><div><h2>Jeune joueur</h2><p>La catégorie U10 à U21 est calculée automatiquement à partir de la naissance.</p></div></div>
          <div className="academy-form-grid">
            <label><span>Prénom</span><input name="firstName" autoComplete="given-name" required /></label>
            <label><span>Nom</span><input name="lastName" autoComplete="family-name" required /></label>
            <label><span>Date de naissance</span><input name="birthDate" type="date" required /></label>
            <label><span>Genre</span><select name="gender"><option value="male">Garçon</option><option value="female">Fille</option></select></label>
            <label><span>Nationalité</span><input name="nationality" defaultValue="Maroc" required /></label>
            <label><span>Lieu de naissance</span><input name="birthPlace" /></label>
            <label><span>Établissement scolaire</span><input name="schoolName" /></label>
            <label><span>Niveau scolaire</span><input name="schoolLevel" /></label>
            <label><span>Pied préféré</span><select name="preferredFoot" defaultValue="unknown"><option value="unknown">À déterminer</option><option value="right">Droit</option><option value="left">Gauche</option><option value="both">Les deux</option></select></label>
            <label><span>Photo récente</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
            <label className="is-wide"><span>Informations médicales utiles</span><textarea name="medicalNotes" rows={3} placeholder="Allergies, traitement, contre-indications ou aucune" /></label>
          </div>
        </section>

        <section className="academy-consent-panel">
          <FileCheck2 size={26} />
          <div>
            <label className="academy-check"><input name="consentMedical" type="checkbox" required /><span>J’autorise l’encadrement à utiliser ces informations pour la sécurité du joueur.</span></label>
            <label className="academy-check"><input name="consentImage" type="checkbox" /><span>J’autorise l’utilisation de l’image du joueur dans les communications de l’académie.</span></label>
          </div>
        </section>
        <button className="academy-button academy-button--primary academy-submit" type="submit">Transmettre la candidature <ArrowRight size={18} /></button>
      </form>
      <div className="academy-trust-row"><span><ShieldCheck size={18} /> Données protégées</span><span><Users size={18} /> Un compte pour toute la famille</span><Link href="/academie/connexion">Déjà inscrit ? Se connecter</Link></div>
    </div>
  );
}