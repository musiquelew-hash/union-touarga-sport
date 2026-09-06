import { AlertCircle, CheckCircle2 } from "lucide-react";

export function AdminNotice({ saved, error }: { saved?: string; error?: string }) {
  if (saved) {
    return (
      <div className="admin-notice admin-notice--success" role="status">
        <CheckCircle2 aria-hidden="true" size={18} />
        {saved === "imported" ? "Le remplissage initial du site est terminé." : "Les modifications sont publiées."}
      </div>
    );
  }

  if (error) {
    const messages: Record<string, string> = {
      validation: "Certains champs sont incomplets ou invalides. Vérifiez le formulaire.",
      duplicate: "Cet identifiant administrateur existe déjà.",
      "last-super-admin": "Le dernier super-administrateur actif doit être conservé.",
      "self-change": "Vous ne pouvez pas suspendre ou supprimer votre propre compte.",
      "not-found": "Ce compte administrateur n’existe plus.",
      "current-password": "Le mot de passe actuel est incorrect.",
      forbidden: "Cette section est réservée aux super-administrateurs.",
      "import-completed": "Le remplissage initial a déjà été effectué et ne peut pas être relancé.",
      "import-running": "Le remplissage initial est déjà en cours.",
      "initial-import": "Le remplissage initial a échoué. Vous pouvez le relancer sans perdre les données existantes.",
      database: "La base MySQL n’est pas joignable. Vérifiez sa liaison et ses variables Railway.",
    };
    const message = messages[error] || messages.database;
    return (
      <div className="admin-notice admin-notice--error" role="alert">
        <AlertCircle aria-hidden="true" size={18} />
        {message}
      </div>
    );
  }

  return null;
}