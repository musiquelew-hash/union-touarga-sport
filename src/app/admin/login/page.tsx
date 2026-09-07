import { ArrowRight, LockKeyhole } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { loginAction } from "@/app/admin/actions";
import { getAdminSession } from "@/lib/admin-auth";
import { getSiteContent } from "@/lib/site-content";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; passwordChanged?: string }>;
}) {
  if (await getAdminSession()) redirect("/admin");
  const [params, content] = await Promise.all([searchParams, getSiteContent()]);

  return (
    <div className="admin-login">
      <section
        className="admin-login__identity"
        style={{ "--admin-login-image": `url("${content.adminLoginImageUrl}")` } as CSSProperties}
      >
        <Image src={content.crestColorUrl} alt="Union Touarga Sport" width={96} height={112} priority />
        <span>Union Touarga Sport</span>
        <h1>Centre de gestion du club</h1>
        <p>Contenu éditorial, effectif, staff, comptes administrateurs et publications réunis au même endroit.</p>
      </section>
      <section className="admin-login__panel">
        <div className="admin-login__form-wrap">
          <LockKeyhole aria-hidden="true" size={28} />
          <p className="admin-kicker">Accès réservé</p>
          <h2>Administration</h2>
          <p>Connectez-vous avec votre identifiant et votre mot de passe.</p>
          {params.error === "credentials" && (
            <div className="admin-notice admin-notice--error" role="alert">
              Identifiant ou mot de passe incorrect.
            </div>
          )}
          {params.passwordChanged && (
            <div className="admin-notice admin-notice--success" role="status">
              Mot de passe modifié. Reconnectez-vous avec le nouveau mot de passe.
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
            <button className="admin-button admin-button--primary" type="submit">
              Se connecter <ArrowRight aria-hidden="true" size={18} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}