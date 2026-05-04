import type { Album, AlbumSection, AlbumSticker } from "@/types/album";

let globalCounter = 1;

function makeSticker(
  sectionId: string,
  number: number,
  name: string,
  type: AlbumSticker["type"],
  teamCode?: string
): AlbumSticker {
  return {
    id: `${sectionId}-${String(number).padStart(2, "0")}`,
    globalNumber: globalCounter++,
    sectionId,
    number,
    name,
    type,
    teamCode,
  };
}

function makeTeamSection(
  id: string,
  countryName: string,
  emoji: string,
  teamCode: string,
  players: string[]
): AlbumSection {
  const stickers: AlbumSticker[] = [
    makeSticker(id, 1, `${countryName} - Escudo`, "badge", teamCode),
    ...players.map((p, i) =>
      makeSticker(id, i + 2, p, "player", teamCode)
    ),
  ];
  return { id, name: countryName, emoji, stickers };
}

// ── Opening section ──────────────────────────────────────────────
const openingSection: AlbumSection = {
  id: "FWC",
  name: "FIFA World Cup 2026",
  emoji: "🏆",
  stickers: [
    makeSticker("FWC", 1, "Copa del Mundo FIFA 2026", "special"),
    makeSticker("FWC", 2, "Logo Oficial", "special"),
    makeSticker("FWC", 3, "Mascota - Fuego", "special"),
    makeSticker("FWC", 4, "Mascota - Tierra", "special"),
    makeSticker("FWC", 5, "Mascota - Agua", "special"),
    makeSticker("FWC", 6, "Trofeo FIFA", "special"),
    makeSticker("FWC", 7, "Historia del Torneo I", "special"),
    makeSticker("FWC", 8, "Historia del Torneo II", "special"),
    makeSticker("FWC", 9, "Seleccionados All-Star", "special"),
    makeSticker("FWC", 10, "Portada del Álbum", "special"),
  ],
};

// ── Stadiums ─────────────────────────────────────────────────────
const stadiumNames = [
  "MetLife Stadium (Nueva York/Nueva Jersey)",
  "AT&T Stadium (Dallas)",
  "SoFi Stadium (Los Ángeles)",
  "Levi's Stadium (San Francisco)",
  "Arrowhead Stadium (Kansas City)",
  "Empower Field (Denver)",
  "Allegiant Stadium (Las Vegas)",
  "Lumen Field (Seattle)",
  "Lincoln Financial Field (Filadelfia)",
  "Gillette Stadium (Boston)",
  "Rose Bowl (Los Ángeles)",
  "Hard Rock Stadium (Miami)",
  "Estadio Azteca (Ciudad de México)",
  "Estadio BBVA (Monterrey)",
  "Estadio Akron (Guadalajara)",
  "BC Place (Vancouver)",
];

const stadiumSection: AlbumSection = {
  id: "STA",
  name: "Estadios",
  emoji: "🏟️",
  stickers: stadiumNames.flatMap((name, i) => [
    makeSticker("STA", i * 2 + 1, `${name} (Vista exterior)`, "stadium"),
    makeSticker("STA", i * 2 + 2, `${name} (Vista interior)`, "stadium"),
  ]),
};

// ── UEFA Teams ───────────────────────────────────────────────────
const uefaTeams: AlbumSection[] = [
  makeTeamSection("ALB", "Albania", "🦅", "ALB", [
    "Strakosha", "Djimsiti", "Ismajli", "Hysaj", "Gjasula",
    "Ramadani", "Bajrami", "Laci", "Manaj", "Broja", "Seferi",
  ]),
  makeTeamSection("AUT", "Austria", "🇦🇹", "AUT", [
    "Pentz", "Posch", "Trauner", "Wöber", "Prass",
    "Laimer", "Grillitsch", "Baumgartner", "Sabitzer", "Arnautovic", "Gregoritsch",
  ]),
  makeTeamSection("BEL", "Bélgica", "🇧🇪", "BEL", [
    "Casteels", "Castagne", "Faes", "Debast", "Theate",
    "Tielemans", "Onana", "De Bruyne", "Doku", "Lukaku", "Openda",
  ]),
  makeTeamSection("CRO", "Croacia", "🇭🇷", "CRO", [
    "Livakovic", "Juranovic", "Vida", "Sutalo", "Gvardiol",
    "Brozovic", "Kovacic", "Modric", "Pasalic", "Budimir", "Petkovic",
  ]),
  makeTeamSection("DEN", "Dinamarca", "🇩🇰", "DEN", [
    "Schmeichel", "Andersen", "Christensen", "Vestergaard", "Maehle",
    "Delaney", "Eriksen", "Hojbjerg", "Wind", "Dolberg", "Poulsen",
  ]),
  makeTeamSection("ENG", "Inglaterra", "🦁", "ENG", [
    "Pickford", "Alexander-Arnold", "Stones", "Maguire", "Shaw",
    "Bellingham", "Rice", "Saka", "Foden", "Kane", "Rashford",
  ]),
  makeTeamSection("FRA", "Francia", "🐓", "FRA", [
    "Maignan", "Pavard", "Upamecano", "Saliba", "T. Hernández",
    "Tchouaméni", "Camavinga", "Griezmann", "Dembélé", "Mbappé", "Giroud",
  ]),
  makeTeamSection("GEO", "Georgia", "🇬🇪", "GEO", [
    "Mamardashvili", "Kakabadze", "Kashia", "Dvali", "Lochoshvili",
    "Chakvetadze", "Mekvabishvili", "Kiteishvili", "Davitashvili", "Mikautadze", "Zivzivadze",
  ]),
  makeTeamSection("GER", "Alemania", "🦅", "GER", [
    "Neuer", "Kimmich", "Rüdiger", "Schlotterbeck", "Mittelstädt",
    "Andrich", "Kroos", "Musiala", "Gnabry", "Füllkrug", "Havertz",
  ]),
  makeTeamSection("NED", "Países Bajos", "🌷", "NED", [
    "Flekken", "Dumfries", "De Vrij", "Van Dijk", "Blind",
    "Schouten", "De Jong", "Simons", "Gakpo", "Depay", "Weghorst",
  ]),
  makeTeamSection("POL", "Polonia", "🦅", "POL", [
    "Szczęsny", "Bereszyński", "Glik", "Kiwior", "Zalewski",
    "Bielik", "Krychowiak", "Zieliński", "Frankowski", "Lewandowski", "Piątek",
  ]),
  makeTeamSection("POR", "Portugal", "🇵🇹", "POR", [
    "Rui Patrício", "Dalot", "Pepe", "Rúben Dias", "Guerreiro",
    "Palhinha", "Vitinha", "B. Fernandes", "Bernardo Silva", "Ronaldo", "Rafael Leão",
  ]),
  makeTeamSection("ROU", "Rumania", "🇷🇴", "ROU", [
    "Niță", "Rațiu", "Burcă", "Drăguș", "Bancu",
    "Marin", "Stanciu", "Man", "Mihăilă", "Pușcaș", "Drăguș",
  ]),
  makeTeamSection("ESP", "España", "🇪🇸", "ESP", [
    "Unai Simón", "Carvajal", "Le Normand", "Laporte", "Cucurella",
    "Fabián Ruiz", "Rodri", "Pedri", "Yamal", "Morata", "Williams",
  ]),
  makeTeamSection("SUI", "Suiza", "🇨🇭", "SUI", [
    "Sommer", "Widmer", "Elvedi", "Akanji", "Rodriguez",
    "Freuler", "Xhaka", "Steffen", "Shaqiri", "Embolo", "Okafor",
  ]),
  makeTeamSection("TUR", "Turquía", "🇹🇷", "TUR", [
    "Çakır", "Zeki Çelik", "Demiral", "Bardakcı", "Müldür",
    "Yüksek", "Özcan", "Güler", "Akturkoglu", "Yılmaz", "Calhanoglu",
  ]),
];

// ── CONMEBOL Teams ───────────────────────────────────────────────
const conmebolTeams: AlbumSection[] = [
  makeTeamSection("ARG", "Argentina", "🇦🇷", "ARG", [
    "E. Martínez", "Montiel", "Romero", "Otamendi", "Acuña",
    "De Paul", "Mac Allister", "Enzo Fernández", "Di María", "Messi", "Álvarez",
  ]),
  makeTeamSection("BOL", "Bolivia", "🇧🇴", "BOL", [
    "Lampe", "Jusino", "Quinteros", "Sagredo", "Fernández",
    "Saucedo", "Roca", "Ramallo", "Arce", "Moreno", "Algarañaz",
  ]),
  makeTeamSection("BRA", "Brasil", "🇧🇷", "BRA", [
    "Alisson", "Danilo", "Marquinhos", "Gabriel Magalhães", "Guilherme Arana",
    "Bruno Guimarães", "Casemiro", "Rodrygo", "Vinicius Jr.", "Endrick", "Raphinha",
  ]),
  makeTeamSection("CHI", "Chile", "🇨🇱", "CHI", [
    "Bravo", "Isla", "Maripán", "Medel", "Estrada",
    "Pulgar", "Ríos", "Brereton Díaz", "Sánchez", "Vargas", "Palacios",
  ]),
  makeTeamSection("COL", "Colombia", "🇨🇴", "COL", [
    "Vargas", "Muñoz", "Lucumí", "Cuesta", "Mojica",
    "Lerma", "Uribe", "James Rodríguez", "Cuadrado", "Córdoba", "Díaz",
  ]),
  makeTeamSection("ECU", "Ecuador", "🇪🇨", "ECU", [
    "Domínguez", "Preciado", "Hincapié", "Torres", "Estupiñán",
    "Gruezo", "Caicedo", "Plata", "Sarmiento", "Valencia", "Ibarra",
  ]),
  makeTeamSection("PAR", "Paraguay", "🇵🇾", "PAR", [
    "Silva", "Alderete", "Balbuena", "Alonso", "Espinola",
    "Cubas", "Villasanti", "Enciso", "Almirón", "Sanabria", "Ávalos",
  ]),
  makeTeamSection("PER", "Perú", "🇵🇪", "PER", [
    "Gallese", "Advíncula", "Abram", "Callens", "Trauco",
    "Yotún", "Tapia", "Peña", "Cueva", "Guerrero", "Lapadula",
  ]),
  makeTeamSection("URU", "Uruguay", "🇺🇾", "URU", [
    "Rochet", "Nández", "Giménez", "Godín", "Viña",
    "Ugarte", "Bentancur", "Valverde", "De Arrascaeta", "Cavani", "Núñez",
  ]),
  makeTeamSection("VEN", "Venezuela", "🇻🇪", "VEN", [
    "Romo", "Rosales", "González", "Osorio", "Mago",
    "Segovia", "Machís", "Soteldo", "Savarino", "Rondón", "Flores",
  ]),
];

// ── CONCACAF Teams ───────────────────────────────────────────────
const concacafTeams: AlbumSection[] = [
  makeTeamSection("CAN", "Canadá", "🍁", "CAN", [
    "Crepeau", "Johnston", "Miller", "Bombito", "Laryea",
    "Eustaquio", "Buchanan", "Hutchinson", "David", "Osorio", "Larin",
  ]),
  makeTeamSection("CRC", "Costa Rica", "🇨🇷", "CRC", [
    "Navas", "Fuller", "Calvo", "Duarte", "Oviedo",
    "Borges", "Tejeda", "Chacón", "Torres", "Campbell", "Contreras",
  ]),
  makeTeamSection("CUB", "Cuba", "🇨🇺", "CUB", [
    "Santos", "Vázquez", "Pelier", "Palma", "Espín",
    "Limonta", "Fernández", "Bacallao", "Rodríguez", "Hierrezuelo", "Pérez",
  ]),
  makeTeamSection("HON", "Honduras", "🇭🇳", "HON", [
    "López", "García", "Meléndez", "Quioto", "Anthony Lozano",
    "Rubilio Castillo", "Elis", "Benguché", "Acosta", "Pereira", "Vallecillo",
  ]),
  makeTeamSection("JAM", "Jamaica", "🇯🇲", "JAM", [
    "Blake", "Latibeaudiere", "Lawrence", "Campbell", "Bell",
    "Antonio", "Murray", "Powell", "Bailey", "Nichols", "Dalling",
  ]),
  makeTeamSection("MEX", "México", "🦅", "MEX", [
    "Ochoa", "Sánchez", "Montes", "Moreno", "Gallardo",
    "Álvarez", "Herrera", "Lozano", "Antuna", "Jiménez", "Martín",
  ]),
  makeTeamSection("PAN", "Panamá", "🇵🇦", "PAN", [
    "Mosquera", "Murillo", "Davis", "Arias", "Córdoba",
    "Godoy", "Fajardo", "Baloy", "Anderson", "Brown", "Tejada",
  ]),
  makeTeamSection("USA", "Estados Unidos", "🦅", "USA", [
    "Turner", "Dest", "Richards", "Carter-Vickers", "Robinson",
    "Musah", "McKennie", "Adams", "Pulisic", "Balogun", "Weah",
  ]),
];

// ── CAF Teams ────────────────────────────────────────────────────
const cafTeams: AlbumSection[] = [
  makeTeamSection("ALG", "Argelia", "🇩🇿", "ALG", [
    "Mandrea", "Mandi", "Benlamri", "Tougaï", "Atal",
    "Bensebaïni", "Bennacer", "Belaïli", "Ounas", "Slimani", "Brahimi",
  ]),
  makeTeamSection("CMR", "Camerún", "🦁", "CMR", [
    "Epassy", "Fai", "Castelletto", "Ngadeu", "Tolo",
    "Ondoua", "Zambo Anguissa", "Hongla", "Mbeumo", "Aboubakar", "Choupo-Moting",
  ]),
  makeTeamSection("EGY", "Egipto", "🦅", "EGY", [
    "Gabaski", "Kamal", "Abdelmonem", "Hamdi Fathi", "Ashraf",
    "Elneny", "M. Hany", "Trezeguet", "Salah", "Mostafa Mohamed", "Ramadan",
  ]),
  makeTeamSection("GHA", "Ghana", "⭐", "GHA", [
    "Ati Zigi", "Lamptey", "Amartey", "Djiku", "Rahman Baba",
    "Suleyman", "Kudus", "Partey", "Jordan Ayew", "Inaki Williams", "Caleb Ekuban",
  ]),
  makeTeamSection("CIV", "Costa de Marfil", "🐘", "CIV", [
    "Sangare", "Aurier", "Konaté", "Bailly", "Diallo",
    "Sangaré", "Zaha", "Pepe", "Gradel", "Haller", "Cornet",
  ]),
  makeTeamSection("MAR", "Marruecos", "⭐", "MAR", [
    "Bounou", "Hakimi", "Aguerd", "Saïss", "Mazraoui",
    "Ounahi", "Amrabat", "Ziyech", "En-Nesyri", "Boufal", "Cheddira",
  ]),
  makeTeamSection("NGA", "Nigeria", "🦅", "NGA", [
    "Nwabali", "Ola Aina", "Troost-Ekong", "Bassey", "Zaidu",
    "Ndidi", "Iwobi", "Lookman", "Simon", "Osimhen", "Chukwueze",
  ]),
  makeTeamSection("SEN", "Senegal", "🦁", "SEN", [
    "Mendy", "Sabaly", "Koulibaly", "Diallo", "Ismaïla Sarr",
    "Gueye", "Kouyaté", "Diatta", "Nampalys Mendy", "Mané", "Dia",
  ]),
  makeTeamSection("ZAF", "Sudáfrica", "🐆", "ZAF", [
    "Williams", "Sibisi", "Frosler", "Broos", "Ngcobo",
    "Dolly", "Zwane", "Tau", "Zungu", "Nurkovic", "Evidence Makgopa",
  ]),
];

// ── AFC Teams ────────────────────────────────────────────────────
const afcTeams: AlbumSection[] = [
  makeTeamSection("AUS", "Australia", "🦘", "AUS", [
    "Ryan", "Atkinson", "Souttar", "Rowles", "Behich",
    "Mooy", "McGree", "Hrustic", "Leckie", "Maclaren", "Duke",
  ]),
  makeTeamSection("IRN", "Irán", "🇮🇷", "IRN", [
    "Hosseini", "Rezaeian", "Pouraliganji", "Hosseini", "Mohammadi",
    "Nourollahi", "Hajsafi", "Ghoddos", "Taremi", "Azmoun", "Jahanbakhsh",
  ]),
  makeTeamSection("IRQ", "Irak", "🇮🇶", "IRQ", [
    "Doham", "Ali Adnan", "Karrar", "Sharqi", "Ahmed Ibrahim",
    "Ameen", "Al-Rubaie", "Salim", "Hamed", "Mohanad Ali", "Aymen Hussein",
  ]),
  makeTeamSection("JPN", "Japón", "🗾", "JPN", [
    "Gonda", "Yamane", "Taniguchi", "Yoshida", "Nagatomo",
    "Endo", "Morita", "Doan", "Kamada", "Minamino", "Maeda",
  ]),
  makeTeamSection("JOR", "Jordania", "🇯🇴", "JOR", [
    "Shnaishel", "Haddad", "Shdaifat", "Nazmi", "Al-Amer",
    "Al-Rawabdeh", "Baha Faisal", "Al-Tamari", "Brayhan", "Yazan Al-Naimat", "Al-Dardour",
  ]),
  makeTeamSection("KOR", "Corea del Sur", "🇰🇷", "KOR", [
    "Kim Seung-gyu", "Kim Moon-hwan", "Kim Min-jae", "Jung Seung-hyun", "Kim Jin-su",
    "Jung Woo-young", "Hwang In-beom", "Lee Kang-in", "Son Heung-min", "Hwang Hee-chan", "Cho Gue-sung",
  ]),
  makeTeamSection("KSA", "Arabia Saudita", "🌴", "KSA", [
    "Al-Owais", "Al-Ghannam", "Al-Amri", "Al-Bulayhi", "Al-Shahrani",
    "Al-Malki", "Kanno", "Al-Dawsari", "Saleh Al-Shehri", "Al-Buraikan", "Al-Dawsari",
  ]),
  makeTeamSection("UZB", "Uzbekistán", "🇺🇿", "UZB", [
    "Shatskiy", "Nurillayev", "Ashurmatov", "Abbosbek", "Khamdamov",
    "Tursunov", "Komilov", "Makhmudov", "Djeparov", "Shomurodov", "Egamberdiev",
  ]),
];

// ── OFC + Playoffs ────────────────────────────────────────────────
const ofcTeams: AlbumSection[] = [
  makeTeamSection("NZL", "Nueva Zelanda", "🥝", "NZL", [
    "Sail", "Rodan", "Just", "Boxall", "Edge",
    "Cacace", "Waine", "Rawlins", "Payne", "Wood", "Garbett",
  ]),
  makeTeamSection("PLY1", "Playoff 1", "🏟️", "PLY1", [
    "Arquero 1", "Defensa 1", "Defensa 2", "Defensa 3", "Lateral 1",
    "Mediocampista 1", "Mediocampista 2", "Extremo 1", "Extremo 2", "Delantero 1", "Delantero 2",
  ]),
  makeTeamSection("PLY2", "Playoff 2", "🏟️", "PLY2", [
    "Arquero 1", "Defensa 1", "Defensa 2", "Defensa 3", "Lateral 1",
    "Mediocampista 1", "Mediocampista 2", "Extremo 1", "Extremo 2", "Delantero 1", "Delantero 2",
  ]),
];

// ── Assemble album ────────────────────────────────────────────────
const allSections: AlbumSection[] = [
  openingSection,
  stadiumSection,
  {
    id: "UEFA",
    name: "UEFA (Europa)",
    emoji: "🇪🇺",
    stickers: [],
  },
  ...uefaTeams,
  {
    id: "CONMEBOL",
    name: "CONMEBOL (Sudamérica)",
    emoji: "🌎",
    stickers: [],
  },
  ...conmebolTeams,
  {
    id: "CONCACAF",
    name: "CONCACAF (Norte/Centro América)",
    emoji: "🌏",
    stickers: [],
  },
  ...concacafTeams,
  {
    id: "CAF",
    name: "CAF (África)",
    emoji: "🌍",
    stickers: [],
  },
  ...cafTeams,
  {
    id: "AFC",
    name: "AFC (Asia)",
    emoji: "🌏",
    stickers: [],
  },
  ...afcTeams,
  {
    id: "OFC",
    name: "OFC + Playoffs",
    emoji: "🌊",
    stickers: [],
  },
  ...ofcTeams,
];

const totalStickers = allSections.reduce((sum, s) => sum + s.stickers.length, 0);

export const WORLD_CUP_2026: Album = {
  id: "world-cup-2026",
  name: "FIFA World Cup 2026™",
  year: 2026,
  totalStickers,
  sections: allSections,
};

export const ALBUM_SECTIONS_MAP = new Map(
  allSections.map((s) => [s.id, s])
);

export const ALL_STICKERS_MAP = new Map(
  allSections.flatMap((s) => s.stickers).map((st) => [st.id, st])
);

// Confederation groupings for the album nav (sections with stickers only)
export const TEAM_SECTIONS = allSections.filter((s) => s.stickers.length > 0);

// Confederation headers (empty sticker arrays, just separators)
export const CONFEDERATION_HEADERS = new Set(
  ["UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"]
);
