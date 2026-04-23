/**
 * Curated niche-perfume news rail. Static data for now — no API key wired.
 *
 * To replace with a live source later:
 *   - RSS feeds (Auparfum, Fragrantica, Perfumesphere) — but most are CORS-blocked
 *     so call them from a Next.js route handler `/api/news` server-side.
 *   - A simple Notion / Sanity / Airtable backend that the marketing team curates.
 *   - The CRM if you add a `news` table later.
 *
 * Keep the items short: one image, one title, one excerpt. The Home rail is a
 * teaser, not a reader.
 */

export type NewsTag =
  | "Drop"
  | "Nouveauté"
  | "Exclu"
  | "Évènement"
  | "Interview"
  | "Maison";

export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  source: string;
  /** ISO date — used for sorting + display. */
  publishedAt: string;
  /** External link (article, drop page) or null. */
  url: string | null;
  tags: NewsTag[];
  /** Optional author/byline. */
  author?: string;
  /** Estimated read time in minutes (surfaced in the reader header). */
  readingMinutes?: number;
  /** Full article body — paragraphs separated by blank lines. */
  body?: string;
};

const I = (seed: string) =>
  `https://placehold.co/800x500/0a0a0a/e2e2e2?font=montserrat&text=${encodeURIComponent(seed)}`;

const NOW = "2026-04-22T10:00:00Z";

export const NEWS: NewsItem[] = [
  {
    id: "n-001",
    title: "Le Labo dévoile une eau exclusive Paris pour le mois d'avril",
    excerpt:
      "City Exclusive limitée à 600 flacons, disponible uniquement en boutique du Marais.",
    imageUrl: I("LE LABO\\nCITY EXCLUSIVE"),
    source: "La Niche",
    publishedAt: "2026-04-20T08:00:00Z",
    url: null,
    tags: ["Exclu", "Drop"],
    author: "Tidiane Tambadou",
    readingMinutes: 3,
    body: `Chaque avril, Le Labo rouvre un rituel qui divise autant qu'il fascine : les City Exclusives. Ces compositions ne sortent officiellement qu'un mois par an, et uniquement dans la ville à laquelle elles sont dédiées. Pour 2026, Paris ne reprend pas Vanille 44 — la maison new-yorkaise propose à la place une inédite, tirée à 600 flacons numérotés.

Le brief est signé Frank Voelkl : un champagne floral, tramé d'iris beurré et d'ambre gris. Officiellement, le parfumeur évoque « un matin clair dans un appartement du Marais, les fenêtres ouvertes, l'odeur du linge sec qui rentre ». Les premiers retours parlent d'un sillage feutré, plus proche d'Another 13 que des classiques gourmands de la maison.

La distribution reste fidèle au modèle maison : uniquement en boutique, rue de Grenier-Saint-Lazare, flacon gravé à la main. Pas de pré-commande, pas de liste d'attente — premier arrivé, premier servi. Prix indicatif 280 € pour 50 ml, 420 € pour 100 ml.

Pour les collectionneurs, c'est l'évènement du mois. Pour les curieux, c'est l'occasion rare de sentir le résultat d'une année de travail en accord concentré.`,
  },
  {
    id: "n-002",
    title: "Maison Crivelli ouvre les portes de son atelier à Florence",
    excerpt:
      "Visites guidées sur rendez-vous : extraction CO₂ supercritique en démo.",
    imageUrl: I("MAISON CRIVELLI\\nATELIER"),
    source: "La Niche",
    publishedAt: "2026-04-18T08:00:00Z",
    url: null,
    tags: ["Évènement", "Maison"],
    author: "Rédaction",
    readingMinutes: 4,
    body: `À Florence, derrière une porte discrète du quartier San Frediano, Thibaud Crivelli ouvre son atelier pour la première fois depuis la création de la maison en 2018. Les visites sont limitées : huit personnes par créneau, trois créneaux par jour, sur rendez-vous.

Le parcours dure quarante-cinq minutes. On y voit concrètement la chaîne d'extraction CO₂ supercritique qui sert à isoler les molécules volatiles sans passer par l'éthanol — une technique encore rare dans la parfumerie de niche. Le nez y fait sentir trois versions de la même matière première (absolue, essence, CO₂) pour comprendre comment le procédé modifie le rendu olfactif.

L'autre moment fort est l'accès au laboratoire où sont conservés les accords-mères. Crivelli garde une centaine de flacons datés, certains vieux de cinq ans, pour suivre la façon dont ses compositions évoluent dans le temps. C'est une démarche d'œnologue appliquée à la parfumerie.

Réservation uniquement sur le site de la maison, 85 € par personne, inclut un échantillonnage personnalisé à la fin. Les places partent vite — la première session d'avril a été complète en six heures.`,
  },
  {
    id: "n-003",
    title: "Frédéric Malle : interview du nez derrière la collection 2026",
    excerpt:
      "Sur les origines du brief « béton humide » et le travail autour de la géosmine.",
    imageUrl: I("FRÉDÉRIC MALLE\\nINTERVIEW"),
    source: "La Niche",
    publishedAt: "2026-04-15T08:00:00Z",
    url: null,
    tags: ["Interview"],
    author: "La Niche",
    readingMinutes: 6,
    body: `Editions de Parfums Frédéric Malle a sorti fin mars sa collection 2026, trois compositions qui partent toutes du même brief : « l'odeur d'une ville après la pluie ». Nous avons rencontré Julien Rasquinet, l'auteur principal de l'opus.

— La première question qu'on se pose : pourquoi ce brief maintenant ?

« C'est un brief que Frédéric tournait depuis longtemps. L'odeur minérale du béton mouillé, l'ozone, la terre qui remonte — tout le monde la connaît mais personne ne l'a vraiment traitée comme une matière première à part entière. Il fallait trouver l'angle. »

— Comment vous avez abordé ce côté minéral ?

« On a beaucoup joué sur la géosmine. C'est une molécule produite par les actinobactéries, c'est elle qui donne à la terre mouillée son odeur si reconnaissable. À haute dose elle est chimique, presque désagréable. À dose homéopathique elle rend tout plus charnel. Dans la composition finale on est autour de 0,02 %, mais son empreinte est partout. »

— Il y a aussi quelque chose de très urbain dans le trio.

« Oui, on voulait éviter la pastorale. Donc accord bitume, un peu de goudron sec, une touche de métal chaud. Pas un parfum de jardin, mais un parfum de boulevard désert à six heures du matin. »

— Les retours ?

« Divisé, comme prévu. Mais c'est sain. Un parfum qui plaît à tout le monde est un parfum qui n'a pas pris de risque. »

La collection est disponible en 100 ml uniquement, 280 € pièce, chez Malle et en exclusivité chez Nose à Paris.`,
  },
  {
    id: "n-004",
    title: "Atelier Materi annonce un drop confidentiel pour mai",
    excerpt:
      "Un cuir/safran travaillé en absolu, distribution sur invitation uniquement.",
    imageUrl: I("ATELIER MATERI\\nDROP CONFIDENTIEL"),
    source: "La Niche",
    publishedAt: "2026-04-12T08:00:00Z",
    url: null,
    tags: ["Drop", "Exclu"],
    readingMinutes: 2,
    body: `Atelier Materi prépare pour mai un drop hors-collection qui ne sortira jamais en distribution classique. Le parfum, nom de code « MT-22 », travaille un cuir marocain (cade + safran + labdanum) en absolu concentré — pas d'eau de parfum, pas de 50 ml : uniquement 150 flacons de 30 ml à 240 €.

Selon la maison, le tirage a été décidé après une série de tests privés où la formule a fait l'unanimité — mais son coût de production la rend invendable dans la gamme courante. D'où le format limité.

La distribution se fait exclusivement sur invitation. Trois canaux : les clients fichés VIP chez Materi, les gagnants d'un tirage sur leur compte Instagram, et les membres de La Niche qui ont au moins trois parfums de la maison dans leur wishlist depuis 2025. Les invitations partiront par email le 2 mai.

Aucune image publique ne sera diffusée avant la date de sortie. Le parfum se révèle à la peau, pas sur un feed.`,
  },
  {
    id: "n-005",
    title: "Bruno Fazzolari présente une rétrospective olfactive à Lyon",
    excerpt:
      "Six pièces inédites + un livret tiré à 200 exemplaires numérotés.",
    imageUrl: I("BRUNO FAZZOLARI\\nLYON"),
    source: "La Niche",
    publishedAt: "2026-04-08T08:00:00Z",
    url: null,
    tags: ["Évènement"],
    author: "Rédaction",
    readingMinutes: 4,
    body: `Bruno Fazzolari pose ses valises à Lyon pour une rétrospective du 3 au 10 mai, dans l'espace de la Galerie Tator. L'artiste-parfumeur, connu pour croiser peinture abstraite et composition olfactive, y présentera six pièces inédites conçues spécifiquement pour l'exposition.

Chaque parfum est indexé sur une toile présentée à côté : même palette, même rythme, même tension. Les visiteurs circulent avec une carte d'échantillonnage et peuvent sentir chaque pièce directement sur une mouillette gravée. Fazzolari parle de « lecture simultanée » — l'odeur ne commente pas le tableau, elle en fait partie.

Un livret de 96 pages est tiré à 200 exemplaires numérotés, avec des reproductions des œuvres, des notes sur chaque composition, et un texte inédit sur la relation couleur-odeur. Prix 65 €, vente sur place uniquement.

Pour les amateurs de Monserrat, de Lampblack ou de Cadjméré, l'exposition est un rendez-vous incontournable. Fazzolari reste en Europe jusqu'au 15 mai avant de repartir à San Francisco.`,
  },
  {
    id: "n-006",
    title: "Nishane : la collection Hacivat fête ses 10 ans",
    excerpt:
      "Réédition en parfum extrait, packaging revisité par Daniel Pop.",
    imageUrl: I("NISHANE\\nHACIVAT 10"),
    source: "La Niche",
    publishedAt: "2026-04-05T08:00:00Z",
    url: null,
    tags: ["Nouveauté", "Maison"],
    readingMinutes: 3,
    body: `Dix ans après sa sortie, Hacivat reste le porte-drapeau de la maison stambouliote Nishane. Pour célébrer cet anniversaire, la maison sort une édition limitée en parfum extrait (concentration 30 %), dans un flacon repensé par l'illustrateur Daniel Pop.

La formule a été revisitée : Murat et Mert, fondateurs de la maison, ont retravaillé le cœur avec le parfumeur Jorge Lee pour densifier le pamplemousse sans perdre la signature lumineuse du jus d'origine. Le résultat est plus gras, plus long en bouche, avec un sillage qui tient près de 12 h sur tissu contre 8 h pour l'EDP classique.

Le packaging adopte une illustration de Pop qui reprend en traits fins les toits du Bosphore vus depuis un ferry. Tirage à 1 000 exemplaires mondiaux, numérotés à la main, 310 € les 50 ml. Distribution exclusive dans les boutiques Nishane (Istanbul, Paris, Londres) et chez Jovoy pour la France.

Pour les fans de la maison, c'est l'occasion de redécouvrir un classique. Pour les nouveaux, un excellent point d'entrée — à condition d'accepter que la version originale reste la plus équilibrée.`,
  },
];

export function findNewsById(id: string): NewsItem | null {
  return NEWS.find((n) => n.id === id) ?? null;
}

export function latestNews(limit?: number): NewsItem[] {
  const sorted = [...NEWS].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export function formatNewsDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date(NOW);
  const days = Math.round(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} j`;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}
