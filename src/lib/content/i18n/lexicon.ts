import type { Locale } from "@/lib/i18n/locale";

/**
 * The words the questions are made of, in every language KIDDO speaks.
 *
 * ## Why the content has a dictionary and the interface has a catalogue
 *
 * `lib/i18n/messages` is hand-written copy: a few hundred sentences a person
 * wrote on purpose, where a missing line is a *compile* error because there is
 * a fixed, knowable list of them. Content is the opposite shape. KIDDO deals
 * its questions rather than storing them — one addition activity is nineteen
 * hundred sums — so the sentences a child hears do not exist until the moment
 * they are dealt, and there is no list of them to be exhaustive over.
 *
 * What *is* finite is the vocabulary. Every one of those sentences is built
 * from a few hundred nouns, nine shapes, six colours, three sizes and nine
 * spatial relations, and that list is small enough to write out and short
 * enough to read. So the content layer translates the way a person does:
 * a dictionary of words, a phrasebook of sentences, and patterns for the
 * sentences that have a hole in them. `tests/contentI18n.test.ts` deals every
 * activity at every level and fails on the first word this file does not know,
 * which is the same guarantee the catalogue gets from its types, arrived at
 * from the other end.
 *
 * ## What is deliberately *not* in here
 *
 * The words a child is being taught to read. `TextItem.text` — CAT, BALLS,
 * BIG — is the object of the lesson in every activity that uses it: rhyming,
 * phonics, spelling, plurals, opposites. Translating CAT to KUCING would not
 * translate the question, it would delete it, and the answer would stop being
 * the answer. English is a *subject* in a Malaysian classroom, and KIDDO
 * treats it as one: in Bahasa Melayu the instructions, the praise and the
 * explanations are Malay and the word under the microscope stays English,
 * exactly as it is in a Malaysian workbook. See `localizeChallenge`.
 */

/**
 * English word to Malay word.
 *
 * Written in Malaysian Bahasa Melayu as a parent would say it to a four year
 * old — *kucing*, not *felis*; *kereta api*, not *keretapi listrik*. Where
 * Malaysian usage has taken the English word (aiskrim, brokoli, robot) that is
 * the entry, because that is the word a child in Kuala Lumpur actually hears.
 *
 * Keys are the exact English `labelOf` produces. Lookup is case-insensitive
 * and article-stripping (`word` below), so one entry serves "a cow", "cow"
 * and "COW".
 */
const MS: Record<string, string> = {
  /* ---- shapes ---------------------------------------------------------- */
  circle: "bulatan",
  square: "segi empat sama",
  triangle: "segi tiga",
  rectangle: "segi empat tepat",
  oval: "bujur",
  diamond: "wajik",
  heart: "hati",
  hexagon: "heksagon",
  star: "bintang",

  /* ---- colours. `orange` is one entry on purpose: the fruit and the colour
         are both *oren* in Malaysian Malay, so the collision the English has
         does not survive the crossing. --------------------------------- */
  red: "merah",
  blue: "biru",
  green: "hijau",
  yellow: "kuning",
  pink: "merah jambu",
  orange: "oren",

  /* ---- sizes, as `labelOf` says them ---------------------------------- */
  small: "kecil",
  "middle-sized": "sederhana",
  big: "besar",
  large: "besar",

  /* ---- where a thing is. Each is the whole phrase, trailing article and
         all, because that is what `RELATION_WORDS` holds and because Malay
         does not join them the way English does. ---------------------- */
  "above the": "di atas",
  "below the": "di bawah",
  "to the left of the": "di sebelah kiri",
  "to the right of the": "di sebelah kanan",
  "beside the": "di sebelah",
  "inside the": "di dalam",
  "outside the": "di luar",
  "next to the": "bersebelahan dengan",
  "far away from the": "jauh daripada",

  /* ---- animals -------------------------------------------------------- */
  ant: "semut",
  bat: "kelawar",
  bear: "beruang",
  bee: "lebah",
  bird: "burung",
  butterfly: "rama-rama",
  calf: "anak lembu",
  camel: "unta",
  cat: "kucing",
  caterpillar: "ulat beluncas",
  chick: "anak ayam",
  chicken: "ayam",
  cow: "lembu",
  crab: "ketam",
  cub: "anak singa",
  deer: "rusa",
  dog: "anjing",
  dolphin: "ikan lumba-lumba",
  duck: "itik",
  duckling: "anak itik",
  eagle: "helang",
  elephant: "gajah",
  fawn: "anak rusa",
  fish: "ikan",
  foal: "anak kuda",
  fox: "musang",
  frog: "katak",
  giraffe: "zirafah",
  goat: "kambing",
  hedgehog: "landak",
  hen: "ayam betina",
  horse: "kuda",
  joey: "anak kanggaru",
  kangaroo: "kanggaru",
  kitten: "anak kucing",
  koala: "koala",
  ladybird: "kepik",
  lamb: "anak biri-biri",
  lion: "singa",
  monkey: "monyet",
  mouse: "tikus",
  octopus: "sotong kurita",
  owl: "burung hantu",
  panda: "panda",
  parrot: "burung kakak tua",
  penguin: "penguin",
  puppy: "anak anjing",
  rabbit: "arnab",
  seal: "anjing laut",
  shark: "yu",
  sheep: "biri-biri",
  snail: "siput",
  snake: "ular",
  squirrel: "tupai",
  tadpole: "berudu",
  tiger: "harimau",
  turtle: "penyu",
  whale: "ikan paus",
  wolf: "serigala",
  worm: "cacing",
  zebra: "zebra",

  /* ---- the noises they make. Written the way a Malaysian picture book
         writes them, which is not always the way an English one does. -- */
  baa: "mbek",
  buzz: "bzzz",
  chew: "mengunyah",
  cluck: "kok kok",
  hiss: "desis",
  hoot: "hu hu",
  howl: "lolongan",
  meow: "miau",
  moo: "mooo",
  neigh: "ringkik",
  quack: "kuek kuek",
  ribbit: "kroak",
  roar: "aum",
  squeak: "ciap",
  tweet: "ciap ciap",
  woof: "gong gong",

  /* ---- food ----------------------------------------------------------- */
  apple: "epal",
  banana: "pisang",
  bread: "roti",
  broccoli: "brokoli",
  cake: "kek",
  carrot: "lobak merah",
  cheese: "keju",
  chocolate: "coklat",
  corn: "jagung",
  cucumber: "timun",
  egg: "telur",
  grapes: "anggur",
  honey: "madu",
  jam: "jem",
  juice: "jus",
  lemon: "lemon",
  melon: "melon",
  milk: "susu",
  nut: "kacang",
  onion: "bawang",
  pear: "pear",
  potato: "kentang",
  rice: "nasi",
  strawberry: "strawberi",
  sweets: "gula-gula",
  tea: "teh",
  tomato: "tomato",
  vegetables: "sayur",
  water: "air",
  watermelon: "tembikai",
  wheat: "gandum",
  "ice cream": "aiskrim",
  "birthday cake": "kek hari jadi",
  "bowl of soup": "semangkuk sup",
  "cup of tea": "secawan teh",
  "glass of water": "segelas air",
  "slice of pizza": "sekeping piza",
  waffle: "wafel",

  /* ---- plants and the outdoors ---------------------------------------- */
  acorn: "biji oak",
  "apple blossom": "bunga epal",
  bamboo: "buluh",
  beach: "pantai",
  cactus: "kaktus",
  cloud: "awan",
  desert: "padang pasir",
  fire: "api",
  flower: "bunga",
  fog: "kabus",
  forest: "hutan",
  grass: "rumput",
  hay: "jerami",
  island: "pulau",
  jungle: "hutan rimba",
  leaf: "daun",
  leaves: "daun",
  "leafy plant": "pokok berdaun",
  "little green shoot": "pucuk hijau kecil",
  moon: "bulan",
  mountain: "gunung",
  mushroom: "cendawan",
  pond: "kolam",
  rain: "hujan",
  rainbow: "pelangi",
  rock: "batu",
  sea: "laut",
  seed: "biji benih",
  snow: "salji",
  snowflake: "kepingan salji",
  snowman: "orang salji",
  sun: "matahari",
  sunflower: "bunga matahari",
  sunshine: "cahaya matahari",
  thunderstorm: "ribut petir",
  tree: "pokok",
  volcano: "gunung berapi",
  wind: "angin",
  "big oak tree": "pokok oak besar",
  "little green apple": "epal hijau kecil",
  "ripe red apple": "epal merah masak",
  "plant in a pot": "pokok dalam pasu",
  "ice cube": "ketulan ais",
  "planet Earth": "planet Bumi",
  "planet with rings": "planet bergelang",
  satellite: "satelit",
  rocket: "roket",

  /* ---- where animals live --------------------------------------------- */
  burrow: "lubang",
  nest: "sarang",
  web: "sarang labah-labah",
  farm: "ladang",
  house: "rumah",
  "your home": "rumah kamu",

  /* ---- the body ------------------------------------------------------- */
  arm: "lengan",
  brain: "otak",
  ear: "telinga",
  eye: "mata",
  foot: "kaki",
  hand: "tangan",
  leg: "kaki",
  mouth: "mulut",
  nose: "hidung",
  tongue: "lidah",
  tooth: "gigi",

  /* ---- the senses and what a body does. Root forms, because these turn up
         inside an instruction far more often than inside a statement —
         "yang kamu lihat", "fikir tentang" — and a sentence that wants the
         fuller *melihat* can write it out and leave the hole alone. ------ */
  hear: "dengar",
  hold: "pegang",
  see: "lihat",
  smell: "bau",
  taste: "rasa",
  think: "fikir",
  walk: "jalan",
  wave: "lambai",

  /* ---- people --------------------------------------------------------- */
  artist: "pelukis",
  astronaut: "angkasawan",
  baby: "bayi",
  builder: "tukang bina",
  chef: "tukang masak",
  child: "kanak-kanak",
  doctor: "doktor",
  farmer: "petani",
  firefighter: "ahli bomba",
  "grown-up": "orang dewasa",
  mechanic: "mekanik",
  "older person": "orang tua",
  pilot: "juruterbang",
  "police officer": "pegawai polis",
  teacher: "cikgu",

  /* ---- things around the house ---------------------------------------- */
  bag: "beg",
  ball: "bola",
  balloon: "belon",
  bath: "mandi",
  bed: "katil",
  "baby bottle": "botol susu",
  biscuit: "biskut",
  boat: "bot",
  bone: "tulang",
  book: "buku",
  boots: "but",
  bowl: "mangkuk",
  box: "kotak",
  broom: "penyapu",
  bucket: "baldi",
  candle: "lilin",
  cap: "topi",
  chair: "kerusi",
  clock: "jam",
  coat: "kot",
  crayon: "krayon",
  cup: "cawan",
  door: "pintu",
  dress: "gaun",
  drum: "gendang",
  flag: "bendera",
  football: "bola sepak",
  "frying pan": "kuali",
  glasses: "cermin mata",
  gloves: "sarung tangan",
  "goal net": "jaring gol",
  hammer: "tukul",
  hat: "topi",
  helmet: "topi keledar",
  key: "kunci",
  kite: "wau",
  knife: "pisau",
  /* Two senses, told apart by the article English happens to put in front of
     one of them: the alphabet's *huruf* is what nearly every activity means,
     and the envelope is *surat*. See `word` below for why that works. */
  letter: "huruf",
  "a letter": "surat",
  light: "lampu",
  lock: "mangga",
  map: "peta",
  medicine: "ubat",
  mirror: "cermin",
  net: "jaring",
  paintbrush: "berus cat",
  pan: "kuali",
  pen: "pen",
  pencil: "pensel",
  "piece of paper": "sekeping kertas",
  "plug socket": "soket plag",
  postbox: "peti surat",
  pot: "pasu",
  robot: "robot",
  scarf: "selendang",
  scissors: "gunting",
  shirt: "baju",
  shoe: "kasut",
  shoes: "kasut",
  soap: "sabun",
  sock: "stoking",
  socks: "stoking",
  spanner: "sepana",
  spoon: "sudu",
  stethoscope: "stetoskop",
  "sun hat": "topi matahari",
  sunglasses: "cermin mata hitam",
  swimsuit: "baju renang",
  teddy: "patung beruang",
  television: "televisyen",
  tent: "khemah",
  toothbrush: "berus gigi",
  trousers: "seluar",
  umbrella: "payung",
  "warm coat": "kot panas",
  window: "tingkap",
  "fire extinguisher": "alat pemadam api",

  /* ---- getting about --------------------------------------------------- */
  aeroplane: "kapal terbang",
  ambulance: "ambulans",
  bicycle: "basikal",
  bus: "bas",
  car: "kereta",
  "fire engine": "jentera bomba",
  helicopter: "helikopter",
  jet: "jet",
  lorry: "lori",
  motorbike: "motosikal",
  "police car": "kereta polis",
  "sailing boat": "perahu layar",
  scooter: "skuter",
  "big ship": "kapal besar",
  tractor: "traktor",
  train: "kereta api",
  van: "van",

  /* ---- places ---------------------------------------------------------- */
  airport: "lapangan terbang",
  castle: "istana",
  hospital: "hospital",
  library: "perpustakaan",
  playground: "taman permainan",
  "post office": "pejabat pos",
  restaurant: "restoran",
  school: "sekolah",
  shop: "kedai",
  "train station": "stesen kereta api",

  /* ---- signs ----------------------------------------------------------- */
  "children crossing sign": "tanda lintasan kanak-kanak",
  "no entry sign": "tanda dilarang masuk",
  "recycling sign": "tanda kitar semula",
  "stop sign": "tanda berhenti",
  "warning sign": "tanda amaran",

  /* ---- the shape of a day, and of a year ------------------------------- */
  morning: "waktu pagi",
  "middle of the day": "tengah hari",
  evening: "waktu petang",
  "night-time": "waktu malam",
  bedtime: "waktu tidur",
  breakfast: "sarapan",
  lunch: "makan tengah hari",
  dinner: "makan malam",
  spring: "musim bunga",
  summer: "musim panas",
  autumn: "musim luruh",
  winter: "musim sejuk",
  "the sun comes up": "matahari terbit",
  "sun comes up": "matahari terbit",
  "the sun goes down": "matahari terbenam",
  "sun goes down": "matahari terbenam",
  "the sun is high up": "matahari tinggi di langit",
  "sun is high up": "matahari tinggi di langit",
  "the stars come out": "bintang muncul",
  "stars come out": "bintang muncul",
  "it goes dark": "hari menjadi gelap",
  "the alarm clock rings": "jam loceng berbunyi",
  "alarm clock rings": "jam loceng berbunyi",
  "going to school": "pergi ke sekolah",
  "coming home again": "balik ke rumah",
  "running about outside": "berlari di luar",
  "washing your hands": "mencuci tangan",
  "brushing your teeth": "memberus gigi",
  "a good night's sleep": "tidur yang lena",
  "good night's sleep": "tidur yang lena",
  "chick hatching out": "anak ayam menetas",
  "fluffy chick": "anak ayam berbulu lembut",
};

/** Every dictionary, by locale. English is itself, so it holds nothing. */
const DICTIONARIES: Record<Locale, Record<string, string>> = { en: {}, ms: MS };

/** The articles Malay does not have, stripped before a lookup. */
const ARTICLE = /^(?:an?|the)\s+/i;

/**
 * One English word or phrase, said in `locale`.
 *
 * Four tries, narrowing: as written, lower-cased, without its article, and
 * lower-cased without its article. The article comes off *last* on purpose,
 * which is how the two senses English packs into one word can still be told
 * apart: `letter` is *huruf* and `a letter` is *surat*, and the entry that
 * still has its article is found before the entry that has lost it. A word
 * the dictionary does not know comes back exactly as it went in — an English
 * word in a Malay sentence is wrong, but a *missing* word is worse, and the
 * coverage test is what stops either from shipping.
 *
 * Capitalisation is carried across rather than looked up: BLUE is a swatch's
 * name shouted the way the brand shouts it, and it should come back BIRU.
 */
export function word(locale: Locale, english: string): string {
  const dictionary = DICTIONARIES[locale];
  const trimmed = english.trim();
  if (trimmed.length === 0) return english;

  const said =
    dictionary[trimmed] ??
    dictionary[trimmed.toLowerCase()] ??
    dictionary[trimmed.replace(ARTICLE, "")] ??
    dictionary[trimmed.toLowerCase().replace(ARTICLE, "")];

  if (said === undefined) return english;
  return isShouted(trimmed) ? said.toUpperCase() : said;
}

/**
 * The few nouns that are followed by a *name* rather than by a describing word.
 *
 * Malay puts the noun first and the words that describe it after — *bulatan
 * biru besar* for *big blue circle* — which is why `phrase` says a phrase
 * back to front. A name is not a description and does not move: *letter C* is
 * *huruf C*, never *C huruf*, the same way *Jalan Ampang* keeps its order.
 * Two words need this today; both are categories a child is shown one member
 * of at a time.
 */
export const HEAD_NOUNS: ReadonlySet<string> = new Set(["letter", "number"]);

/**
 * The words the dictionary holds as *actions* rather than as things.
 *
 * They are in the dictionary because an instruction is often built around one
 * — *Think about what BIG means*, *count a group to see if it matches* — and a
 * root form is what those want. They are listed here because a verb is not a
 * noun phrase and must never be swallowed into one: without this, *A bucket
 * holds the water* reads as the phrase *bucket holds* and comes out as
 * nonsense. A sentence book entry says the verb itself, which is the only way
 * to get it right anyway, since Malay conjugates nothing like English does.
 */
export const ACTION_WORDS: ReadonlySet<string> = new Set([
  "hear",
  "hold",
  "see",
  "smell",
  "taste",
  "think",
  "walk",
  "wave",
]);

/**
 * Words that are actions *in this form only*, because the root is a thing.
 *
 * `light` is in the dictionary as *lampu*, the one you switch on when the room
 * goes dark, and that is right. But `The sun lights up the sky` is something
 * the sun *does*, and letting a phrase reach it gives *lampu matahari* — the
 * sun's lamp. English lets a noun be a verb unchanged; Malay does not, so the
 * ending is the only thing left to read, and the sentence book says these
 * outright rather than assembling them.
 */
export const ACTION_FORMS: ReadonlySet<string> = new Set(["lights"]);

/** `hold` and `holds`, `see` and `sees` — the only ending that turns up. */
export function isAction(english: string): boolean {
  const lower = english.toLowerCase();
  if (ACTION_FORMS.has(lower)) return true;
  return ACTION_WORDS.has(lower) || (lower.endsWith("s") && ACTION_WORDS.has(lower.slice(0, -1)));
}

/** Does the dictionary know this at all? The coverage test's only question. */
export function knows(locale: Locale, english: string): boolean {
  return locale === "en" || word(locale, english) !== english || english.trim() === "";
}

/** ALL CAPS, and more than one letter — so "A" and "I" are left alone. */
function isShouted(text: string): boolean {
  return /[A-Z]{2,}/.test(text) && text === text.toUpperCase();
}
