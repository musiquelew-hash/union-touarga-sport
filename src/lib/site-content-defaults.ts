export type SiteContent = {
  stripPrimary: string;
  stripSecondary: string;
  heroKicker: string;
  heroTitleTop: string;
  heroTitleBottom: string;
  heroLeadStrong: string;
  heroLead: string;
  manifestoTitle: string;
  manifestoCopy: string;
  clubIntroTitle: string;
  clubIntroParagraphOne: string;
  clubIntroParagraphTwo: string;
  clubMilestones: {
    year: string;
    title: string;
    copy: string;
  }[];
  clubVenueTitle: string;
  clubVenueCopy: string;
  footerStatement: string;
  instagramUrl: string;
  youtubeUrl: string;
  crestColorUrl: string;
  crestWhiteUrl: string;
  adminLoginImageUrl: string;
  homeHeroImageUrl: string;
  homeHeroImageAlt: string;
  homeManifestoImageUrl: string;
  homeManifestoImageAlt: string;
  teamHeaderImageUrl: string;
  teamHeaderImageAlt: string;
  matchesHeaderImageUrl: string;
  matchesHeaderImageAlt: string;
  standingsHeaderImageUrl: string;
  standingsHeaderImageAlt: string;
  clubHeaderImageUrl: string;
  clubHeaderImageAlt: string;
  mediaHeaderImageUrl: string;
  mediaHeaderImageAlt: string;
  mediaSocialImageUrl: string;
  mediaSocialImageAlt: string;
  mediaFallbackImageUrl: string;
};

export const defaultSiteContent: SiteContent = {
  stripPrimary: "Rabat · Depuis 1969",
  stripSecondary: "Union · Formation · Ambition",
  heroKicker: "Rabat · Depuis 1969",
  heroTitleTop: "Union",
  heroTitleBottom: "Touarga Sport",
  heroLeadStrong: "Fiers de nos valeurs.",
  heroLead: "Une identité née à Touarga, une ambition portée par toute une ville et un football qui avance ensemble.",
  manifestoTitle: "Former le jeu.\nFormer les hommes.",
  manifestoCopy:
    "L’Union Touarga Sport porte une culture de proximité, de formation et de persévérance. Le club grandit sans perdre le lien qui l’unit à sa ville et à celles et ceux qui l’accompagnent.",
  clubIntroTitle: "Un même maillot pour tout Touarga",
  clubIntroParagraphOne:
    "L’UTS s’est construite autour d’une idée simple : rassembler les forces sportives du quartier pour porter une ambition commune. Cette culture de l’union reste au centre du projet du club.",
  clubIntroParagraphTwo:
    "De la formation aux compétitions nationales, chaque étape traduit le même engagement envers les jeunes talents, le travail collectif et le lien avec Rabat.",
  clubMilestones: [
    {
      year: "1969",
      title: "Naissance de l'Union",
      copy: "L'Union Touarga Sport est fondée à Rabat et construit son identité au cœur du quartier de Touarga.",
    },
    {
      year: "2019/20",
      title: "Champion du National Amateur",
      copy: "L'UTS remporte le championnat amateur et ouvre un nouveau cycle de progression sportive.",
    },
    {
      year: "2020/21",
      title: "Accession en Botola Pro 2",
      copy: "Le club rejoint le football professionnel et poursuit son ascension dans les compétitions nationales.",
    },
    {
      year: "2021/22",
      title: "Retour parmi l'élite",
      copy: "Vice-champion de Botola Pro 2, l'UTS gagne sa place au plus haut niveau du football marocain.",
    },
  ],
  clubVenueTitle: "Stade Al Medina",
  clubVenueCopy:
    "Le Stade Al Medina accompagne l’identité de l’UTS à Rabat. Pour chaque rencontre, le lieu confirmé reste celui publié dans le calendrier, afin de tenir compte des éventuels changements d’enceinte.",
  footerStatement: "Un club de Rabat. Une histoire collective. Une ambition qui avance.",
  instagramUrl: "https://www.instagram.com/touargaofficiel/",
  youtubeUrl: "https://www.youtube.com/channel/UCeUf_mzzDOtsxY7E_p5PENA",
  crestColorUrl: "/uts/crest-color.png",
  crestWhiteUrl: "/uts/crest-white.png",
  adminLoginImageUrl: "/uts/team.jpg",
  homeHeroImageUrl: "/uts/hero-candidate.jpg",
  homeHeroImageAlt: "L’ensemble des équipes et du staff de l’Union Touarga Sport",
  homeManifestoImageUrl: "/uts/team.jpg",
  homeManifestoImageAlt: "Une équipe de l’Union Touarga Sport avant une rencontre",
  teamHeaderImageUrl: "/uts/hero-candidate.jpg",
  teamHeaderImageAlt: "L’ensemble des équipes et du staff de l’Union Touarga Sport",
  matchesHeaderImageUrl: "/uts/story.jpg",
  matchesHeaderImageAlt: "Le staff de l’Union Touarga Sport au bord du terrain",
  standingsHeaderImageUrl: "/uts/match-03.jpg",
  standingsHeaderImageAlt: "Remise d’un trophée à l’Union Touarga Sport",
  clubHeaderImageUrl: "/uts/hero-candidate.jpg",
  clubHeaderImageAlt: "La grande famille de l’Union Touarga Sport réunie à Rabat",
  mediaHeaderImageUrl: "/uts/match-01.jpg",
  mediaHeaderImageAlt: "Les joueurs de l’Union Touarga Sport célèbrent un titre",
  mediaSocialImageUrl: "/uts/story.jpg",
  mediaSocialImageAlt: "Le staff de l’Union Touarga Sport au bord du terrain",
  mediaFallbackImageUrl: "/uts/team.jpg",
};