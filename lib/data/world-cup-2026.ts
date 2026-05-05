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
    id: `${sectionId}${number}`,
    globalNumber: globalCounter++,
    sectionId,
    number,
    name,
    type,
    teamCode,
  };
}

// 20 stickers per team: badge(1) + players(2-12) + team photo(13) + players(14-20)
// players param: first 11 go to slots 2-12, last 7 go to slots 14-20
function makeTeamSection(
  id: string,
  countryName: string,
  emoji: string,
  players: [string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string]
): AlbumSection {
  const stickers: AlbumSticker[] = [
    makeSticker(id, 1, `${countryName} - Escudo`, "badge", id),
    ...players.slice(0, 11).map((p, i) => makeSticker(id, i + 2, p, "player", id)),
    makeSticker(id, 13, `${countryName} - Foto de Equipo`, "special", id),
    ...players.slice(11, 18).map((p, i) => makeSticker(id, i + 14, p, "player", id)),
  ];
  return { id, name: countryName, emoji, stickers };
}

// ── Opening / FWC section (20 stickers) ──────────────────────────
const openingSection: AlbumSection = {
  id: "FWC",
  name: "FIFA World Cup 2026",
  emoji: "🏆",
  stickers: [
    makeSticker("FWC", 0,  "Panini Logo", "special"),          // P00
    makeSticker("FWC", 1,  "Emblema Oficial", "special"),
    makeSticker("FWC", 2,  "Mascota - Fuego (Lumo)", "special"),
    makeSticker("FWC", 3,  "Mascota - Tierra (Lumo)", "special"),
    makeSticker("FWC", 4,  "Mascota - Agua (Lumo)", "special"),
    makeSticker("FWC", 5,  "Slogan Oficial", "special"),
    makeSticker("FWC", 6,  "Sede - Canadá", "special"),
    makeSticker("FWC", 7,  "Sede - México", "special"),
    makeSticker("FWC", 8,  "Sede - USA", "special"),
    makeSticker("FWC", 9,  "FIFA Museum - 1930 Uruguay", "special"),
    makeSticker("FWC", 10, "FIFA Museum - 1934 & 1938 Italia", "special"),
    makeSticker("FWC", 11, "FIFA Museum - 1950 Uruguay & 1954 Alemania", "special"),
    makeSticker("FWC", 12, "FIFA Museum - 1958 & 1962 Brasil", "special"),
    makeSticker("FWC", 13, "FIFA Museum - 1966 Inglaterra & 1970 Brasil", "special"),
    makeSticker("FWC", 14, "FIFA Museum - 1974 Alemania & 1978 Argentina", "special"),
    makeSticker("FWC", 15, "FIFA Museum - 1982 Italia & 1986 Argentina", "special"),
    makeSticker("FWC", 16, "FIFA Museum - 1990 Alemania & 1994 Brasil", "special"),
    makeSticker("FWC", 17, "FIFA Museum - 1998 Francia & 2002 Brasil", "special"),
    makeSticker("FWC", 18, "FIFA Museum - 2006 Italia & 2010 España", "special"),
    makeSticker("FWC", 19, "FIFA Museum - 2014 Alemania & 2018 Francia & 2022 Argentina", "special"),
  ],
};

// ── UEFA — Europa (16 equipos) ────────────────────────────────────
const uefaTeams: AlbumSection[] = [
  makeTeamSection("AUT", "Austria", "🇦🇹", [
    "Schlager", "Pentz", "Alaba", "Danso", "Lienhart", "Posch", "Mwene", "Prass", "X. Schlager", "Sabitzer", "Laimer",
    "Grillitsch", "Seiwald", "Schmid", "Wimmer", "Baumgartner", "Gregoritsch", "Arnautović",
  ]),
  makeTeamSection("BEL", "Bélgica", "🇧🇪", [
    "Courtois", "Theate", "Castagne", "Debast", "Mechele", "De Cuyper", "Meunier", "Tielemans", "Onana", "Raskin", "Saelemaekers",
    "Vanaken", "De Bruyne", "Doku", "De Ketelaere", "Trossard", "Openda", "Lukaku",
  ]),
  makeTeamSection("BIH", "Bosnia y Herzegovina", "🦁", [
    "Vasilj", "Dedic", "Kolasinac", "Muharemovic", "Mujakic", "Katic", "Hadziahmetovic", "Tahirovic", "Gigovic", "Sunjic", "Basic",
    "Burnic", "Bajraktarevic", "Memic", "Demirovic", "Dzeko", "Bazdar", "Tabakovic",
  ]),
  makeTeamSection("CRO", "Croacia", "🇭🇷", [
    "Livaković", "Caleta-Car", "Gvardiol", "Stanišić", "Vušković", "Sutalo", "Jakic", "Modrić", "Kovacic", "Baturina", "Majer",
    "M. Pasalic", "Sucic", "Perišić", "A. Pasalic", "Budimir", "Kramarić", "Ivanovic",
  ]),
  makeTeamSection("CZE", "República Checa", "🇨🇿", [
    "Kovar", "Stanek", "Krejci", "Coufal", "Zeleny", "Holes", "Zima", "Sadilek", "Provod", "Cerv", "Soucek",
    "Sulc", "Vydra", "Kusej", "Chory", "Cerny", "Hlozek", "Schick",
  ]),
  makeTeamSection("ENG", "Inglaterra", "🦁", [
    "Pickford", "Stones", "Guéhi", "Konsa", "Alexander-Arnold", "James", "Burn", "Henderson", "Rice", "Bellingham", "Palmer",
    "Rogers", "Gordon", "Foden", "Saka", "Kane", "Rashford", "Watkins",
  ]),
  makeTeamSection("FRA", "Francia", "🐓", [
    "Maignan", "T. Hernandez", "Saliba", "Kounde", "Konate", "Upamecano", "Digne", "Tchouaméni", "Camavinga", "Kone", "Rabiot",
    "Olise", "Dembele", "Barcola", "Doué", "Coman", "Ekitike", "Mbappe",
  ]),
  makeTeamSection("GER", "Alemania", "🦅", [
    "ter Stegen", "Tah", "Raum", "Schlotterbeck", "Rüdiger", "Anton", "Baku", "Mittelstadt", "Kimmich", "Wirtz", "Nmecha",
    "Goretzka", "Musiala", "Gnabry", "Havertz", "Sane", "Adeyemi", "Woltemade",
  ]),
  makeTeamSection("NED", "Países Bajos", "🌷", [
    "Verbruggen", "van Dijk", "van de Ven", "Timber", "Dumfries", "Aké", "Frimpong", "van Hecke", "Reijnders", "Gravenberch", "Koopmeiners",
    "de Jong", "Simons", "Kluivert", "Depay", "Malen", "Weghorst", "Gakpo",
  ]),
  makeTeamSection("NOR", "Noruega", "🇳🇴", [
    "Nyland", "Ryerson", "Ostigård", "Ajer", "Pedersen", "Møller Wolfe", "Heggem", "Thorsby", "Ødegaard", "Berge", "Schjelderup",
    "Berg", "Haaland", "Sørloth", "Dønnum", "Strand Larsen", "Nusa", "Bobb",
  ]),
  makeTeamSection("POR", "Portugal", "🇵🇹", [
    "Costa", "Sa", "Dias", "Cancelo", "Dalot", "Mendes", "Inácio", "B. Silva", "Fernandes", "Neves", "Vitinha",
    "J. Neves", "Ronaldo", "Trincao", "Felix", "Ramos", "Neto", "Leão",
  ]),
  makeTeamSection("SCO", "Escocia", "🦁", [
    "Gunn", "Hendry", "Tierney", "Hickey", "Robertson", "McKenna", "Souttar", "Ralston", "Hanley", "McTominay", "Gilmour",
    "Ferguson", "Christie", "McLean", "McGinn", "Dykes", "Adams", "Gannon-Doak",
  ]),
  makeTeamSection("ESP", "España", "🇪🇸", [
    "Simon", "Le Normand", "Laporte", "Huijsen", "Porro", "Carvajal", "Cucurella", "Zubimendi", "Rodri", "Pedri", "Ruiz",
    "Merino", "Yamal", "Olmo", "N. Williams", "Torres", "Morata", "Oyarzabal",
  ]),
  makeTeamSection("SUI", "Suiza", "🇨🇭", [
    "Kobel", "Mvogo", "Akanji", "Rodriguez", "Elvedi", "Amenda", "Widmer", "Xhaka", "Zakaria", "Freuler", "Rieder",
    "Jashari", "Manzambi", "Aebischer", "Embolo", "Vargas", "Ndoye", "Amdouni",
  ]),
  makeTeamSection("SWE", "Suecia", "🇸🇪", [
    "Johansson", "Hien", "Gudmundsson", "Holm", "Nilsson Lindelöf", "Lagerbielke", "Bergvall", "Larsson", "Karlström", "Ayari", "Svanberg",
    "Svensson", "Sema", "Bardghji", "Kulusevski", "Elanga", "Isak", "Gyökeres",
  ]),
  makeTeamSection("TUR", "Turquía", "🇹🇷", [
    "Cakir", "Muldur", "Celik", "Bardakci", "Soyuncu", "Demiral", "Kadioglu", "Ayhan", "Yuksek", "Calhanoglu", "Kokcu",
    "Guler", "Kahveci", "Akgun", "Uzun", "Yilmaz", "Akturkoglu", "Yildiz",
  ]),
];

// ── CONMEBOL — Sudamérica (6 equipos) ────────────────────────────
const conmebolTeams: AlbumSection[] = [
  makeTeamSection("ARG", "Argentina", "🇦🇷", [
    "E. Martínez", "Molina", "Romero", "Otamendi", "Tagliafico", "Balerdi", "Enzo Fernandez", "Mac Allister", "De Paul", "Palacios", "Paredes",
    "Paz", "Mastantuono", "N. González", "Messi", "L. Martínez", "Álvarez", "Simeone",
  ]),
  makeTeamSection("BRA", "Brasil", "🇧🇷", [
    "Alisson", "Bento", "Marquinhos", "Militão", "Gabriel Magalhães", "Danilo", "Wesley", "Paquetá", "Casemiro", "Guimarães", "L. Henrique",
    "Vinicius Júnior", "Rodrygo", "João Pedro", "Cunha", "Martinelli", "Raphinha", "Estévão",
  ]),
  makeTeamSection("COL", "Colombia", "🇨🇴", [
    "Vargas", "Ospina", "Sánchez", "Mina", "Munoz", "Mojica", "Lucumí", "Arias", "Lerma", "Castaño", "Rios",
    "J. Rodríguez", "Quintero", "Carrascal", "J. Arias", "Córdova", "Suárez", "Díaz",
  ]),
  makeTeamSection("ECU", "Ecuador", "🇪🇨", [
    "Galíndez", "Valle", "Hincapié", "Estupiñán", "Pacho", "Preciado", "Ordóñez", "Caicedo", "Franco", "Paez", "Vite",
    "Veboah", "Campana", "Plata", "Angulo", "Minda", "Rodriguez", "E. Valencia",
  ]),
  makeTeamSection("PAR", "Paraguay", "🇵🇾", [
    "Fernandez", "Gill", "Gomez", "Balbuena", "Cáceres", "Alderete", "Alonso", "Villasanti", "D. Gomez", "Bobadilla", "Cubas",
    "Galarza Fonda", "Enciso", "Romero Gamarra", "Almirón", "Sosa", "A. Romero", "Sanabria",
  ]),
  makeTeamSection("URU", "Uruguay", "🇺🇾", [
    "Rochet", "Mele", "Araujo", "Giménez", "Caceres", "Olivera", "Varela", "Nandez", "Valverde", "De Arrascaeta", "Bentancur",
    "Ugarte", "de la Cruz", "R. Araujo", "Núñez", "Viñas", "Aguirre", "Pellistri",
  ]),
];

// ── CONCACAF — Norte y Centroamérica (6 equipos) ─────────────────
const concacafTeams: AlbumSection[] = [
  makeTeamSection("CAN", "Canadá", "🍁", [
    "St.Clair", "Davies", "Johnston", "Adekugbe", "Laryea", "Cornelius", "Bombito", "Miller", "Eustáquio", "Koné", "Osorio",
    "Shaffelburg", "Choinière", "Sigur", "Buchanan", "Millar", "Larin", "David",
  ]),
  makeTeamSection("CUW", "Curazao", "🇨🇼", [
    "Room", "Obispo", "Floranus", "Gaari", "Brenet", "Van Eijma", "Sambo", "Comenencia", "Roemeratoe", "Bacuna", "L. Bacuna",
    "Chong", "Gorre", "Margaritha", "Locadia", "Antonisse", "Kastaneer", "Hansen",
  ]),
  makeTeamSection("HAI", "Haití", "🇭🇹", [
    "Placide", "Arcus", "Expérience", "Duverne", "Adé", "Lacroix", "Metusala", "Delcroix", "Pierre", "Jean Jacques", "Bellegarde",
    "Attys", "Etienne Jr", "Casimir", "Providence", "Nazon", "Deedson", "Pierrot",
  ]),
  makeTeamSection("MEX", "México", "🦅", [
    "Malagón", "Vasquez", "Sánchez", "Montes", "Gallardo", "Reyes", "Lainez", "Rodriguez", "Alvarez", "Pineda", "Ruiz",
    "É. Sánchez", "Lozano", "Giménez", "Jiménez", "Vega", "Alvarado", "Huerta",
  ]),
  makeTeamSection("PAN", "Panamá", "🇵🇦", [
    "Mosquera", "Mejia", "Escobar", "Andrade", "Murillo", "Davis", "Cordoba", "Blackman", "Martinez", "Godoy", "Carrasquilla",
    "Bárcenas", "Harvey", "Díaz", "Fajardo", "Waterman", "L. Rodriguez", "Quintero",
  ]),
  makeTeamSection("USA", "Estados Unidos", "🦅", [
    "Freese", "Richards", "Ream", "McKenzie", "Freeman", "Robinson", "Adams", "Tessmann", "McKennie", "Roldan", "Weah",
    "Luna", "Tillman", "Pulisic", "Aaronson", "Pepi", "Wright", "Balogun",
  ]),
];

// ── CAF — África (10 equipos) ─────────────────────────────────────
const cafTeams: AlbumSection[] = [
  makeTeamSection("ALG", "Argelia", "🟢", [
    "Guendouz", "Bensebaini", "Atal", "Aït-Nouri", "Tougai", "Mandi", "Bennacer", "Aquar", "Boudaoui", "Zerrouki", "Bentalab",
    "Chaibi", "Mahrez", "Benrahma", "Hadj Moussa", "Gouiri", "Bounedjah", "Amoura",
  ]),
  makeTeamSection("CPV", "Cabo Verde", "🇨🇻", [
    "Vozinha", "Costa", "Pico", "Diney", "Moreira", "Pina", "Paulo", "Semedo", "K. Pina", "Andrade", "Monteiro",
    "Duarte", "Rodrigues", "Cabral", "Mendes", "Livramento", "W. Semedo", "Bebe",
  ]),
  makeTeamSection("COD", "Congo RD", "🇨🇩", [
    "Mpasi", "Wan-Bissaka", "Tuanzebe", "Masuaku", "Mbemba", "Kayembe", "Pickel", "Mukau", "E. Kayembe", "Moutoussamy", "Sadiki",
    "Bongonda", "Elia", "Wissa", "Cipenga", "Mayele", "Bakambu", "Mbuku",
  ]),
  makeTeamSection("EGY", "Egipto", "🦅", [
    "El Shenawy", "Hany", "Hamdy", "Ibrahim", "Sobhi", "Rabia", "Abdelmaguid", "Fatouh", "Attia", "Zizo", "Fathy",
    "Lasheen", "Ashour", "Faisal", "Salah", "M. Mohamed", "Trezeguet", "Marmoush",
  ]),
  makeTeamSection("GHA", "Ghana", "⭐", [
    "Ati Zigi", "Lamptey", "Salisu", "Seidu", "Djiku", "Mensah", "Yirenkyi", "Fatawu", "Partey", "Samed", "Sulemana",
    "Kudus", "I. Williams", "J. Ayew", "A. Ayew", "Paintsil", "Bukari", "Semenyo",
  ]),
  makeTeamSection("CIV", "Costa de Marfil", "🐘", [
    "Fofana", "Konan", "Singo", "Kossounou", "Ndicka", "Boly", "Agbadou", "Diomande", "Kessie", "Y. Fofana", "Sangare",
    "Gbamin", "Diallo", "Haller", "Adingra", "Y. Diomande", "Guessand", "Diakite",
  ]),
  makeTeamSection("MAR", "Marruecos", "🌟", [
    "Bounou", "El Kajoui", "Hakimi", "Mazraoui", "Aguerd", "Saiss", "El Yamiq", "Masina", "Amrabat", "Ounahi", "Ben Seghir",
    "El Khannouss", "Saibari", "En-Nesyri", "Ezzalzouli", "Rahimi", "Diaz", "El Kaabi",
  ]),
  makeTeamSection("SEN", "Senegal", "🦁", [
    "Mendy", "Diouf", "Niakhaté", "Seck", "Jakobs", "M. Diouf", "Koulibaly", "Gueye", "Sarr", "P. Gueye", "Diarra",
    "Camara", "Mane", "P. Sarr", "Dia", "Ndiaye", "Jackson", "Diatta",
  ]),
  makeTeamSection("RSA", "Sudáfrica", "🇿🇦", [
    "Williams", "Chaine", "Modiba", "Kabini", "Mbokazi", "Ndamane", "S. Ngezana", "Sibisi", "Mbatha", "Aubaas", "Sithole",
    "Mbule", "Foster", "Rayners", "Nkota", "Appollis", "Tau", "Zwane",
  ]),
  makeTeamSection("TUN", "Túnez", "🌙", [
    "Ben Said", "Dahmen", "Valery", "Talbi", "Meriah", "Abdi", "Bronn", "Skhiri", "Laidouni", "Sassi", "Ben Romdhane",
    "Mejbri", "Achouri", "Saad", "Mastouri", "Gharbi", "Ltaief", "Sliti",
  ]),
];

// ── AFC — Asia (8 equipos) ────────────────────────────────────────
const afcTeams: AlbumSection[] = [
  makeTeamSection("AUS", "Australia", "🦘", [
    "Ryan", "Gauci", "Souttar", "Circati", "Bos", "Behich", "Burgess", "Miller", "Degenek", "Irvine", "McGree",
    "O'Neill", "Metcalfe", "Yazbek", "Goodwin", "Vengi", "Irankunda", "Touré",
  ]),
  makeTeamSection("IRN", "Irán", "🦁", [
    "Beiranvand", "Pouraliganji", "Hajsafi", "Mohammadi", "Khalilzadeh", "Rezaeian", "Kanaani", "Moharrami", "Hardani", "Ezatolahi", "Ghoddos",
    "Noorafkan", "Cheshmi", "Mohebi", "Azmoun", "Taremi", "Jahanbakhsh", "Gholizadeh",
  ]),
  makeTeamSection("IRQ", "Irak", "🌙", [
    "Hassan", "Sulaka", "Ali", "Hashem", "Doski", "Tahseen", "Younis", "Iqbal", "Al-Ammari", "Bavesh", "Jasim",
    "Amyn", "Sher", "Farji", "Rashid", "Al-Hamadi", "Hussein", "M. Ali",
  ]),
  makeTeamSection("JPN", "Japón", "🔴", [
    "Suzuki", "Mochizuki", "Seko", "J. Suzuki", "Taniguchi", "Watanabe", "Sano", "Soma", "Tanaka", "Kamada", "Kubo",
    "Doan", "Nakamura", "Minamino", "Machino", "Ito", "Ogawa", "Ueda",
  ]),
  makeTeamSection("JOR", "Jordania", "🇯🇴", [
    "Abulaila", "Haddad", "Abu Hashish", "Al-Arab", "Nasib", "Obaid", "Abualnadi", "Saadeh", "Al-Rashdan", "Al-Rawabdeh", "Abu Taha",
    "Jamous", "Al-Taamari", "Al-Naimat", "Al-Mardi", "Olwan", "Abu Zrayq", "Sabra",
  ]),
  makeTeamSection("KOR", "Corea del Sur", "🐯", [
    "Jo", "Kim Seung-Gyu", "Kim Min-jae", "Cho", "Seol", "Lee Han-beom", "Lee Tae-seok", "Lee Myung-jae", "Lee Jae-sung", "Hwang", "Lee Kang-in",
    "Paik", "Castrop", "Lee Dong-yeong", "Cho Gue-sung", "Son", "Hwang Hee-chan", "Oh",
  ]),
  makeTeamSection("KSA", "Arabia Saudita", "🦅", [
    "Alaqidi", "Al-Sanbi", "Abdulhamid", "Bouwashl", "Thakri", "Al-Harbi", "Altambakti", "Aljuwayr", "Aljohani", "Alkhaibari", "Aldawsari",
    "Abu Alshamat", "Alsahafi", "S. Aldawsari", "Al-Aboud", "Akbrikan", "Alshehri", "Al-Hamdan",
  ]),
  makeTeamSection("QAT", "Catar", "🌙", [
    "Barsham", "Albrake", "Mendes", "Ahmed", "Khoukhi", "Miguel", "Salman", "Al-Mannai", "Boudiaf", "Madibo", "Fatehi",
    "Waad", "Hatem", "Al-Haydos", "Junior", "Afif", "Al Ganehi", "Ali",
  ]),
  makeTeamSection("UZB", "Uzbekistán", "🐆", [
    "Yusupov", "Savfiev", "Nasrullaev", "Eshmurodov", "Aliqulov", "Ashurmatov", "Alijonov", "Khusanov", "Hamrobekov", "Shukurov", "Iskanderov",
    "Turgunboev", "Erkinov", "Shomurodov", "Urunov", "Masharipov", "Sergeev", "Fayzullaev",
  ]),
];

// ── OFC — Oceanía (1 equipo) ──────────────────────────────────────
const ofcTeams: AlbumSection[] = [
  makeTeamSection("NZL", "Nueva Zelanda", "🥝", [
    "Crocombe Payne", "Paulsen", "Boxall", "Cacace", "Payne", "Bindon", "de Vries", "Surman", "Bell", "Singh", "Thomas",
    "Garbett", "Stamenić", "Old", "Wood", "Just", "McCowatt", "Barbarouses",
  ]),
];

// ── Group order (official WC2026 draw) ────────────────────────────
const GROUP_ORDER: [string, string[]][] = [
  ["A", ["MEX", "RSA", "KOR", "CZE"]],
  ["B", ["CAN", "BIH", "QAT", "SUI"]],
  ["C", ["BRA", "MAR", "HAI", "SCO"]],
  ["D", ["USA", "PAR", "AUS", "TUR"]],
  ["E", ["GER", "CUW", "CIV", "ECU"]],
  ["F", ["NED", "JPN", "SWE", "TUN"]],
  ["G", ["BEL", "EGY", "IRN", "NZL"]],
  ["H", ["ESP", "CPV", "KSA", "URU"]],
  ["I", ["FRA", "SEN", "IRQ", "NOR"]],
  ["J", ["ARG", "ALG", "AUT", "JOR"]],
  ["K", ["POR", "COD", "UZB", "COL"]],
  ["L", ["ENG", "CRO", "GHA", "PAN"]],
];

const teamSectionById = new Map<string, AlbumSection>(
  [...uefaTeams, ...conmebolTeams, ...concacafTeams, ...cafTeams, ...afcTeams, ...ofcTeams]
    .map((s) => [s.id, s])
);

const orderedTeamSections: AlbumSection[] = GROUP_ORDER.flatMap(([, codes]) =>
  codes.map((code) => {
    const s = teamSectionById.get(code);
    if (!s) throw new Error(`Team section not found: ${code}`);
    return s;
  })
);

const allSections = [openingSection, ...orderedTeamSections];

export const WORLD_CUP_2026: Album = {
  id: "wc2026",
  name: "FIFA World Cup 2026™",
  year: 2026,
  totalStickers: allSections.reduce((sum, s) => sum + s.stickers.length, 0),
  sections: allSections,
};

export const ALBUM_SECTIONS_MAP = new Map(
  WORLD_CUP_2026.sections.map((s) => [s.id, s])
);

export const ALL_STICKERS_MAP = new Map(
  WORLD_CUP_2026.sections.flatMap((s) => s.stickers).map((st) => [st.id, st])
);

export const TEAM_GROUP: Record<string, string> = {};
export const GROUP_HEADERS: Record<string, string> = {};

for (const [letter, codes] of GROUP_ORDER) {
  const label = `Grupo ${letter}`;
  for (const code of codes) {
    TEAM_GROUP[code] = letter;
    GROUP_HEADERS[code] = label;
  }
}

export const FIFA_TO_ISO: Record<string, string> = {
  MEX: "mx", RSA: "za", KOR: "kr", CZE: "cz",
  CAN: "ca", BIH: "ba", QAT: "qa", SUI: "ch",
  BRA: "br", MAR: "ma", HAI: "ht", SCO: "gb-sct",
  USA: "us", PAR: "py", AUS: "au", TUR: "tr",
  GER: "de", CUW: "cw", CIV: "ci", ECU: "ec",
  NED: "nl", JPN: "jp", SWE: "se", TUN: "tn",
  BEL: "be", EGY: "eg", IRN: "ir", NZL: "nz",
  ESP: "es", CPV: "cv", KSA: "sa", URU: "uy",
  FRA: "fr", SEN: "sn", IRQ: "iq", NOR: "no",
  ARG: "ar", ALG: "dz", AUT: "at", JOR: "jo",
  POR: "pt", COD: "cd", UZB: "uz", COL: "co",
  ENG: "gb-eng", CRO: "hr", GHA: "gh", PAN: "pa",
};

export const CONFEDERATION_HEADERS: Record<string, string> = GROUP_HEADERS;
