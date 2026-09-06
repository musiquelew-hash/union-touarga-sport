import { AlertCircle, CheckCircle2 } from "lucide-react";

export function AdminNotice({ saved, error }: { saved?: string; error?: string }) {
  if (saved) {
    return (
      <div className="admin-notice admin-notice--success" role="status">
        <CheckCircle2 aria-hidden="true" size={18} />
        Les modifications sont publiées.
      </div>
    );
  }

  if (error) {
    const message = error === "validation"
      ? "Certains champs sont incomplets ou invalides. Vérifiez le formulaire."
      : "La base MySQL n’est pas joignable. Vérifiez sa liaison et ses variables Railway.";
    return (
      <div className="admin-notice admin-notice--error" role="alert">
        <AlertCircle aria-hidden="true" size={18} />
        {message}
      </div>
    );
  }

  return null;
}