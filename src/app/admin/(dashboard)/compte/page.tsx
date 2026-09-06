import { KeyRound } from "lucide-react";
import { changeOwnPasswordAction } from "@/app/admin/actions";
import { AdminNotice } from "@/components/admin/admin-notice";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [session, params] = await Promise.all([requireAdmin(), searchParams]);

  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <div>
          <p className="admin-kicker">Compte personnel</p>
          <h1>{session.displayName}</h1>
          <p>@{session.username} · {session.role === "super_admin" ? "Super-administrateur" : "Administrateur"}</p>
        </div>
      </header>

      <AdminNotice error={params.error} />

      <section className="admin-panel admin-account-password">
        <div className="admin-panel__heading">
          <div><span><KeyRound aria-hidden="true" size={16} /></span><h2>Changer le mot de passe</h2></div>
          <p>Après modification, toutes les sessions du compte sont révoquées.</p>
        </div>
        <form action={changeOwnPasswordAction} className="admin-form">
          <label><span>Mot de passe actuel</span><input autoComplete="current-password" name="currentPassword" required type="password" /></label>
          <label><span>Nouveau mot de passe</span><input autoComplete="new-password" minLength={12} name="newPassword" required type="password" /></label>
          <label><span>Confirmer le nouveau mot de passe</span><input autoComplete="new-password" minLength={12} name="confirmPassword" required type="password" /></label>
          <AdminSubmitButton className="admin-button admin-button--primary" pendingLabel="Modification…">
            <KeyRound aria-hidden="true" size={17} /> Modifier et se reconnecter
          </AdminSubmitButton>
        </form>
      </section>
    </div>
  );
}
