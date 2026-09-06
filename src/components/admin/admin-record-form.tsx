import { Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  deleteRecordAction,
  saveMediaAction,
  saveNewsAction,
  savePlayerAction,
  saveStaffAction,
} from "@/app/admin/actions";
import { AdminImageField } from "@/components/admin/admin-image-field";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import type { CmsKind, CmsRecord } from "@/lib/relational-cms-db";
import type {
  MediaSummary,
  NewsSummary,
  PlayerSummary,
  StaffSummary,
} from "@/lib/uts-data";

type RecordData = PlayerSummary | StaffSummary | NewsSummary | MediaSummary;

const actions = {
  player: savePlayerAction,
  staff: saveStaffAction,
  news: saveNewsAction,
  media: saveMediaAction,
} satisfies Record<CmsKind, (formData: FormData) => Promise<void>>;

function InputField({
  label,
  name,
  value,
  type = "text",
  required,
  step,
  placeholder,
  wide,
}: {
  label: string;
  name: string;
  value?: string | number | null;
  type?: string;
  required?: boolean;
  step?: string;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "admin-field--wide" : undefined}>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        required={required}
        step={step}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextAreaField({ label, name, value }: { label: string; name: string; value?: string | null }) {
  return (
    <label className="admin-field--wide">
      <span>{label}</span>
      <textarea name={name} defaultValue={value ?? ""} rows={3} />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <label>
      <span>{label}</span>
      <select name={name} defaultValue={value}>{children}</select>
    </label>
  );
}

function utcDateTime(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000).toISOString().slice(0, 16) : "";
}

function PlayerFields({ data }: { data?: PlayerSummary }) {
  return (
    <>
      {data && <input type="hidden" name="id" value={data.id} />}
      <InputField label="Nom complet" name="name" value={data?.name} required />
      <InputField label="Nom affiché" name="shortName" value={data?.shortName} />
      <SelectField label="Poste" name="position" value={data?.position || "Joueur"}>
        {['Gardien', 'Défenseur', 'Milieu', 'Attaquant', 'Joueur'].map((position) => (
          <option key={position}>{position}</option>
        ))}
      </SelectField>
      <InputField label="Numéro" name="number" value={data?.number} />
      <InputField label="Âge" name="age" value={data?.age} type="number" />
      <InputField label="Taille (cm)" name="height" value={data?.height} type="number" />
      <SelectField label="Pied préféré" name="foot" value={data?.foot || ""}>
        <option value="">Non renseigné</option>
        <option>Droit</option>
        <option>Gauche</option>
        <option>Les deux</option>
      </SelectField>
      <InputField label="Nationalité" name="nationality" value={data?.nationality || "Maroc"} required />
      <InputField label="Code pays" name="countryCode" value={data?.countryCode} placeholder="MA" />
      <AdminImageField label="Photo du joueur" name="imageUrl" value={data?.imageUrl} variant="portrait" />
      <InputField label="Apparitions" name="appearances" value={data?.appearances} type="number" />
      <InputField label="Buts" name="goals" value={data?.goals} type="number" />
      <InputField label="Passes décisives" name="assists" value={data?.assists} type="number" />
      <InputField label="Note" name="rating" value={data?.rating} type="number" step="0.01" />
    </>
  );
}

function StaffFields({ data }: { data?: StaffSummary }) {
  return (
    <>
      {data && <input type="hidden" name="id" value={data.id} />}
      <InputField label="Nom complet" name="name" value={data?.name} required />
      <InputField label="Fonction" name="role" value={data?.role} required />
      <SelectField label="Département" name="department" value={data?.department || "Technique"}>
        <option>Technique</option>
        <option>Médical</option>
        <option>Direction</option>
        <option>Autre</option>
      </SelectField>
      <AdminImageField label="Photo du membre" name="imageUrl" value={data?.imageUrl} variant="portrait" />
    </>
  );
}

function NewsFields({ data }: { data?: NewsSummary }) {
  return (
    <>
      {data && <input type="hidden" name="id" value={data.id} />}
      <InputField label="Titre" name="title" value={data?.title} required wide />
      <TextAreaField label="Résumé" name="summary" value={data?.summary} />
      <InputField label="Lien de l’article" name="url" value={data?.url} type="url" required wide />
      <AdminImageField label="Image de l’article" name="imageUrl" value={data?.imageUrl} />
      <InputField label="Texte alternatif" name="imageAlt" value={data?.imageAlt} wide />
      <InputField label="Date et heure (UTC)" name="dateTime" value={utcDateTime(data?.timestamp)} type="datetime-local" />
    </>
  );
}

function MediaFields({ data }: { data?: MediaSummary }) {
  return (
    <>
      {data && <input type="hidden" name="id" value={data.id} />}
      <InputField label="Titre" name="title" value={data?.title} required wide />
      <InputField label="Lien du média" name="url" value={data?.url} type="url" required wide />
      <AdminImageField label="Miniature du média" name="thumbnailUrl" value={data?.thumbnailUrl} />
      <InputField label="Date et heure (UTC)" name="dateTime" value={utcDateTime(data?.timestamp)} type="datetime-local" />
    </>
  );
}

function Fields({ kind, data }: { kind: CmsKind; data?: RecordData }) {
  switch (kind) {
    case "player": return <PlayerFields data={data as PlayerSummary | undefined} />;
    case "staff": return <StaffFields data={data as StaffSummary | undefined} />;
    case "news": return <NewsFields data={data as NewsSummary | undefined} />;
    case "media": return <MediaFields data={data as MediaSummary | undefined} />;
  }
}

function summary(kind: CmsKind, data: RecordData) {
  switch (kind) {
    case "player": {
      const player = data as PlayerSummary;
      return { title: player.name, meta: `${player.position}${player.number ? ` · #${player.number}` : ""}` };
    }
    case "staff": {
      const member = data as StaffSummary;
      return { title: member.name, meta: `${member.role} · ${member.department}` };
    }
    case "news": {
      const article = data as NewsSummary;
      return { title: article.title, meta: article.timestamp ? new Date(article.timestamp * 1000).toLocaleDateString("fr-FR") : "Sans date" };
    }
    case "media": {
      const media = data as MediaSummary;
      return { title: media.title, meta: "Média" };
    }
  }
}

function EditorForm({ kind, record }: { kind: CmsKind; record?: CmsRecord<RecordData> }) {
  return (
    <form action={actions[kind]} className="admin-record-form">
      {record && <input type="hidden" name="recordKey" value={record.key} />}
      <div className="admin-form-grid">
        <Fields kind={kind} data={record?.data} />
        <InputField label="Ordre d’affichage" name="sortOrder" value={record?.sortOrder || 0} type="number" />
        <label className="admin-checkbox">
          <input name="published" type="checkbox" defaultChecked={record?.published ?? true} />
          <span>Publié sur le site</span>
        </label>
      </div>
      <div className="admin-record-actions">
        <AdminSubmitButton className="admin-button admin-button--primary" pendingLabel="Enregistrement…">
          <Save aria-hidden="true" size={16} /> {record ? "Enregistrer" : "Créer et publier"}
        </AdminSubmitButton>
      </div>
    </form>
  );
}

export function AdminNewRecord({ kind }: { kind: CmsKind }) {
  return (
    <section className="admin-panel admin-new-record">
      <div className="admin-panel__heading">
        <div><span>+</span><h2>Nouvel élément</h2></div>
        <p>Il sera enregistré dans MySQL et publié sur le site.</p>
      </div>
      <EditorForm kind={kind} />
    </section>
  );
}

export function AdminRecordEditor({ kind, record }: { kind: CmsKind; record: CmsRecord<RecordData> }) {
  const item = summary(kind, record.data);
  return (
    <details className="admin-record">
      <summary>
        <span className={`admin-publish-dot${record.published ? " is-published" : ""}`} aria-hidden="true" />
        <span>
          <strong>{item.title}</strong>
          <small>{item.meta} · {record.syncWithSource ? "Import initial" : "Piloté par dashboard"}</small>
        </span>
        <span className="admin-record__status">{record.published ? "Publié" : "Masqué"}</span>
      </summary>
      <div className="admin-record__body">
        <EditorForm kind={kind} record={record} />
        <form action={deleteRecordAction} className="admin-delete-form">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="recordKey" value={record.key} />
          <AdminSubmitButton
            className="admin-button admin-button--danger"
            confirmMessage="Supprimer définitivement cet élément ?"
            pendingLabel="Suppression…"
          >
            <Trash2 aria-hidden="true" size={16} /> Supprimer
          </AdminSubmitButton>
        </form>
      </div>
    </details>
  );
}