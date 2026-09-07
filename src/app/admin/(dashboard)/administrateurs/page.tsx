import { Activity, Save, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import {
  createAdminAction,
  deleteAdminAction,
  updateAdminAction,
} from "@/app/admin/actions";
import { AdminNotice } from "@/components/admin/admin-notice";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { listAdminAuditLog, listAdminUsers } from "@/lib/admin-users";

const actionLabels: Record<string, string> = {
  bootstrap_super_admin: "Création du super-admin initial",
  login: "Connexion",
  create_admin: "Création d’un compte",
  update_admin: "Modification d’un compte",
  delete_admin: "Suppression d’un compte",
  change_own_password: "Modification du mot de passe",
};

function formatDateTime(value: string | null) {
  if (!value) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdministratorsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await requireSuperAdmin();
  const [admins, audit, params] = await Promise.all([
    listAdminUsers(),
    listAdminAuditLog(),
    searchParams,
  ]);

  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <div>
          <p className="admin-kicker">Sécurité et accès</p>
          <h1>Administrateurs</h1>
          <p>Créez les accès, attribuez les rôles et révoquez immédiatement les sessions actives.</p>
        </div>
      </header>

      <AdminNotice saved={params.saved} error={params.error} />

      <section className="admin-panel admin-new-record">
        <div className="admin-panel__heading">
          <div><span><UserPlus aria-hidden="true" size={16} /></span><h2>Nouvel administrateur</h2></div>
          <p>Le mot de passe est haché avant son enregistrement.</p>
        </div>
        <form action={createAdminAction} className="admin-record-form">
          <div className="admin-form-grid">
            <label><span>Identifiant</span><input name="username" minLength={3} required /></label>
            <label><span>Nom affiché</span><input name="displayName" minLength={2} required /></label>
            <label><span>Mot de passe initial</span><input autoComplete="new-password" name="password" required type="password" /></label>
            <label>
              <span>Rôle</span>
              <select defaultValue="admin" name="role">
                <option value="admin">Administrateur</option>
                <option value="super_admin">Super-administrateur</option>
              </select>
            </label>
            <label className="admin-checkbox">
              <input defaultChecked name="active" type="checkbox" />
              <span>Compte actif</span>
            </label>
          </div>
          <div className="admin-record-actions">
            <AdminSubmitButton className="admin-button admin-button--primary" pendingLabel="Création…">
              <UserPlus aria-hidden="true" size={17} /> Créer le compte
            </AdminSubmitButton>
          </div>
        </form>
      </section>

      <section className="admin-record-list">
        <div className="admin-list-heading">
          <h2>Comptes enregistrés</h2>
          <span>{admins.length}</span>
        </div>
        {admins.map((admin) => (
          <details className="admin-record" key={admin.id}>
            <summary>
              <span className={`admin-publish-dot${admin.active ? " is-published" : ""}`} />
              <span>
                <strong>{admin.displayName}</strong>
                <small>@{admin.username} · {admin.role === "super_admin" ? "Super-admin" : "Administrateur"}</small>
              </span>
              <span className="admin-record__status">{admin.active ? "Actif" : "Suspendu"}</span>
            </summary>
            <div className="admin-record__body">
              <form action={updateAdminAction} className="admin-record-form">
                <input name="id" type="hidden" value={admin.id} />
                <div className="admin-form-grid">
                  <label><span>Identifiant</span><input defaultValue={admin.username} name="username" required /></label>
                  <label><span>Nom affiché</span><input defaultValue={admin.displayName} name="displayName" required /></label>
                  <label>
                    <span>Rôle</span>
                    <select defaultValue={admin.role} name="role">
                      <option value="admin">Administrateur</option>
                      <option value="super_admin">Super-administrateur</option>
                    </select>
                  </label>
                  <label><span>Nouveau mot de passe</span><input autoComplete="new-password" name="password" placeholder="Laisser vide pour conserver" type="password" /></label>
                  <label className="admin-checkbox">
                    <input defaultChecked={admin.active} name="active" type="checkbox" />
                    <span>Compte actif</span>
                  </label>
                </div>
                <div className="admin-account-meta">
                  <span>Dernière connexion : <strong>{formatDateTime(admin.lastLoginAt)}</strong></span>
                  <span>Créé le : <strong>{formatDateTime(admin.createdAt)}</strong></span>
                </div>
                <div className="admin-record-actions">
                  <AdminSubmitButton className="admin-button admin-button--primary">
                    <Save aria-hidden="true" size={17} /> Enregistrer
                  </AdminSubmitButton>
                </div>
              </form>
              <form action={deleteAdminAction} className="admin-delete-form">
                <input name="id" type="hidden" value={admin.id} />
                <AdminSubmitButton
                  className="admin-button admin-button--danger"
                  confirmMessage={`Supprimer définitivement le compte ${admin.username} ?`}
                  disabled={admin.id === session.id}
                  pendingLabel="Suppression…"
                >
                  <Trash2 aria-hidden="true" size={16} /> {admin.id === session.id ? "Compte actuel" : "Supprimer le compte"}
                </AdminSubmitButton>
              </form>
            </div>
          </details>
        ))}
      </section>

      <section className="admin-panel admin-audit-panel">
        <div className="admin-panel__heading">
          <div><span><Activity aria-hidden="true" size={16} /></span><h2>Journal de sécurité</h2></div>
          <p>Les 30 dernières opérations sur les comptes.</p>
        </div>
        <div className="admin-audit-list">
          {audit.map((entry) => (
            <div className="admin-audit-entry" key={entry.id}>
              <ShieldCheck aria-hidden="true" size={17} />
              <span><strong>{actionLabels[entry.actionName] || entry.actionName}</strong><small>{entry.actor || "Système"} → {entry.target || "Compte supprimé"}</small></span>
              <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
