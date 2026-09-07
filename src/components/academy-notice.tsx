import { AlertCircle, CheckCircle2 } from "lucide-react";

const errors: Record<string, string> = {
  validation: "Vérifiez les informations saisies et les consentements obligatoires.",
  credentials: "Nom d’utilisateur, e-mail ou mot de passe incorrect.",
  duplicate: "Un compte ou un dossier existe déjà avec ces informations.",
  "invalid-group": "La date de naissance ne correspond pas aux catégories U10 à U21 pour la saison actuelle.",
  forbidden: "Cette opération n’est pas autorisée pour votre compte.",
  capacity: "Ce groupe a atteint sa capacité maximale.",
  "schedule-conflict": "Ce créneau chevauche une autre séance du groupe ou de l’entraîneur.",
  "image-upload": "La photo doit être au format JPG, PNG, WebP ou GIF et peser moins de 8 Mo.",
  "age-policy": "Un mineur doit être inscrit par son responsable légal. De 18 à 21 ans, le joueur peut créer son propre compte.",
  "identity-document": "La CIN est obligatoire pour un joueur majeur : PDF, JPG ou PNG, 8 Mo maximum.",
  database: "Le service Académie est momentanément indisponible.",
};

const successes: Record<string, string> = {
  session: "Le créneau d’entraînement est publié.",
  note: "L’observation a été ajoutée au dossier du joueur.",
  player: "La nouvelle candidature a été enregistrée.",
  attendance: "La feuille de présence est enregistrée et la séance est clôturée.",
};

export function AcademyNotice({ error, saved, registered }: { error?: string; saved?: string; registered?: string }) {
  if (error) return <div className="academy-notice is-error" role="alert"><AlertCircle size={18} />{errors[error] || errors.database}</div>;
  if (registered) return <div className="academy-notice is-success" role="status"><CheckCircle2 size={18} />{registered === "adult" ? "Compte joueur créé. Votre dossier est transmis à l’académie." : "Compte famille créé. Les dossiers sont transmis à l’académie."}</div>;
  if (saved) return <div className="academy-notice is-success" role="status"><CheckCircle2 size={18} />{successes[saved] || "Les modifications sont enregistrées."}</div>;
  return null;
}