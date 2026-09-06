import Image from "next/image";
import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  intro,
  aside,
  image,
  imageAlt = "",
  imagePosition = "center",
}: {
  eyebrow: string;
  title: string;
  intro: string;
  aside?: ReactNode;
  image?: string;
  imageAlt?: string;
  imagePosition?: "center" | "top" | "bottom";
}) {
  return (
    <section className={`page-heading${image ? " page-heading--visual" : ""}`}>
      {image && (
        <Image
          className={`page-heading__image page-heading__image--${imagePosition}`}
          src={image}
          alt={imageAlt}
          fill
          loading="eager"
          sizes="100vw"
        />
      )}
      <div className="shell page-heading__inner">
        <div>
          <span className="eyebrow eyebrow--yellow">{eyebrow}</span>
          <h1>{title}</h1>
        </div>
        <div className="page-heading__copy">
          <p>{intro}</p>
          {aside}
        </div>
      </div>
    </section>
  );
}