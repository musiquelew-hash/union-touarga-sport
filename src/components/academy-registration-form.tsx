"use client";

import { ArrowRight, FileCheck2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { registerAcademyPlayerAction } from "@/app/academie/actions";
import type { AcademyRegistrationSettings } from "@/lib/academy";

type RegistrationType = "guardian" | "adult";

function PlayerFields({ prefix = "", adult = false }: { prefix?: string; adult?: boolean }) {
  return (
    <>
      <div className="academy-form-grid">
        <label><span>Prénom</span><input name={`${prefix}firstName`} autoComplete={prefix ? "off" : "given-name"} required /></label>
        <label><span>Nom</span><input name={`${prefix}lastName`} autoComplete={prefix ? "off" : "family-name"} required /></label>
        <label><span>Date de naissance</span><input name={`${prefix}birthDate`} type="date" required /></label>
        <label><span>Genre</span><select name={`${prefix}gender`}><option value="male">Garçon</option><option value="female">Fille</option></select></label>
        {adult ? <input name={`${prefix}relationship`} type="hidden" value="Joueur lui-même" /> : (
          <label><span>Lien familial</span><select name={`${prefix}relationship`}><option>Parent</option><option>Tuteur légal</option><option>Autre responsable</option></select></label>
        )}
        <label><span>Nationalité</span><input name={`${prefix}nationality`} defaultValue="Maroc" required /></label>
        <label><span>Lieu de naissance</span><input name={`${prefix}birthPlace`} /></label>
        <label><span>Établissement scolaire</span><input name={`${prefix}schoolName`} /></label>
        <label><span>Niveau scolaire</span><input name={`${prefix}schoolLevel`} /></label>
        <label><span>Pied préféré</span><select name={`${prefix}preferredFoot`} defaultValue="unknown"><option value="unknown">À déterminer</option><option value="right">Droit</option><option value="left">Gauche</option><option value="both">Les deux</option></select></label>
        <label><span>Photo récente</span><input name={`${prefix}photo`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
        <label className="is-wide"><span>Vidéo YouTube de candidature <small>(facultatif)</small></span><input name={`${prefix}videoUrl`} type="url" inputMode="url" placeholder="https://youtu.be/..." /></label>
        <label className="is-wide"><span>Informations médicales utiles</span><textarea name={`${prefix}medicalNotes`} rows={3} placeholder="Allergies, traitement, contre-indications ou aucune" /></label>
      </div>
      <div className="academy-player-consents">
        <label className="academy-check"><input name={`${prefix}consentMedical`} type="checkbox" required /><span>J’autorise l’encadrement à utiliser ces informations pour la sécurité du joueur.</span></label>
        <label className="academy-check"><input name={`${prefix}consentImage`} type="checkbox" /><span>J’autorise l’utilisation de l’image du joueur dans les communications de l’académie.</span></label>
      </div>
    </>
  );
}

export function AcademyRegistrationForm({ settings }: { settings: AcademyRegistrationSettings }) {
  const [registrationType, setRegistrationType] = useState<RegistrationType>("guardian");
  const [additionalChildren, setAdditionalChildren] = useState<number[]>([]);

  function switchType(type: RegistrationType) {
    setRegistrationType(type);
    if (type === "adult") setAdditionalChildren([]);
  }

  return (
    <form action={registerAcademyPlayerAction} className="academy-registration-form">
      <input name="registrationType" type="hidden" value={registrationType} />
      <input name="additionalCount" type="hidden" value={additionalChildren.length} />

      <section className="academy-form-section academy-registration-choice">
        <div className="academy-form-section__heading"><span>01</span><div><h2>{settings.registrationQuestion}</h2><p>Le parcours dépend de l’âge du joueur au jour de l’inscription.</p></div></div>
        <div className="academy-segmented" role="group" aria-label="Type d’inscription">
          <button className={registrationType === "guardian" ? "is-active" : ""} onClick={() => switchType("guardian")} type="button">{settings.guardianModeLabel}</button>
          <button className={registrationType === "adult" ? "is-active" : ""} onClick={() => switchType("adult")} type="button">{settings.adultModeLabel}</button>
        </div>
        <p className="academy-policy-note">{registrationType === "guardian" ? settings.guardianPolicyText : settings.adultPolicyText}</p>
      </section>

      <section className="academy-form-section">
        <div className="academy-form-section__heading"><span>02</span><div><h2>{registrationType === "guardian" ? "Compte famille" : "Compte joueur"}</h2><p>{settings.accountHelpText}</p></div></div>
        <div className="academy-form-grid">
          {registrationType === "guardian" && <label><span>Nom complet du responsable</span><input name="guardianName" autoComplete="name" required /></label>}
          <label><span>Nom d’utilisateur</span><input name="username" minLength={3} pattern="[-a-zA-Z0-9._]+" autoComplete="username" required /></label>
          <label><span>E-mail</span><input name="email" type="email" autoComplete="email" required /></label>
          <label><span>Téléphone</span><input name="phone" type="tel" autoComplete="tel" required /></label>
          {registrationType === "guardian" && <><label><span>Téléphone d’urgence</span><input name="emergencyPhone" type="tel" required /></label><label><span>Ville</span><input name="city" defaultValue="Rabat" required /></label><label className="is-wide"><span>Adresse</span><input name="address" autoComplete="street-address" required /></label></>}
          <label className="is-wide"><span>Mot de passe</span><input name="password" type="password" autoComplete="new-password" required /></label>
        </div>
      </section>

      <section className="academy-form-section">
        <div className="academy-form-section__heading"><span>03</span><div><h2>{registrationType === "guardian" ? "Premier enfant" : "Dossier joueur"}</h2><p>{settings.eligibilityText}</p></div></div>
        <PlayerFields adult={registrationType === "adult"} />
        {registrationType === "adult" && <label className="academy-identity-upload"><span>CIN <strong>obligatoire</strong></span><input name="identityDocument" type="file" accept="application/pdf,image/jpeg,image/png" required /><small>PDF, JPG ou PNG, 8 Mo maximum. Accessible uniquement à l’administration.</small></label>}
      </section>

      {registrationType === "guardian" && additionalChildren.map((child, index) => (
        <section className="academy-form-section" key={child}>
          <div className="academy-form-section__heading"><span>{String(index + 4).padStart(2, "0")}</span><div><h2>Autre enfant</h2><p>Ce dossier rejoindra le même compte famille.</p></div><button className="academy-remove-child" onClick={() => setAdditionalChildren((children) => children.filter((value) => value !== child))} title="Retirer cet enfant" type="button"><Trash2 size={17} /></button></div>
          <PlayerFields prefix={`additional-${index}-`} />
        </section>
      ))}

      {registrationType === "guardian" && additionalChildren.length < 4 && <button className="academy-button academy-button--ghost academy-add-child-button" onClick={() => setAdditionalChildren((children) => [...children, Date.now()])} type="button"><Plus size={17} /> Ajouter un autre enfant</button>}

      <section className="academy-consent-panel">
        <FileCheck2 size={26} />
        <p>{settings.consentText}</p>
      </section>
      <button className="academy-button academy-button--primary academy-submit" type="submit">Transmettre {additionalChildren.length + 1 > 1 ? "les candidatures" : "la candidature"} <ArrowRight size={18} /></button>
    </form>
  );
}
