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
      "academy-settings": "La saison ou les textes de la page d’inscription sont invalides.",
      duplicate: "Cet identifiant administrateur existe déjà.",
      "last-super-admin": "Le dernier super-administrateur actif doit être conservé.",
      "self-change": "Vous ne pouvez pas suspendre ou supprimer votre propre compte.",
      "not-found": "Ce compte administrateur n’existe plus.",
      "current-password": "Le mot de passe actuel est incorrect.",
      forbidden: "Cette section est réservée aux super-administrateurs.",
      "import-completed": "Le remplissage initial a déjà été effectué et ne peut pas être relancé.",
      "import-running": "Le remplissage initial est déjà en cours.",
      "initial-import": "Le remplissage initial a échoué. Vous pouvez le relancer sans perdre les données existantes.",
      "image-upload": "L’image n’a pas pu être importée. Utilisez un fichier JPG, PNG, WebP ou GIF de 8 Mo maximum.",
      capacity: "Ce groupe a atteint sa capacité maximale.",
      "invalid-group": "Le groupe ou la catégorie sélectionnée n’est pas valide.",
      "schedule-conflict": "Ce créneau chevauche une séance existante.",
      database: "Le service de contenu est temporairement indisponible. Réessayez dans quelques instants.",
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