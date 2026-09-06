import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";

const footerLinks = [
  { href: "/matchs", label: "Matchs" },
  { href: "/equipe", label: "Équipe première" },
  { href: "/classement", label: "Classement" },
  { href: "/club", label: "Histoire du club" },
  { href: "/medias", label: "Médias" },
];

export function SiteFooter({ statement = "Un club de Rabat. Une histoire collective. Une ambition qui avance." }: { statement?: string }) {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__top">
        <div className="site-footer__statement">
          <Brand />
          <p>{statement}</p>
        </div>
        <nav className="site-footer__links" aria-label="Navigation de pied de page">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
              <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          ))}
        </nav>
      </div>
      <div className="shell site-footer__bottom">
        <p>© {new Date().getFullYear()} Union Touarga Sport</p>
        <p>Données sportives issues de sources publiques. Horaires susceptibles d’évoluer.</p>
      </div>
    </footer>
  );
}