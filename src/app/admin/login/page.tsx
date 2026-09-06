import { ArrowRight, LockKeyhole, ShieldAlert } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/admin/actions";
import { getAdminSession, isAdminAuthConfigured } from "@/lib/admin-auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAdminSession()) redirect("/admin");
  const params = await searchParams;
  const configured = isAdminAuthConfigured();

  return (
    <div className="admin-login">
      <section className="admin-login__identity">
        <Image src="/uts/crest-color.png" alt="Union Touarga Sport" width={96} height={112} priority />
        <span>Union Touarga Sport</span>
        <h1>Centre de gestion du club</h1>
        <p>Contenu éditorial, effectif, calendrier, classement et publications réunis au même endroit.</p>
      </section>
      <section className="admin-login__panel">
        <div className="admin-login__form-wrap">
          <LockKeyhole aria-hidden="true" size={28} />
          <p className="admin-kicker">Accès réservé</p>
          <h2>Administration</h2>
          <p>Connectez-vous avec les identifiants définis dans les variables privées du déploiement.</p>

          {!configured && (
            <div className="admin-notice admin-notice--error" role="alert">
              <ShieldAlert aria-hidden="true" size={18} />
              Définissez d’abord <code>ADMIN_PASSWORD</code> et <code>ADMIN_SESSION_SECRET</code>.
            </div>
          )}
          {params.error === "credentials" && (
            <div className="admin-notice admin-notice--error" role="alert">
              Identifiant ou mot de passe incorrect.
            </div>
          )}
          {params.error === "setup" && (
            <div className="admin-notice admin-notice--error" role="alert">
              L’authentification administrateur n’est pas encore configurée.
            </div>
          )}

          <form action={loginAction} className="admin-form admin-login__form">
            <label>
              <span>Identifiant</span>
              <input name="username" autoComplete="username" defaultValue="admin" required />
            </label>
            <label>
              <span>Mot de passe</span>
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button className="admin-button admin-button--primary" disabled={!configured} type="submit">
              Se connecter <ArrowRight aria-hidden="true" size={18} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}