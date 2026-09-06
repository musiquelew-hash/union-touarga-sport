import { Save } from "lucide-react";
import { saveSiteContentAction } from "@/app/admin/actions";
import { AdminImageField } from "@/components/admin/admin-image-field";
import { AdminNotice } from "@/components/admin/admin-notice";
import { getSiteContent } from "@/lib/site-content";

function InputField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label>
      <span>{label}</span>
      <input name={name} defaultValue={value} required />
    </label>
  );
}

function TextAreaField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="admin-field--wide">
      <span>{label}</span>
      <textarea name={name} defaultValue={value} rows={4} required />
    </label>
  );
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [content, params] = await Promise.all([getSiteContent(), searchParams]);

  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <div>
          <p className="admin-kicker">Identité et histoire</p>
          <h1>Contenu du site</h1>
          <p>Modifiez les textes structurants de l’accueil, du club et des éléments communs.</p>
        </div>
      </header>
      <AdminNotice saved={params.saved} error={params.error} />

      <form action={saveSiteContentAction} className="admin-editor-form">
        <section className="admin-panel">
          <div className="admin-panel__heading">
            <div><span>01</span><h2>Bandeau et accueil</h2></div>
            <p>Les messages visibles dès l’arrivée sur le site.</p>
          </div>
          <div className="admin-form-grid">
            <InputField label="Bandeau gauche" name="stripPrimary" value={content.stripPrimary} />
            <InputField label="Bandeau droit" name="stripSecondary" value={content.stripSecondary} />
            <InputField label="Sur-titre du hero" name="heroKicker" value={content.heroKicker} />
            <InputField label="Titre, première ligne" name="heroTitleTop" value={content.heroTitleTop} />
            <InputField label="Titre, seconde ligne" name="heroTitleBottom" value={content.heroTitleBottom} />
            <InputField label="Accroche forte" name="heroLeadStrong" value={content.heroLeadStrong} />
            <TextAreaField label="Introduction" name="heroLead" value={content.heroLead} />
            <InputField label="Titre du manifeste" name="manifestoTitle" value={content.manifestoTitle} />
            <TextAreaField label="Texte du manifeste" name="manifestoCopy" value={content.manifestoCopy} />
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__heading">
            <div><span>03</span><h2>Images du site</h2></div>
            <p>Prévisualisez l’image actuelle, indiquez une URL ou importez un nouveau fichier.</p>
          </div>
          <div className="admin-form-grid">
            <AdminImageField label="Écusson couleur" name="crestColorUrl" value={content.crestColorUrl} required />
            <AdminImageField label="Écusson blanc" name="crestWhiteUrl" value={content.crestWhiteUrl} required />
            <AdminImageField label="Fond de connexion" name="adminLoginImageUrl" value={content.adminLoginImageUrl} required />
            <AdminImageField label="Hero de l’accueil" name="homeHeroImageUrl" value={content.homeHeroImageUrl} required />
            <InputField label="Texte alternatif du hero" name="homeHeroImageAlt" value={content.homeHeroImageAlt} />
            <AdminImageField label="Image du manifeste" name="homeManifestoImageUrl" value={content.homeManifestoImageUrl} required />
            <InputField label="Texte alternatif du manifeste" name="homeManifestoImageAlt" value={content.homeManifestoImageAlt} />
            <AdminImageField label="Bannière Équipe" name="teamHeaderImageUrl" value={content.teamHeaderImageUrl} required />
            <InputField label="Texte alternatif Équipe" name="teamHeaderImageAlt" value={content.teamHeaderImageAlt} />
            <AdminImageField label="Bannière Matchs" name="matchesHeaderImageUrl" value={content.matchesHeaderImageUrl} required />
            <InputField label="Texte alternatif Matchs" name="matchesHeaderImageAlt" value={content.matchesHeaderImageAlt} />
            <AdminImageField label="Bannière Classement" name="standingsHeaderImageUrl" value={content.standingsHeaderImageUrl} required />
            <InputField label="Texte alternatif Classement" name="standingsHeaderImageAlt" value={content.standingsHeaderImageAlt} />
            <AdminImageField label="Bannière Club" name="clubHeaderImageUrl" value={content.clubHeaderImageUrl} required />
            <InputField label="Texte alternatif Club" name="clubHeaderImageAlt" value={content.clubHeaderImageAlt} />
            <AdminImageField label="Bannière Médias" name="mediaHeaderImageUrl" value={content.mediaHeaderImageUrl} required />
            <InputField label="Texte alternatif Médias" name="mediaHeaderImageAlt" value={content.mediaHeaderImageAlt} />
            <AdminImageField label="Image des réseaux sociaux" name="mediaSocialImageUrl" value={content.mediaSocialImageUrl} required />
            <InputField label="Texte alternatif réseaux sociaux" name="mediaSocialImageAlt" value={content.mediaSocialImageAlt} />
            <AdminImageField label="Image média de secours" name="mediaFallbackImageUrl" value={content.mediaFallbackImageUrl} required />
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__heading">
            <div><span>02</span><h2>Histoire du club</h2></div>
            <p>Présentation et repères chronologiques.</p>
          </div>
          <div className="admin-form-grid">
            <InputField label="Titre d’introduction" name="clubIntroTitle" value={content.clubIntroTitle} />
            <TextAreaField label="Premier paragraphe" name="clubIntroParagraphOne" value={content.clubIntroParagraphOne} />
            <TextAreaField label="Second paragraphe" name="clubIntroParagraphTwo" value={content.clubIntroParagraphTwo} />
          </div>
          <div className="admin-milestones">
            {content.clubMilestones.map((milestone, index) => (
              <fieldset key={`${milestone.year}-${index}`}>
                <legend>Repère {index + 1}</legend>
                <InputField label="Année" name={`milestone${index}Year`} value={milestone.year} />
                <InputField label="Titre" name={`milestone${index}Title`} value={milestone.title} />
                <TextAreaField label="Description" name={`milestone${index}Copy`} value={milestone.copy} />
              </fieldset>
            ))}
          </div>
          <div className="admin-form-grid">
            <InputField label="Nom du stade" name="clubVenueTitle" value={content.clubVenueTitle} />
            <TextAreaField label="Présentation du stade" name="clubVenueCopy" value={content.clubVenueCopy} />
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__heading">
            <div><span>04</span><h2>Liens et pied de page</h2></div>
          </div>
          <div className="admin-form-grid">
            <TextAreaField label="Signature du pied de page" name="footerStatement" value={content.footerStatement} />
            <InputField label="Instagram officiel" name="instagramUrl" value={content.instagramUrl} />
            <InputField label="YouTube officiel" name="youtubeUrl" value={content.youtubeUrl} />
          </div>
        </section>

        <div className="admin-editor-actions">
          <button className="admin-button admin-button--primary" type="submit">
            <Save aria-hidden="true" size={17} /> Enregistrer et publier
          </button>
        </div>
      </form>
    </div>
  );
}