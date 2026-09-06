"use client";

import { ImagePlus } from "lucide-react";
import type { CSSProperties, ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";

export function AdminImageField({
  label,
  name,
  value,
  required = false,
}: {
  label: string;
  name: string;
  value?: string | null;
  required?: boolean;
}) {
  const [preview, setPreview] = useState(value || "");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
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
  }

  function updateUrl(event: ChangeEvent<HTMLInputElement>) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setPreview(event.target.value.trim());
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="admin-image-field admin-field--wide">
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
            <span><ImagePlus aria-hidden="true" size={16} /> Importer une nouvelle image</span>
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              name={`${name}Upload`}
              onChange={selectFile}
              ref={fileInputRef}
              type="file"
            />
            <small>JPG, PNG, WebP ou GIF · 8 Mo maximum</small>
          </label>
        </div>
      </div>
    </div>
  );
}
