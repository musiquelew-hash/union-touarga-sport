"use client";

import { ImagePlus } from "lucide-react";
import type { CSSProperties, ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";

export function AdminImageField({
  label,
  name,
  value,
  required = false,
  variant = "landscape",
}: {
  label: string;
  name: string;
  value?: string | null;
  required?: boolean;
  variant?: "landscape" | "portrait";
}) {
  const [preview, setPreview] = useState(value || "");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);
    setPreview(nextObjectUrl);
    setFileName(file.name);
  }

  function updateUrl(event: ChangeEvent<HTMLInputElement>) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setPreview(event.target.value.trim());
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className={`admin-image-field admin-image-field--${variant} admin-field--wide`}>
      <span className="admin-image-field__label">{label}</span>
      <div className="admin-image-field__layout">
        <div
          aria-label={preview ? `Aperçu : ${label}` : `Aucun aperçu : ${label}`}
          className={`admin-image-field__preview${preview ? " has-image" : ""}`}
          role="img"
          style={preview ? ({ "--admin-image-preview": `url("${preview}")` } as CSSProperties) : undefined}
        >
          {!preview && <ImagePlus aria-hidden="true" size={28} />}
        </div>
        <div className="admin-image-field__controls">
          <label>
            <span>Chemin ou URL</span>
            <input name={name} defaultValue={value || ""} onChange={updateUrl} required={required} />
          </label>
          <label className="admin-image-field__upload">
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              name={`${name}Upload`}
              onChange={selectFile}
              ref={fileInputRef}
              type="file"
            />
            <span className="admin-image-field__upload-button">
              <ImagePlus aria-hidden="true" size={16} />
              {preview ? "Remplacer l’image" : "Importer une image"}
            </span>
            <small>{fileName || "JPG, PNG, WebP ou GIF · 8 Mo maximum"}</small>
          </label>
        </div>
      </div>
    </div>
  );
}
