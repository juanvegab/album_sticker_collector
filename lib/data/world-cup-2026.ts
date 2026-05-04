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

// 20 stickers per team: 1 badge + 1 squad photo + 18 players
function makeTeamSection(
  id: string,
  countryName: string,
  emoji: string,
  teamCode: string,
  players: string[]
): AlbumSection {
  const stickers: AlbumSticker[] = [
    makeSticker(id, 1, `${countryName} - Escudo`, "badge", teamCode),
    makeSticker(id, 2, `${countryName} - Foto de Equipo`, "special", teamCode),
    ...players.slice(0, 18).map((p, i) =>
      makeSticker(id, i + 3, p, "player", teamCode)
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

// ── UEFA Teams (16) ───────────────────────────────────────────────
const uefaTeams: AlbumSection[] = [
  makeTeamSection("ALB", "Albania", "🦅", "ALB", [
    "Strakosha", "Berisha", "Djimsiti", "Ismajli", "Hysaj", "Kumbulla",
    "Gjasula", "Ramadani", "Bajrami", "Laci", "Asllani",
    "Manaj", "Broja", "Seferi", "Cikalleshi", "Uzuni", "Roshi", "Muçi",
  ]),
  makeTeamSection("AUT", "Austria", "🇦🇹", "AUT", [
    "Pentz", "Lindner", "Posch", "Trauner", "Wöber", "Prass", "Daniliuc",
    "Laimer", "Grillitsch", "Baumgartner", "Sabitzer", "Seiwald",
    "Arnautovic", "Gregoritsch", "Wimmer", "Schmid", "Ljubicic", "Wiesinger",
  ]),
  makeTeamSection("BEL", "Bélgica", "🇧🇪", "BEL", [
    "Casteels", "Mignolet", "Castagne", "Faes", "Debast", "Theate", "Vertonghen",
    "Tielemans", "Onana", "De Bruyne", "Doku", "Mangala",
    "Lukaku", "Openda", "De Ketelaere", "Vanaken", "Origi", "Batshuayi",
  ]),
  makeTeamSection("CRO", "Croacia", "🇭🇷", "CRO", [
    "Livakovic", "Gvardiol", "Juranovic", "Vida", "Sutalo", "Erlic",
    "Brozovic", "Kovacic", "Modric", "Pasalic", "Majer",
    "Budimir", "Petkovic", "Kramaric", "Ivanusec", "Orsic", "Sucic", "Pjaca",
  ]),
  makeTeamSection("DEN", "Dinamarca", "🇩🇰", "DEN", [
    "Schmeichel", "Ronnow", "Andersen", "Christensen", "Vestergaard", "Maehle", "Bah",
    "Delaney", "Eriksen", "Hojbjerg", "Hjulmand",
    "Wind", "Dolberg", "Poulsen", "Damsgaard", "Lindstrom", "Olsen", "Skov Olsen",
  ]),
  makeTeamSection("ENG", "Inglaterra", "🦁", "ENG", [
    "Pickford", "Pope", "Alexander-Arnold", "Stones", "Maguire", "Shaw", "Trippier",
    "Bellingham", "Rice", "Saka", "Foden",
    "Kane", "Rashford", "Grealish", "Palmer", "Gordon", "Toney", "Watkins",
  ]),
  makeTeamSection("FRA", "Francia", "🐓", "FRA", [
    "Maignan", "Lloris", "Pavard", "Upamecano", "Saliba", "T. Hernández", "Koundé",
    "Tchouaméni", "Camavinga", "Griezmann", "Rabiot",
    "Mbappé", "Dembélé", "Giroud", "Thuram", "Coman", "Diaby", "Zaire-Emery",
  ]),
  makeTeamSection("GEO", "Georgia", "🇬🇪", "GEO", [
    "Mamardashvili", "Loria", "Kakabadze", "Kashia", "Dvali", "Lochoshvili", "Gvelesiani",
    "Chakvetadze", "Mekvabishvili", "Kiteishvili", "Kochorashvili",
    "Mikautadze", "Zivzivadze", "Davitashvili", "Kvilitaia", "Skhirtladze", "Lobjanidze", "Tsitaishvili",
  ]),
  makeTeamSection("GER", "Alemania", "🦅", "GER", [
    "Neuer", "ter Stegen", "Kimmich", "Rüdiger", "Schlotterbeck", "Mittelstädt", "Tah",
    "Andrich", "Kroos", "Musiala", "Goretzka",
    "Füllkrug", "Havertz", "Gnabry", "Sané", "Wirtz", "Undav", "Adeyemi",
  ]),
  makeTeamSection("NED", "Países Bajos", "🌷", "NED", [
    "Flekken", "Verbruggen", "Dumfries", "De Vrij", "Van Dijk", "Blind", "Ake",
    "Schouten", "De Jong", "Simons", "Reijnders",
    "Gakpo", "Depay", "Weghorst", "Zirkzee", "Veerman", "Malen", "Lang",
  ]),
  makeTeamSection("POL", "Polonia", "🦅", "POL", [
    "Szczęsny", "Skorupski", "Bereszyński", "Glik", "Kiwior", "Zalewski", "Wieteska",
    "Bielik", "Krychowiak", "Zieliński", "Szymanski",
    "Lewandowski", "Piątek", "Frankowski", "Milik", "Swiderski", "Buksa", "Augustyniak",
  ]),
  makeTeamSection("POR", "Portugal", "🇵🇹", "POR", [
    "Rui Patrício", "Costa", "Dalot", "Pepe", "Rúben Dias", "Guerreiro", "Cancelo",
    "Palhinha", "Vitinha", "B. Fernandes", "Neves",
    "Ronaldo", "Bernardo Silva", "Rafael Leão", "Diogo Jota", "Pedro Neto", "Gonçalo Ramos", "Félix",
  ]),
  makeTeamSection("ROU", "Rumania", "🇷🇴", "ROU", [
    "Niță", "Rădunovic", "Rațiu", "Burcă", "Drăguș", "Bancu", "Chiricheș",
    "Marin", "Stanciu", "Man", "Mihăilă",
    "Pușcaș", "Iordănescu", "Alibec", "Coman", "Florinel Coman", "Drăguș", "Baiaram",
  ]),
  makeTeamSection("ESP", "España", "🇪🇸", "ESP", [
    "Unai Simón", "Raya", "Carvajal", "Le Normand", "Laporte", "Cucurella", "Nacho",
    "Fabián Ruiz", "Rodri", "Pedri", "Gavi",
    "Yamal", "Morata", "Williams", "Ferran Torres", "Joselu", "Dani Olmo", "Merino",
  ]),
  makeTeamSection("SUI", "Suiza", "🇨🇭", "SUI", [
    "Sommer", "Mvogo", "Widmer", "Elvedi", "Akanji", "Rodriguez", "Schar",
    "Freuler", "Xhaka", "Steffen", "Zakaria",
    "Embolo", "Okafor", "Shaqiri", "Vargas", "Seferovic", "Zeqiri", "Ndoye",
  ]),
  makeTeamSection("TUR", "Turquía", "🇹🇷", "TUR", [
    "Çakır", "Babacan", "Zeki Çelik", "Demiral", "Bardakcı", "Müldür", "Kabak",
    "Yüksek", "Özcan", "Güler", "Çalhanoğlu",
    "Yılmaz", "Akturkoglu", "Kökcü", "Under", "Yazıcı", "Tosun", "Dervisoglu",
  ]),
];

// ── CONMEBOL Teams (10) ───────────────────────────────────────────
const conmebolTeams: AlbumSection[] = [
  makeTeamSection("ARG", "Argentina", "🇦🇷", "ARG", [
    "E. Martínez", "Armani", "Montiel", "Romero", "Otamendi", "Acuña", "Tagliafico",
    "De Paul", "Mac Allister", "Enzo Fernández", "Paredes",
    "Messi", "Di María", "Álvarez", "Dybala", "Lautaro Martínez", "Correa", "Pezzella",
  ]),
  makeTeamSection("BOL", "Bolivia", "🇧🇴", "BOL", [
    "Lampe", "Viscarra", "Jusino", "Quinteros", "Sagredo", "Fernández", "Ortiz",
    "Saucedo", "Roca", "Ramallo", "Arce",
    "Moreno", "Algarañaz", "Marcelo Moreno", "Duk", "Cuéllar", "Chura", "Vaca",
  ]),
  makeTeamSection("BRA", "Brasil", "🇧🇷", "BRA", [
    "Alisson", "Ederson", "Danilo", "Marquinhos", "Gabriel Magalhães", "Guilherme Arana", "Militão",
    "Bruno Guimarães", "Casemiro", "Rodrygo", "Paquetá",
    "Vinicius Jr.", "Endrick", "Raphinha", "Gabriel Jesus", "Neymar", "Savinho", "Gerson",
  ]),
  makeTeamSection("CHI", "Chile", "🇨🇱", "CHI", [
    "Bravo", "Cortés", "Isla", "Maripán", "Medel", "Estrada", "Mena",
    "Pulgar", "Ríos", "Brereton Díaz", "Aranguiz",
    "Sánchez", "Vargas", "Palacios", "Larenas", "Castillo", "Díaz", "Zampedri",
  ]),
  makeTeamSection("COL", "Colombia", "🇨🇴", "COL", [
    "Vargas", "Camilo Vargas", "Muñoz", "Lucumí", "Cuesta", "Mojica", "Dávinson Sánchez",
    "Lerma", "Uribe", "James Rodríguez", "Cardona",
    "Díaz", "Cuadrado", "Córdoba", "Borré", "Morelos", "Arango", "Sinisterra",
  ]),
  makeTeamSection("ECU", "Ecuador", "🇪🇨", "ECU", [
    "Domínguez", "Galíndez", "Preciado", "Hincapié", "Torres", "Estupiñán", "Pacho",
    "Méndez", "Caicedo", "Plata", "Gruezo",
    "Enner Valencia", "Ibarra", "Estrada", "Cifuentes", "Mena", "Díaz", "Rodríguez",
  ]),
  makeTeamSection("PAR", "Paraguay", "🇵🇾", "PAR", [
    "Silva", "Servín", "Alderete", "Alonso", "Balbuena", "Otálvaro", "Espínola",
    "Villasanti", "Cubas", "Almirón", "Bareiro",
    "Sanabria", "Enciso", "Romero", "Giménez", "Bobadilla", "Ávalos", "Acuña",
  ]),
  makeTeamSection("PER", "Perú", "🇵🇪", "PER", [
    "Gallese", "Arias", "Callens", "Santamaría", "López", "Trauco", "Araujo",
    "Tapia", "Peña", "Cueva", "Cartagena",
    "Guerrero", "Lapadula", "Flores", "Polo", "Abram", "Aquino", "Grimaldo",
  ]),
  makeTeamSection("URU", "Uruguay", "🇺🇾", "URU", [
    "Rochet", "Olivera", "Giménez", "Araújo", "Nández", "Piquerez", "Caceres",
    "Valverde", "Bentancur", "De Arrascaeta", "Ugarte",
    "Suárez", "Núñez", "Darwin Núñez", "Torres", "Pellistri", "Viña", "Rodríguez",
  ]),
  makeTeamSection("VEN", "Venezuela", "🇻🇪", "VEN", [
    "Faríñez", "Romo", "Hernández", "Osorio", "Ferraresi", "Chancellor", "Gonzáles",
    "Herrera", "Casseres", "Soteldo", "Martínez",
    "Salomón Rondón", "Bello", "Machis", "Sosa", "Palacios", "Flores", "Otero",
  ]),
];

// ── CONCACAF Teams (8) ────────────────────────────────────────────
const concacafTeams: AlbumSection[] = [
  makeTeamSection("CAN", "Canadá", "🍁", "CAN", [
    "Crepeau", "St. Clair", "Johnston", "Miller", "Vitoria", "Laryea", "Adekugbe",
    "Eustaquio", "Hutchinson", "Davies", "Kone",
    "David", "Larin", "Buchanan", "Ugbo", "Osorio", "Laryea", "Arfield",
  ]),
  makeTeamSection("CRC", "Costa Rica", "🇨🇷", "CRC", [
    "Navas", "Sequeira", "Duarte", "Calvo", "Oviedo", "Vargas", "Waston",
    "Borges", "Tejeda", "Campbell", "Torres",
    "Venegas", "Contreras", "Ureña", "Moreira", "Aguilera", "Galo", "López",
  ]),
  makeTeamSection("HON", "Honduras", "🇭🇳", "HON", [
    "Becerra", "Ochoa", "Discua", "Álvarez", "Meléndez", "Benguché", "Cálix",
    "Lozano", "Arriaga", "Pereira", "Zerbe",
    "Elis", "Quioto", "Antony Lozano", "Pavón", "Martínez", "García", "Romell Quioto",
  ]),
  makeTeamSection("JAM", "Jamaica", "🇯🇲", "JAM", [
    "Blake", "Ricketts", "Bell", "Pinnock", "Lawrence", "Antonio", "Lowe",
    "Marshall", "Nicholson", "Bailey", "Decordova-Reid",
    "Bayer", "Phillips", "Roofe", "Bunbury", "Morrison", "Allen", "Brown",
  ]),
  makeTeamSection("MEX", "México", "🦅", "MEX", [
    "Ochoa", "Cota", "Sánchez", "Montes", "Moreno", "Gallardo", "Álvarez",
    "Herrera", "Romo", "Lozano", "Antuna",
    "Jiménez", "Martín", "Vega", "Alvarado", "Flores", "Aguirre", "Corona",
  ]),
  makeTeamSection("PAN", "Panamá", "🇵🇦", "PAN", [
    "Mosquera", "De León", "Davis", "Cummings", "Córdoba", "Murillo", "Blackman",
    "Quintero", "Carrasquilla", "Godoy", "Fajardo",
    "Pérez", "Baloy", "Brown", "Torres", "Anderson", "Cox", "Taylor",
  ]),
  makeTeamSection("USA", "Estados Unidos", "🦅", "USA", [
    "Turner", "Horvath", "Dest", "Richards", "Long", "Robinson", "Zimmerman",
    "McKennie", "Adams", "Musah", "Acosta",
    "Pulisic", "Weah", "Reyna", "Ferreira", "Sargent", "Balogun", "Tillman",
  ]),
  makeTeamSection("CUB", "Cuba/CONCACAF Play-off", "🌍", "CUB", [
    "Pérez", "García", "Rodríguez", "Martínez", "González", "López", "Herrera",
    "Fuentes", "Castillo", "Reyes", "Álvarez",
    "Torres", "Mora", "Barrera", "Valdés", "Cruz", "Espinosa", "Méndez",
  ]),
];

// ── CAF Teams (9) ────────────────────────────────────────────────
const cafTeams: AlbumSection[] = [
  makeTeamSection("CMR", "Camerún", "🦁", "CMR", [
    "Onana", "Epassy", "Fai", "Ngadeu", "Tolo", "Nouhou", "Castelletto",
    "Anguissa", "Moumi Ngamaleu", "Hongla", "Mbeumo",
    "Aboubakar", "Choupo-Moting", "Toko Ekambi", "Bassogog", "Kunde", "Nkoulou", "Malong",
  ]),
  makeTeamSection("EGY", "Egipto", "🦅", "EGY", [
    "El-Shennawy", "Gabaski", "Hegazy", "Hamdi Fathi", "Kahraba", "Omar Gaber", "Abdelmonem",
    "Elneny", "Trezeguet", "Zizo", "Amr El Soulia",
    "Salah", "Mostafa Mohamed", "Marmoush", "Ashour", "El Shaarawy", "Omar Marmoush", "Shobeir",
  ]),
  makeTeamSection("GHA", "Ghana", "⭐", "GHA", [
    "Wollacott", "Danlad", "Salisu", "Amartey", "Odoi", "Lamptey", "Mensah",
    "Partey", "Sulley Muntari", "Kudus", "Kyereh",
    "Ayew", "Opoku", "Fatawu", "Williams", "Boateng", "Asante", "Owusu",
  ]),
  makeTeamSection("MAR", "Marruecos", "🌟", "MAR", [
    "Bono", "Munir", "Hakimi", "Aguerd", "Saiss", "Mazraoui", "El Yamiq",
    "Amrabat", "Ounahi", "Ziyech", "Sabiri",
    "En-Nesyri", "Boufal", "El Khannouss", "Berchiche", "Tagnaouti", "Benoun", "Rahimi",
  ]),
  makeTeamSection("NGA", "Nigeria", "🦅", "NGA", [
    "Nwabara", "Uzoho", "Osayi-Samuel", "Troost-Ekong", "Collins", "Chukwueze", "Rohr",
    "Ndidi", "Iheanacho", "Lookman", "Moffi",
    "Osimhen", "Awoniyi", "Simon", "Aribo", "Aina", "Dessers", "Balogun",
  ]),
  makeTeamSection("SEN", "Senegal", "🦁", "SEN", [
    "Mendy", "Gomis", "Sabaly", "Kouyaté", "Koulibaly", "Jakobs", "Ciss",
    "Gueye", "Camara", "Mané", "Sarr",
    "Diatta", "Boulaye Dia", "Diedhiou", "Sow", "Ndiaye", "Konaté", "Pape Matar Sarr",
  ]),
  makeTeamSection("RSA", "Sudáfrica", "🇿🇦", "RSA", [
    "Williams", "Petersen", "Mudau", "Shalulile", "Xulu", "Tau", "Modiba",
    "Zungu", "Zwane", "Dolly", "Mothiba",
    "Erasmus", "Foster", "Nurkovic", "Jali", "Lorch", "Brockie", "Dolly",
  ]),
  makeTeamSection("TUN", "Túnez", "🌙", "TUN", [
    "Dahmen", "Ben Said", "Meriah", "Talbi", "Bronn", "Haddad", "Ben Slimane",
    "Laidouni", "Chaalali", "Khazri", "Ben Romdhane",
    "Msakni", "Slimane", "Ben Youssef", "Jaziri", "Laïdouni", "Drager", "Skhiri",
  ]),
  makeTeamSection("CIV", "Costa de Marfil", "🐘", "CIV", [
    "Gbane", "Zadi", "Aurier", "Deli", "Bailly", "Konan", "Cissé",
    "Seri", "Sangaré", "Zaha", "Konaté",
    "Haller", "Pepe", "Gradel", "Boga", "Kessié", "Traoré", "Dao",
  ]),
];

// ── AFC Teams (8) ─────────────────────────────────────────────────
const afcTeams: AlbumSection[] = [
  makeTeamSection("AUS", "Australia", "🦘", "AUS", [
    "Ryan", "Redmayne", "Atkinson", "Rowles", "Souttar", "Behich", "Degenek",
    "Mooy", "Rogic", "Irvine", "Hrustic",
    "Leckie", "Duke", "Maclaren", "McGree", "Metcalfe", "Goodwin", "Mabil",
  ]),
  makeTeamSection("IRI", "Irán", "🦁", "IRI", [
    "Beiranvand", "Hosseini", "Hajsafi", "Pouraliganji", "Mohammadi", "Cheshmi", "Rezaeian",
    "Ezatolahi", "Noorollahi", "Jahanbakhsh", "Ghoddos",
    "Taremi", "Ansarifard", "Shojaei", "Sarlak", "Torabi", "Karimi", "Amiri",
  ]),
  makeTeamSection("JPN", "Japón", "🔴", "JPN", [
    "Gonda", "Kawashima", "Sakai", "Yoshida", "Tomiyasu", "Nagatomo", "Itakura",
    "Endo", "Kamada", "Kubo", "Tanaka",
    "Mitoma", "Osako", "Ueda", "Furuhashi", "Maeda", "Hayashi", "Matsuki",
  ]),
  makeTeamSection("KOR", "Corea del Sur", "🐯", "KOR", [
    "Kim Seung-gyu", "Jo Hyeon-woo", "Kim Moon-hwan", "Kim Min-jae", "Kim Young-gwon", "Kim Jin-su", "Jung Woo-young",
    "Lee Jae-sung", "Son Heung-min", "Hwang In-beom", "Kwon Chang-hoon",
    "Hwang Hee-chan", "Cho Gue-sung", "Oh Hyeon-gyu", "Na Sang-ho", "Lee Kang-in", "Jeong Woo-yeong", "Kwon Kyung-won",
  ]),
  makeTeamSection("SAU", "Arabia Saudita", "🦅", "SAU", [
    "Al-Owais", "Al-Yami", "Al-Shahrani", "Al-Bulayhi", "Tambakti", "Al-Ghannam", "Abdulhamid",
    "Al-Dawsari", "Al-Malki", "Al-Shehri", "Kanno",
    "Al-Abid", "Al-Fatil", "Bafetimbi Gomis", "Bahebri", "Feras", "Sulaiman", "Al-Kadhi",
  ]),
  makeTeamSection("UZB", "Uzbekistán", "🐆", "UZB", [
    "Yusupov", "Nishonov", "Ashurmatov", "Abdukodirov", "Khamdamov", "Khashimov", "Ergashev",
    "Shomurodov", "Tursunov", "Djeparov", "Saidov",
    "Masharipov", "Ismoilov", "Makhmudov", "Khamdamov", "Umarov", "Boymurodov", "Mukhammadiev",
  ]),
  makeTeamSection("QAT", "Catar", "🌙", "QAT", [
    "Al-Sheeb", "Barsham", "Pedro Miguel", "Khoukhi", "Hassan", "Homam", "Ahmed",
    "Al-Haydos", "Boudiaf", "Muntari", "Ali",
    "Al Moez Ali", "Akram", "Al-Amin", "Afif", "Yusuf", "Salem", "Madibo",
  ]),
  makeTeamSection("IND", "India/AFC Play-off", "🐯", "IND", [
    "Gurpreet Singh", "Amrinder Singh", "Sandesh Jhingan", "Chinglensana Singh", "Lalchungnunga", "Akash Mishra", "Pritam Kotal",
    "Rowllin Borges", "Sahal Abdul Samad", "Anirudh Thapa", "Brandon Fernandes",
    "Sunil Chhetri", "Manvir Singh", "Liston Colaco", "Naorem Singh", "Ishan Pandita", "Ashique Kuruniyan", "Jeakson Singh",
  ]),
];

// ── OFC & Playoffs (3) ────────────────────────────────────────────
const ofcTeams: AlbumSection[] = [
  makeTeamSection("NZL", "Nueva Zelanda", "🥝", "NZL", [
    "Sail", "Old", "Cacace", "Topor-Stanley", "McGlinchey", "Bell", "Read",
    "Waine", "De Vries", "Barbarouses", "Thomas",
    "Wood", "Smeltz", "Ingham", "Kobe", "Singh", "Gale", "Boxall",
  ]),
  makeTeamSection("OFC", "OFC Play-off", "🌏", "OFC", [
    "Johnson", "Williams", "Brown", "Davis", "Wilson", "Jones", "Taylor",
    "Anderson", "Thomas", "Martin", "White",
    "Harris", "Thompson", "Jackson", "Lewis", "Walker", "Allen", "Scott",
  ]),
  makeTeamSection("PLY", "Play-off Intercontinental", "🌍", "PLY", [
    "García", "López", "Martínez", "González", "Rodríguez", "Hernández", "Díaz",
    "Torres", "Ramírez", "Flores", "Morales",
    "Jiménez", "Castro", "Vargas", "Mendoza", "Silva", "Santos", "Pereira",
  ]),
];

// ── Assemble full album ───────────────────────────────────────────
const allSections = [
    openingSection,
    stadiumSection,
    ...uefaTeams,
    ...conmebolTeams,
    ...concacafTeams,
    ...cafTeams,
    ...afcTeams,
    ...ofcTeams,
];

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

export const CONFEDERATION_HEADERS: Record<string, string> = {
  ALB: "🇪🇺 UEFA — EUROPA",
  AUT: "🇪🇺 UEFA — EUROPA",
  BEL: "🇪🇺 UEFA — EUROPA",
  CRO: "🇪🇺 UEFA — EUROPA",
  DEN: "🇪🇺 UEFA — EUROPA",
  ENG: "🇪🇺 UEFA — EUROPA",
  FRA: "🇪🇺 UEFA — EUROPA",
  GEO: "🇪🇺 UEFA — EUROPA",
  GER: "🇪🇺 UEFA — EUROPA",
  NED: "🇪🇺 UEFA — EUROPA",
  POL: "🇪🇺 UEFA — EUROPA",
  POR: "🇪🇺 UEFA — EUROPA",
  ROU: "🇪🇺 UEFA — EUROPA",
  ESP: "🇪🇺 UEFA — EUROPA",
  SUI: "🇪🇺 UEFA — EUROPA",
  TUR: "🇪🇺 UEFA — EUROPA",
  ARG: "🌎 CONMEBOL — SUDAMÉRICA",
  BOL: "🌎 CONMEBOL — SUDAMÉRICA",
  BRA: "🌎 CONMEBOL — SUDAMÉRICA",
  CHI: "🌎 CONMEBOL — SUDAMÉRICA",
  COL: "🌎 CONMEBOL — SUDAMÉRICA",
  ECU: "🌎 CONMEBOL — SUDAMÉRICA",
  PAR: "🌎 CONMEBOL — SUDAMÉRICA",
  PER: "🌎 CONMEBOL — SUDAMÉRICA",
  URU: "🌎 CONMEBOL — SUDAMÉRICA",
  VEN: "🌎 CONMEBOL — SUDAMÉRICA",
  CAN: "🌎 CONCACAF — NORTEAMÉRICA",
  CRC: "🌎 CONCACAF — NORTEAMÉRICA",
  HON: "🌎 CONCACAF — NORTEAMÉRICA",
  JAM: "🌎 CONCACAF — NORTEAMÉRICA",
  MEX: "🌎 CONCACAF — NORTEAMÉRICA",
  PAN: "🌎 CONCACAF — NORTEAMÉRICA",
  USA: "🌎 CONCACAF — NORTEAMÉRICA",
  CUB: "🌎 CONCACAF — NORTEAMÉRICA",
  CMR: "🌍 CAF — ÁFRICA",
  EGY: "🌍 CAF — ÁFRICA",
  GHA: "🌍 CAF — ÁFRICA",
  MAR: "🌍 CAF — ÁFRICA",
  NGA: "🌍 CAF — ÁFRICA",
  SEN: "🌍 CAF — ÁFRICA",
  RSA: "🌍 CAF — ÁFRICA",
  TUN: "🌍 CAF — ÁFRICA",
  CIV: "🌍 CAF — ÁFRICA",
  AUS: "🌏 AFC — ASIA/OCEANÍA",
  IRI: "🌏 AFC — ASIA/OCEANÍA",
  JPN: "🌏 AFC — ASIA/OCEANÍA",
  KOR: "🌏 AFC — ASIA/OCEANÍA",
  SAU: "🌏 AFC — ASIA/OCEANÍA",
  UZB: "🌏 AFC — ASIA/OCEANÍA",
  QAT: "🌏 AFC — ASIA/OCEANÍA",
  IND: "🌏 AFC — ASIA/OCEANÍA",
  NZL: "🌏 AFC — ASIA/OCEANÍA",
  OFC: "🌏 OFC — OCEANÍA",
  PLY: "⚔️ Play-offs",
};
