import Link from "next/link";
import type { ClubTeam } from "@/lib/sports-hub";

export function TeamSwitcher({
  teams,
  activeSlug,
  route,
  query = false,
}: {
  teams: ClubTeam[];
  activeSlug: string;
  route: string;
  query?: boolean;
}) {
  return (
    <nav className="team-switcher" aria-label="Choisir une équipe">
      {teams.map((team) => (
        <Link
          className={team.slug === activeSlug ? "is-active" : undefined}
          href={query ? `${route}?equipe=${team.slug}` : `${route}/${team.slug}`}
          key={team.id}
        >
          <span>{team.categoryLabel}</span>
          <strong>{team.shortName}</strong>
        </Link>
      ))}
    </nav>
  );
}
