import Image from "next/image";
import type { StaffSummary } from "@/lib/uts-data";

export function StaffCard({ member }: { member: StaffSummary }) {
  return (
    <article className="staff-card">
      <div className="staff-card__image">
        <Image
          src={member.imageUrl || "/uts/crest-color.png"}
          alt={`Portrait de ${member.name}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 25vw"
        />
      </div>
      <div className="staff-card__body">
        <span>{member.department}</span>
        <h3>{member.name}</h3>
        <p>{member.role}</p>
      </div>
    </article>
  );
}