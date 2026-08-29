import type { MessageKey } from "./en";

/**
 * Everything KIDDO says in Bahasa Melayu.
 *
 * Malaysian Malay, not Indonesian, and not the Malay of a textbook. The two
 * registers on this page are deliberately different: the marketing copy is
 * warm and spoken — the way a Malaysian parent would explain KIDDO to
 * another parent — while anything a child is graded on stays proper. Where
 * English leans on a turn of phrase that has no Malay equivalent, the line
 * is rewritten to say the same thing rather than translated word for word;
 * "Screen time is going to happen" is an argument, not a sentence, and it
 * had to be re-made as one.
 *
 * A few standing choices, so a second translator does not have to guess:
 *
 *  - **anda** for the parent, **anak anda** for their child. Never *kamu*
 *    to a grown-up, and never *bapa* alone — *ibu bapa* covers the house.
 *  - **muka surat** for a page of a book, **halaman** for a page of the
 *    product. English uses "page" for both and Malay does not.
 *  - **langganan / pelan / bayaran** for the billing words, because those
 *    are what a Malaysian bank statement and a Malaysian shop already say.
 *  - Loan words that Malaysians actually use — *tablet*, *video*, *iklan* —
 *    are left alone. Inventing a native word nobody says would be more
 *    foreign than the loan.
 *
 * `Record<MessageKey, string>` is doing real work here: this file cannot be
 * short by a line, and it cannot keep a line English has dropped.
 */
export const ms: Record<MessageKey, string> = {
  /* ---- The language switcher itself ---------------------------------- */
  "lang.label": "Bahasa",
  "lang.choose": "Pilih bahasa",
  "lang.current": "Bahasa: {name}",
  "lang.selected": "Dipilih",

  /* ---- Words used on more than one screen ---------------------------- */
  "common.back": "Kembali",
  "common.close": "Tutup",
  "common.cancel": "Batal",
  "common.continue": "Teruskan",
  "common.loading": "Sedang memuatkan…",
  "common.tryAgain": "Cuba lagi",
  "common.signOut": "Log keluar",
  "common.oneMoment": "Sekejap ya…",
  "common.enterKiddo": "Masuk KIDDO",
  "common.and": "dan",
  "common.somethingWentWrong": "Ada sesuatu yang tidak kena. Sila cuba lagi.",

  /* ---- Landing: header and footer ------------------------------------ */
  "landing.nav.aria": "Laman",
  "landing.nav.home": "Laman utama KIDDO",
  "landing.nav.howItWorks": "Cara ia berfungsi",
  "landing.nav.pricing": "Harga",
  "landing.nav.parents": "Untuk ibu bapa",
  "landing.nav.privacy": "Privasi",
  "landing.nav.signIn": "Log masuk",
  "landing.footer.aria": "Kaki laman",
  "landing.footer.blurb":
    "Tempat bermain yang kecil dan selamat untuk anak berumur 4 hingga 8 tahun, supaya screen time jadi masa untuk bermain, belajar dan meneroka. Satu akaun ibu bapa, tiada iklan, tiada apa-apa dijual kepada anak anda.",

  /* ---- Landing: metadata --------------------------------------------- */
  "landing.meta.title": "KIDDO — Screen time tak semestinya buang masa",
  "landing.meta.description":
    "KIDDO menjadikan screen time lebih bermakna untuk anak berumur 4 hingga 8 tahun: taman untuk mengira, haiwan untuk dibawa pulang, dan buku cerita penuh perkataan. Satu langganan untuk ibu bapa; tiada iklan, tiada apa-apa untuk dibeli di dalam.",
  "landing.meta.ogDescription":
    "Anak masih boleh seronok dengan screen time — sambil belajar, mencuba aktiviti dan meneroka sesuatu yang baru.",
  "landing.meta.twitterDescription":
    "Screen time yang lebih bermakna, untuk anak berumur 4 hingga 8 tahun.",

  /* ---- Landing: hero -------------------------------------------------- */
  "landing.hero.eyebrow": "Untuk anak 4 hingga 8 tahun",
  "landing.hero.title": "Screen Time Tak Semestinya Buang Masa.",
  "landing.hero.body":
    "Dengan KIDDO, anak masih boleh seronok dengan screen time — sambil belajar, mencuba aktiviti dan meneroka sesuatu yang baru.",
  "landing.hero.cta": "Cuba KIDDO",
  "landing.hero.secondary": "Lihat Cara KIDDO Berfungsi",
  "landing.hero.trustAria": "Apa yang anda dapat",
  "landing.hero.trust.1": "Tiada iklan",
  "landing.hero.trust.2": "Tiada apa-apa dijual kepada anak",
  "landing.hero.trust.3": "Dari {monthly} sebulan, batal bila-bila masa",

  /* ---- Landing: the pain points --------------------------------------- */
  "landing.pain.eyebrow": "Mungkin ini rumah anda juga",
  "landing.pain.title": "Kalau Anak Dah Terlalu Biasa Dengan Screen…",
  "landing.pain.body":
    "Kadang-kadang kita bagi screen sebab nak anak duduk diam sekejap. Tapi bila dah sampai masa nak berhenti, semuanya jadi lebih susah.",
  "landing.pain.phone.title": "Anak Asyik Minta Phone",
  "landing.pain.phone.body":
    "Baru sekejap tak pegang phone, dah mula tanya bila boleh guna lagi.",
  "landing.pain.phone.alt":
    "Seorang anak kecil menghulur tangan meminta telefon daripada orang dewasa di ruang tamu.",
  "landing.pain.videos.title": "Asyik Tengok YouTube",
  "landing.pain.videos.body":
    "Satu video jadi dua, dua jadi sepuluh. Tiba-tiba dah lama masa berlalu.",
  "landing.pain.videos.alt":
    "Seorang anak duduk rapat dengan tablet, menonton video kartun satu demi satu.",
  "landing.pain.torn.title": "Parent Pun Rasa Serba Salah",
  "landing.pain.torn.body":
    "Nak bagi anak guna teknologi, tapi dalam masa yang sama risau apa yang mereka tengok dan buat.",
  "landing.pain.torn.alt":
    "Seorang ibu memerhati anaknya yang sedang menggunakan telefon, dengan wajah teragak-agak.",
  "landing.pain.stop.title": "Susah Nak Berhenti",
  "landing.pain.stop.body":
    "Bila tiba masa tutup screen, mula meragam, menangis atau minta “5 minit lagi”.",
  "landing.pain.stop.alt":
    "Seorang anak enggan melepaskan tablet apabila tiba masa untuk berhenti.",

  /* ---- Landing: the shift ---------------------------------------------- */
  "landing.shift.eyebrow": "Ada cara lain",
  "landing.shift.title":
    "Masalahnya Bukan Screen Time. Tapi Apa Yang Anak Buat Dengan Screen Time.",
  "landing.shift.body":
    "Teknologi sendiri bukan musuh. Yang penting ialah bagaimana kita gunakan screen time itu.",
  "landing.shift.listAria": "Daripada apa, kepada apa",
  "landing.shift.fromLabel": "Daripada",
  "landing.shift.toLabel": "Kepada",
  "landing.shift.from.1": "Satu video tarik satu video lagi",
  "landing.shift.to.1": "Satu pusingan pendek yang ada penghujungnya",
  "landing.shift.from.2": "Scroll tanpa tahu bila nak berhenti",
  "landing.shift.to.2": "Siapkan satu aktiviti, kemudian berhenti",
  "landing.shift.from.3": "Susah nak tahu apa sebenarnya anak buat",
  "landing.shift.to.3": "Ibu bapa nampak apa yang anak teroka",
  "landing.shift.transition":
    "Daripada sekadar tengok dan scroll, jadikan screen time masa untuk anak bermain, belajar dan meneroka.",

  /* ---- Landing: meet KIDDO, and the three worlds ----------------------- */
  "landing.meet.eyebrow": "Bukan satu lagi aplikasi video",
  "landing.meet.title": "Kenalkan KIDDO",
  "landing.meet.body":
    "KIDDO menjadikan screen time lebih bermakna melalui adventure, aktiviti dan pembelajaran yang direka untuk anak.",
  "landing.meet.child": "Anak rasa macam bermain.",
  "landing.meet.parent": "Parent tahu mereka sedang belajar.",
  "landing.meet.worldsLead":
    "Tiga dunia kecil, setiap satu dengan tempat dan kawannya sendiri.",
  "landing.worlds.number.counting": "Dunia satu",
  "landing.worlds.number.animals": "Dunia dua",
  "landing.worlds.number.words": "Dunia tiga",
  "landing.worlds.with": "bersama {name}",
  "landing.worlds.activitiesIn": "Aktiviti di {world}",
  "landing.worlds.inside.counting":
    "Anak mengenal nombor melalui epal, bunga dan batu kecil di dalam sebuah taman.",
  "landing.worlds.inside.animals":
    "Anak berjumpa haiwan, belajar di mana setiap satu tinggal, dan menghantar mereka pulang.",
  "landing.worlds.inside.words":
    "Anak membuka buku cerita dan menjumpai huruf, rima dan bunyi di atas halamannya.",
  "landing.worlds.shot.counting":
    "Kira Epal: KIDDO bertanya berapa banyak yang boleh dikira, di atas taman dengan papan nombor berdiri di rumput.",
  "landing.worlds.shot.animals":
    "Cari Rumah: haiwan di sebelah sini, rumah mereka di sebelah sana, menunggu untuk disambungkan.",
  "landing.worlds.shot.words":
    "Kawan Berima: dua halaman buku cerita terbuka dengan perkataan di kiri dan kanan untuk dipadankan.",

  /* ---- Landing: the rest of the library -------------------------------- */
  "landing.more.eyebrow": "Bukan satu permainan sahaja",
  "landing.more.title": "Banyak Lagi Untuk Diterokai",
  "landing.more.body":
    "Selain tiga dunia itu, ada {count} permainan lagi menunggu di laman utama anak — setiap satu dengan kawan, gambar dan aktivitinya sendiri.",
  "landing.more.listAria": "Permainan lain di dalam KIDDO",

  /* ---- Landing: how it works ------------------------------------------ */
  "landing.how.eyebrow": "Cara ia berfungsi",
  "landing.how.title": "Empat langkah, itu sahaja.",
  "landing.how.body":
    "Anak boleh mula sendiri. Tiada tutorial panjang, dan tiada apa-apa untuk anak log masuk.",
  "landing.how.step1.title": "Anak pilih adventure",
  "landing.how.step1.detail":
    "Buka laman utama dan pilih dunia yang dia nak masuk hari ini.",
  "landing.how.step2.title": "Anak explore dan siapkan aktiviti",
  "landing.how.step2.detail":
    "Setiap aktiviti ialah satu pusingan pendek lima soalan, di dalam dunia itu sendiri.",
  "landing.how.step3.title": "Anak belajar sambil bermain",
  "landing.how.step3.detail":
    "Mengira, memadan dan mengenal perkataan — dan setiap aktiviti yang siap tinggal di dalam dunianya.",
  "landing.how.step4.title": "Parent nampak perkembangan",
  "landing.how.step4.detail":
    "Ruang ibu bapa menyenaraikan apa yang diteroka, apa yang seterusnya dan apa yang dilatih.",
  "landing.how.doorsAria": "Contoh pintu dunia selepas beberapa kali bermain",
  "landing.how.doorsCaption":
    "Contoh selepas beberapa kali bermain: satu dunia sudah habis, satu separuh jalan, satu lagi masih baharu. Pintu berbulatan ialah yang KIDDO cadangkan seterusnya.",

  /* ---- Landing: why parents choose KIDDO ------------------------------- */
  "landing.why.eyebrow": "Kenapa ibu bapa pilih KIDDO",
  "landing.why.title": "Lebih Tenang Untuk Parent. Lebih Bermakna Untuk Anak.",
  "landing.why.body":
    "Screen time tetap ada. Yang berubah ialah apa yang berlaku di dalamnya.",
  "landing.why.1.title": "Tak perlu lawan screen time setiap hari.",
  "landing.why.1.detail":
    "Setiap pusingan ada penghujungnya, jadi lebih senang nak cakap “satu lagi, lepas tu kita stop”.",
  "landing.why.2.title": "Anak masih dapat pengalaman yang menyeronokkan.",
  "landing.why.2.detail": "Dunia, kawan dan aktiviti yang dia sendiri nak buka.",
  "landing.why.3.title": "Screen time boleh jadi masa untuk belajar dan explore.",
  "landing.why.3.detail":
    "Nombor, haiwan dan perkataan — dibuat sambil bermain, bukan sambil menghafal.",
  "landing.why.4.title": "Parent lebih yakin dengan apa yang anak lakukan.",
  "landing.why.4.detail":
    "Tiada iklan, tiada video yang main sendiri, dan tiada apa-apa untuk dibeli di dalam.",
  "landing.why.cta": "Lihat ruang ibu bapa",
  "landing.why.privacyLink": "Apa yang KIDDO simpan, dan apa yang tidak",
  "landing.why.shotAlt":
    "Papan pemuka ibu bapa KIDDO: satu sapaan, perjalanan anak dalam tiga nombor, dan satu kad kemajuan untuk setiap dunia.",
  "landing.why.shotCaption": "Ruang ibu bapa, separuh jalan dalam satu perjalanan.",

  /* ---- Landing: what parents say --------------------------------------- */
  "landing.voices.eyebrow": "Kata ibu bapa",
  "landing.voices.title": "Cerita daripada ibu bapa yang dah cuba.",
  "landing.voices.body": "Dalam bahasa mereka sendiri, tanpa diubah.",
  "landing.voices.aria": "Testimoni ibu bapa",
  "landing.voices.swipe": "Leret untuk baca lagi",

  /* ---- Landing: pricing ------------------------------------------------ */
  "landing.pricing.eyebrow": "Harga",
  "landing.pricing.title": "Jadikan Screen Time Lebih Bermakna.",
  "landing.pricing.body":
    "Satu langganan untuk anda, orang dewasa. Anak tidak pernah log masuk, tidak pernah nampak harga, dan tidak pernah diminta membeli apa-apa.",
  "landing.pricing.included.1": "Setiap dunia, setiap pintu dan setiap permainan",
  "landing.pricing.included.2":
    "Perjalanan seorang anak, disimpan dan dibawa antara peranti",
  "landing.pricing.included.3":
    "Ruang ibu bapa, dengan apa yang diteroka dan apa yang seterusnya",
  "landing.pricing.included.4": "Tiada iklan dan tiada apa-apa untuk dibeli di dalam",
  "landing.pricing.saving": "Jimat {saving}% berbanding bayar bulanan",
  "landing.pricing.footnote":
    "Batal bila-bila masa dari ruang ibu bapa. Pembayaran dikendalikan oleh Stripe — KIDDO tidak pernah melihat atau menyimpan kad anda.",

  /* ---- Landing: questions parents ask ---------------------------------- */
  "landing.faq.eyebrow": "Soalan lazim",
  "landing.faq.title": "Soalan yang ibu bapa selalu tanya.",
  "landing.faq.q1": "Adakah KIDDO sesuai untuk umur anak saya?",
  "landing.faq.a1":
    "KIDDO direka untuk anak berumur 4 hingga 8 tahun. Setiap aktiviti ada tiga tahap — Mudah, Sederhana dan Sukar — jadi anak yang baru mula dan anak yang sudah biasa boleh bermain aktiviti yang sama.",
  "landing.faq.q2": "Adakah KIDDO menggantikan sekolah atau pembelajaran formal?",
  "landing.faq.a2":
    "Tidak. KIDDO bukan sekolah dan bukan sukatan pelajaran. Ia sebuah tempat bermain di mana anak mengira, memadan dan mengenal perkataan sambil meneroka — sesuatu untuk dibuat pada waktu screen time, bukan pengganti kelas.",
  "landing.faq.q3": "Adakah anak perlu menggunakan tablet?",
  "landing.faq.a3":
    "Tidak. KIDDO dibuka terus di dalam pelayar web — telefon, tablet atau komputer riba — tanpa perlu memuat turun apa-apa aplikasi. Skrin yang lebih besar lebih selesa, tetapi telefon pun boleh.",
  "landing.faq.q4": "Bagaimana KIDDO membantu menjadikan screen time lebih positif?",
  "landing.faq.a4":
    "Setiap aktiviti ialah satu pusingan pendek lima soalan yang ada penghujungnya, jadi sentiasa ada masa yang sesuai untuk berhenti. Tiada iklan, tiada video yang main sendiri dan tiada apa-apa untuk dibeli. Apa yang anak siapkan tinggal di dalam dunianya, dan anda boleh lihat apa yang diteroka di ruang ibu bapa.",
  "landing.faq.q5": "Berapa harga KIDDO?",
  "landing.faq.a5":
    "{monthly} sebulan atau {yearly} setahun, dan satu langganan membuka seluruh KIDDO. Boleh dibatalkan bila-bila masa dari ruang ibu bapa.",

  /* ---- Landing: closing ------------------------------------------------ */
  "landing.closing.title": "Tak perlu buang screen time. Jadikan ia lebih bermakna.",
  "landing.closing.body":
    "Biarkan anak explore, bermain dan belajar — dengan pengalaman yang lebih positif.",
  "landing.closing.cta": "Mulakan Dengan KIDDO",

  /* ---- The worlds, as places a child goes ---------------------------- */
  "world.meadow.name": "Padang",
  "world.counting.name": "Taman Mengira",
  "world.counting.line": "Kira apa yang tumbuh di dalam taman.",
  "world.counting.blurb":
    "Mengira benda, mengenal nombor dan mencari nombor yang diminta.",
  "world.animals.name": "Pengembaraan Haiwan",
  "world.animals.line": "Bantu haiwan mencari rumah mereka.",
  "world.animals.blurb":
    "Nama haiwan, bunyi dan anaknya, tempat tinggalnya dan makanannya.",
  "world.words.name": "Dunia Perkataan",
  "world.words.line": "Buka buku dan cari perkataan.",
  "world.words.blurb": "Huruf, rima, dan bunyi di awal dan di akhir perkataan.",

  /* ---- The nine doors ------------------------------------------------- */
  "door.counting.count-the-apples.title": "Kira Epal",
  "door.counting.count-the-apples.blurb":
    "Kira benda di dalam taman dan pilih berapa banyak.",
  "door.counting.count-the-apples.intro": "Jom kira di dalam taman!",
  "door.counting.count-the-apples.done": "Kamu kira setiap satu!",
  "door.counting.count-the-flowers.title": "Kira Bunga",
  "door.counting.count-the-flowers.blurb":
    "Kumpulan yang lebih besar untuk dikira, dan beberapa pilihan lagi.",
  "door.counting.count-the-flowers.intro": "Lagi banyak yang dah tumbuh! Jom kira.",
  "door.counting.count-the-flowers.done": "Banyaknya yang dikira. Hebat!",
  "door.counting.find-the-number.title": "Cari Nombor",
  "door.counting.find-the-number.blurb":
    "Kenal nombor mengikut namanya dan cari nombor yang KIDDO minta.",
  "door.counting.find-the-number.intro": "Boleh kamu cari nombor yang saya sebut?",
  "door.counting.find-the-number.done": "Kamu kenal nombor kamu!",
  "door.animals.find-the-home.title": "Cari Rumah",
  "door.animals.find-the-home.blurb":
    "Hubungkan setiap haiwan dengan tempat tinggalnya, dan lihat ia pulang.",
  "door.animals.find-the-home.intro": "Bantu setiap haiwan cari jalan pulang!",
  "door.animals.find-the-home.done": "Semua haiwan dah selamat sampai ke rumah!",
  "door.animals.who-lives-here.title": "Siapa Tinggal Di Sini?",
  "door.animals.who-lives-here.blurb":
    "Namakan haiwan, dengar bunyinya dan temui anaknya.",
  "door.animals.who-lives-here.intro": "Siapa di sana tu? Jom kita cari tahu!",
  "door.animals.who-lives-here.done": "Kamu kenal semua haiwan!",
  "door.animals.land-or-sea.title": "Darat atau Laut?",
  "door.animals.land-or-sea.blurb":
    "Tempat tinggal, makanan, serta darat dan air.",
  "door.animals.land-or-sea.intro":
    "Ada yang tinggal di darat, ada yang di dalam air. Yang mana satu?",
  "door.animals.land-or-sea.done": "Darat, laut dan langit — kamu jumpa semuanya!",
  "door.words.alphabet-adventure.title": "Pengembaraan Abjad",
  "door.words.alphabet-adventure.blurb":
    "Cari huruf yang KIDDO sebut, huruf besar dan huruf kecil.",
  "door.words.alphabet-adventure.intro": "Jom buka buku perkataan dan cari huruf!",
  "door.words.alphabet-adventure.done": "Kamu jumpa setiap huruf!",
  "door.words.rhyming-friends.title": "Kawan Berima",
  "door.words.rhyming-friends.blurb":
    "Hubungkan perkataan yang sama bunyinya di hujung.",
  "door.words.rhyming-friends.intro":
    "Cat, hat, bat! Jom cari perkataan yang berima.",
  "door.words.rhyming-friends.done": "Setiap perkataan dah jumpa kawan rimanya!",
  "door.words.word-discovery.title": "Temui Perkataan",
  "door.words.word-discovery.blurb":
    "Bunyi awal, bunyi akhir dan melengkapkan perkataan.",
  "door.words.word-discovery.intro": "Dengar bunyinya. Perkataan apa yang bersembunyi?",
  "door.words.word-discovery.done": "Banyaknya perkataan yang kamu temui!",

  /* ---- How hard a door is played at ----------------------------------- */
  "tier.1": "Mudah",
  "tier.2": "Sederhana",
  "tier.3": "Sukar",


  /* ---- The lessons a world draws from, for the parent dashboard --------
     Grown-up facing, and keyed on the activity id — see the English
     catalogue beside this one for why the questions carry no words. */
  "concept.math.counting": "Mengira",
  "concept.math.counting-objects": "Berapa Banyak Benda?",
  "concept.math.number-recognition": "Mengenal nombor",
  "concept.math.quantity-order": "Kumpulan terkecil dahulu",
  "concept.math.comparison": "Lebih besar atau lebih kecil",
  "concept.math.before-and-after": "Sebelum dan selepas",
  "concept.math.addition": "Menambah",
  "concept.math.subtraction": "Menolak",
  "concept.math.sum-partners": "Ayat matematik dan jawapannya",
  "concept.math.number-sequence": "Apa yang seterusnya",
  "concept.math.missing-number": "Nombor yang hilang",
  "concept.math.number-order": "Nombor Mengikut Urutan",
  "concept.math.pattern": "Apa yang seterusnya dalam corak",
  "concept.english.letter-recognition": "Mengenal huruf",
  "concept.english.letter-case": "Huruf besar dan huruf kecil",
  "concept.english.alphabet-order": "Urutan Abjad",
  "concept.english.beginning-sounds": "Bunyi awal",
  "concept.english.sound-partners": "Gambar dan huruf pertamanya",
  "concept.english.ending-sounds": "Bunyi akhir",
  "concept.english.rhyming-partners": "Perkataan Yang Berima",
  "concept.english.spelling": "Melengkapkan perkataan",
  "concept.english.word-build": "Membina perkataan",
  "concept.english.plurals": "Satu dan lebih daripada satu",
  "concept.english.opposites": "Perkataan berlawanan",
  "concept.logic.patterns": "Corak berulang",
  "concept.logic.odd-one-out": "Yang tidak sama",
  "concept.logic.sorting": "Mengumpul benda mengikut jenis",
  "concept.logic.group-partners": "Ia masuk kumpulan yang mana?",
  "concept.logic.sequences": "Apa yang seterusnya",
  "concept.logic.pair-partners": "Benda yang berpasangan",
  "concept.shapes.shape-names": "Bentuk yang mana?",
  "concept.shapes.colour-names": "Warna yang mana?",
  "concept.shapes.shape-objects": "Apakah bentuknya?",
  "concept.shapes.matching": "Cari yang sepadan",
  "concept.shapes.same-different": "Sama atau berbeza?",
  "concept.shapes.size": "Besar dan kecil",
  "concept.shapes.size-order": "Terkecil ke terbesar",
  "concept.shapes.counting": "Berapa banyak?",
  "concept.shapes.classify": "Bentuk dan warna",
  "concept.shapes.properties": "Diperbuat daripada apa?",
  "concept.shapes.shape-partners": "Benda dan bentuknya",
  "concept.shapes.position": "Di manakah ia?",
  "concept.shapes.symmetry": "Sama di kedua-dua belah",
  "concept.shapes.patterns": "Apa yang seterusnya?",
  "concept.general-knowledge.animal-names": "Haiwan Apakah Ini?",
  "concept.general-knowledge.animal-sounds": "Siapa Yang Membuat Bunyi Itu?",
  "concept.general-knowledge.baby-animals": "Anak Haiwan",
  "concept.general-knowledge.animal-babies": "Haiwan dan Anaknya",
  "concept.general-knowledge.animal-diet": "Apa Yang Haiwan Makan?",
  "concept.general-knowledge.animal-homes": "Di Mana Haiwan Tinggal?",
  "concept.general-knowledge.home-partners": "Haiwan dan Tempat Tinggalnya",
  "concept.general-knowledge.plants": "Tumbuh-tumbuhan",
  "concept.general-knowledge.living-things": "Hidup atau Bukan Hidup?",
  "concept.general-knowledge.natural-or-made": "Buatan Manusia atau Bukan?",
  "concept.general-knowledge.life-cycles": "Bagaimana Ia Membesar",
  "concept.general-knowledge.weather": "Bagaimana Cuacanya?",
  "concept.general-knowledge.seasons": "Empat Musim",
  "concept.general-knowledge.hot-or-cold": "Panas atau Sejuk?",
  "concept.general-knowledge.food-names": "Makanan Yang Kita Makan",
  "concept.general-knowledge.food-origins": "Dari Mana Datangnya Makanan",
  "concept.general-knowledge.object-names": "Benda di Sekeliling Rumah",
  "concept.general-knowledge.object-uses": "Apa Kegunaannya?",
  "concept.general-knowledge.clothing": "Berpakaian",
  "concept.general-knowledge.vehicle-names": "Benda Yang Bergerak",
  "concept.general-knowledge.vehicle-travel": "Bagaimana Ia Bergerak?",
  "concept.general-knowledge.community-helpers": "Orang Yang Membantu Kita",
  "concept.general-knowledge.helper-tools": "Alat Untuk Setiap Kerja",
  "concept.general-knowledge.helper-partners": "Siapa Guna Apa",
  "concept.general-knowledge.places": "Tempat Yang Kita Pergi",
  "concept.general-knowledge.body-parts": "Semua Tentang Badan Saya",
  "concept.general-knowledge.senses": "Lima Deria Saya",
  "concept.general-knowledge.body-partners": "Apa Kerja Setiap Bahagian Badan",
  "concept.general-knowledge.healthy-habits": "Menjaga Diri Sendiri",
  "concept.general-knowledge.space": "Di Angkasa Lepas",
  "concept.general-knowledge.day-and-night": "Siang dan Malam",
  "concept.general-knowledge.day-order": "Apa Yang Berlaku Dahulu",
  "concept.general-knowledge.land-and-water": "Darat dan Air",
  "concept.general-knowledge.safety": "Menjaga Keselamatan",
  "concept.match.letter-partners": "Huruf besar dan huruf kecil",
  "concept.match.quantity-partners": "Nombor dan bilangannya",
  "concept.match.opposite-partners": "Perkataan dan lawannya",
  "concept.match.sound-partners": "Haiwan dan bunyinya",
  "concept.discovery.colours": "Menamakan warna",
  "concept.discovery.animal-food": "Haiwan dan makanannya",
  "concept.discovery.animal-babies": "Haiwan dewasa dan anaknya",
  "concept.discovery.count-order": "Mengira seterusnya",

  /* ---- What each world gives back ------------------------------------- */
  "reward.meadow.one": "bunga",
  "reward.meadow.many": "bunga",
  "reward.meadow.earned": "Sekuntum bunga untuk padang!",
  "reward.counting.one": "bunga",
  "reward.counting.many": "bunga",
  "reward.counting.earned": "Sekuntum bunga baharu dah tumbuh di taman kamu!",
  "reward.animals.one": "haiwan",
  "reward.animals.many": "haiwan",
  "reward.animals.earned": "Seekor kawan haiwan baharu dah sertai pengembaraan kamu!",
  "reward.words.one": "muka surat",
  "reward.words.many": "muka surat",
  "reward.words.earned": "Satu muka surat baharu dah ditambah ke dalam buku cerita kamu!",

  /* ---- KIDDO & Friends. The names are never translated. --------------- */
  "character.kiddo.blurb": "Makhluk bulat bertelinga besar yang tiada spesiesnya.",
  "character.foxy.blurb": "Seekor musang yang bijak dan ingin tahu.",
  "character.bibi.blurb": "Seekor arnab yang ceria.",
  "character.pip.blurb": "Seekor katak kecil yang kelakar.",
  "character.wally.blurb": "Seekor ikan paus kecil yang mesra.",

  /* ---- The two plans -------------------------------------------------- */
  "plan.yearly.name": "Tahunan",
  "plan.yearly.per": "tahun",
  "plan.yearly.note": "Nilai terbaik",
  "plan.yearly.blurb": "{perMonth} sebulan, dibayar sekali setahun",
  "plan.yearly.cta": "Cuba KIDDO Sekarang",
  "plan.monthly.name": "Bulanan",
  "plan.monthly.per": "bulan",
  "plan.monthly.note": "",
  "plan.monthly.blurb": "Akses bulanan yang fleksibel",
  "plan.monthly.cta": "Pilih Pelan Bulanan",

  /* ---- What state the subscription is in, in one word ----------------- */
  "billing.status.active": "Aktif",
  "billing.status.renewing": "Memperbaharui",
  "billing.status.ending": "Akan tamat",
  "billing.status.past_due": "Bayaran gagal",
  "billing.status.incomplete": "Sedang disahkan",
  "billing.status.cancelled": "Dibatalkan",
  "billing.status.expired": "Sudah tamat",
  "billing.status.none": "Tiada langganan",

  /* ---- ...and in one sentence a parent can act on --------------------- */
  "billing.describe.renewing":
    "Langganan anda sedang diperbaharui. Jika ia mengambil masa lebih daripada sehari, sila semak butiran pembayaran anda.",
  "billing.describe.endingOn": "Dibatalkan. KIDDO kekal terbuka sehingga {when}.",
  "billing.describe.ending":
    "Dibatalkan. KIDDO kekal terbuka sehingga tamat tempoh yang telah dibayar.",
  "billing.describe.planRenews":
    "Pelan {plan}, {price} se{per}. Diperbaharui pada {when}.",
  "billing.describe.plan": "Pelan {plan}, {price} se{per}.",
  "billing.describe.activeRenews": "Aktif. Diperbaharui pada {when}.",
  "billing.describe.active": "Aktif.",
  "billing.describe.past_due":
    "Bayaran terakhir tidak berjaya, jadi KIDDO dijeda buat sementara. Kemas kini butiran pembayaran anda untuk menyambung semula.",
  "billing.describe.incomplete": "Bayaran anda masih dalam pengesahan.",
  "billing.describe.endedOn": "Langganan anda tamat pada {when}.",
  "billing.describe.ended": "Langganan anda telah tamat.",
  "billing.describe.none": "Belum ada langganan.",

  /* ---- Signing in, and making an account ------------------------------ */
  "auth.signin.title": "Log masuk ke KIDDO",
  "auth.signin.blurb": "Kemajuan dan nama anak anda disimpan bersama akaun anda.",
  "auth.signup.title": "Buka akaun KIDDO",
  "auth.signup.blurb":
    "Akaun ini untuk anda, orang dewasa. Anak anda tidak perlu log masuk langsung — mereka terus bermain, dan kemajuan mereka mengikut ke mana-mana peranti yang anda log masuk.",
  "auth.forgot.title": "Lupa kata laluan?",
  "auth.forgot.blurb":
    "Taip e-mel akaun KIDDO anda dan kami akan hantar pautan untuk pilih kata laluan baharu.",
  /* "Google" kekal seperti asalnya — nama jenama, bukan perkataan. */
  "auth.google.continue": "Teruskan dengan Google",
  "auth.google.leaving": "Membawa anda ke Google…",
  "auth.google.or": "atau",
  "auth.field.email": "E-mel anda",
  "auth.field.password": "Kata laluan",
  "auth.field.confirm": "Sahkan kata laluan",
  "auth.field.passwordHint": "Sekurang-kurangnya 6 aksara.",
  "auth.forgotLink": "Lupa kata laluan?",
  "auth.submit.busy": "Sekejap ya…",
  "auth.submit.forgot": "Hantar pautan set semula",
  "auth.submit.signup": "Buka akaun",
  "auth.submit.signin": "Log masuk",
  "auth.switch.rememberedIt": "Dah ingat semula?",
  "auth.switch.haveAccount": "Sudah ada akaun?",
  "auth.switch.newHere": "Baru dengan KIDDO?",
  "auth.switch.backToSignIn": "Kembali ke log masuk",
  "auth.switch.signInInstead": "Log masuk sahaja",
  "auth.switch.createAccount": "Buka akaun",
  "auth.sent.title": "Semak e-mel anda",
  "auth.sent.body":
    "Jika ada akaun KIDDO untuk {email}, pautan untuk memilih kata laluan baharu sedang dalam perjalanan. Pautan itu hanya boleh digunakan sekali dan akan luput selepas seketika.",

  /* ---- ...and what to say when it does not work ----------------------- */
  "auth.error.mismatch": "Dua kata laluan itu tidak sama.",
  "auth.error.sameEitherWay": "E-mel dan kata laluan itu tidak sepadan.",
  "auth.error.invalid-email": "Itu tidak nampak seperti alamat e-mel.",
  "auth.error.weak-password": "Sila pilih kata laluan sekurang-kurangnya 6 aksara.",
  "auth.error.email-in-use":
    "KIDDO tidak dapat membuka akaun dengan e-mel itu. Jika anda sudah ada akaun, log masuk — atau minta kata laluan baharu di bawah.",
  "auth.error.too-many-attempts": "Terlalu banyak percubaan buat masa ini. Sila tunggu sekejap dan cuba lagi.",
  "auth.error.offline": "KIDDO tidak dapat menghubungi internet sekarang. Semak sambungan dan cuba lagi.",
  "auth.error.bad-link": "Pautan itu sudah luput. Minta pautan baharu di bawah.",
  "auth.error.recent-login": "Sila log masuk semula dahulu.",
  "auth.error.billing-unavailable": "Langganan belum disediakan pada KIDDO ini.",
  "auth.error.popup-blocked":
    "Pelayar anda menghalang tetingkap Google daripada dibuka. Benarkan tetingkap timbul untuk KIDDO, atau guna e-mel dan kata laluan di bawah.",
  "auth.error.different-sign-in":
    "E-mel itu sudah log masuk dengan cara lain. Cuba e-mel dan kata laluan anda di bawah.",
  "auth.error.timed-out":
    "Itu mengambil masa terlalu lama, jadi KIDDO berhenti menunggu. Sila cuba lagi, atau guna e-mel dan kata laluan anda.",
  "auth.error.unknown": "Ada sesuatu yang tidak kena. Sila cuba lagi.",

  /* ---- /join: the road from choosing a plan to paying for it ---------- */
  "join.unavailable.title": "Langganan belum disediakan di sini",
  "join.unavailable.body":
    "Salinan KIDDO ini berjalan tanpa akaun, jadi tiada apa-apa untuk dibayar lagi. Semua permainan anak anda kekal pada peranti ini.",
  "join.unavailable.cta": "Buka KIDDO",
  "join.subscribed.title": "Anda sudah pun ada KIDDO",
  "join.subscribed.body":
    "Langganan anda aktif, jadi tiada apa-apa untuk dibayar. Semuanya terbuka.",
  "join.subscribed.parents": "Ruang ibu bapa",
  "join.trouble.title": "Kami tidak dapat menghubungi akaun anda",
  "join.trouble.body": "Semak sambungan anda dan cuba lagi — tiada apa-apa yang dicaj.",
  "join.beforeStripe":
    "Anda akan dibawa ke Stripe untuk membayar sebaik sahaja akaun anda siap. Tiada caj sehingga anda selesai di sana, dan KIDDO tidak pernah melihat kad anda.",
  "join.checkout.starting": "Membawa anda ke Stripe…",
  "join.checkout.ready": "Sedia bila-bila anda mahu",
  "join.checkout.signedInAs":
    "Log masuk sebagai {email}. Langkah seterusnya ialah pembayaran selamat Stripe.",
  "join.checkout.yourAccount": "akaun anda",
  "join.checkout.cta": "Teruskan ke pembayaran",
  "join.checkout.differentAccount": "Guna akaun lain",
  "join.plan.eyebrow": "Pelan anda",
  "join.plan.heading": "{name} · {price} setiap {per}",
  "join.plan.yearlyBlurb": "{blurb} — {saving}% lebih murah daripada bayaran bulanan.",
  "join.plan.monthlyBlurb": "{blurb}. Batal bila-bila masa.",
  "join.plan.legend": "Pilih satu pelan",
  "join.plan.option": "{name} · {price}/{per}",
  "join.plan.compare": "Bandingkan pelan sekali lagi",
  "join.error.billing-unavailable":
    "Langganan belum disediakan pada KIDDO ini. Sila cuba lagi nanti.",
  "join.error.no-account": "Sila log masuk semula, kemudian pilih pelan.",
  "join.error.checkout": "Ada masalah semasa memulakan pembayaran. Sila cuba lagi.",

  /* ---- The subscription gate ------------------------------------------ */
  "sub.confirming.title": "Kami sedang mengesahkan akses KIDDO anda",
  "sub.confirming.body":
    "Terima kasih! Bayaran anda sudah sampai ke Stripe dan KIDDO sedang dibuka. Biasanya ia mengambil masa beberapa saat sahaja — tiada apa-apa yang perlu anda lakukan.",
  "sub.headline.past_due": "Ada bayaran yang tidak berjaya",
  "sub.headline.returning": "Selamat kembali ke KIDDO",
  "sub.headline.incomplete": "Bayaran anda masih dalam pengesahan",
  "sub.headline.ready": "Pengembaraan anak anda sudah sedia.",
  "sub.lead.past_due":
    "KIDDO dihentikan sementara sehingga bayaran berjaya. Mengemas kini kad dalam bahagian bayaran biasanya menyelesaikannya terus.",
  "sub.lead.ended":
    "Langganan anda telah tamat. Pilih satu pelan dan semua yang anak anda mainkan masih ada di tempatnya.",
  "sub.lead.incomplete":
    "Stripe belum mengesahkan bayaran pertama. Jika ia ditolak, anda boleh cuba lagi di bawah; bayaran yang masih diproses akan membuka KIDDO sebaik sahaja ia selesai.",
  "sub.lead.stale":
    "Kami masih belum menerima maklum balas tentang bayaran itu. Jika kad anda sudah dicaj, KIDDO akan terbuka dengan sendirinya sebentar lagi — jangan bayar dua kali. Jika bayaran itu tidak berjaya, anda boleh cuba lagi di bawah.",
  "sub.lead.default":
    "Satu langganan membuka setiap dunia, setiap permainan dan setiap cerita baharu untuk anak anda. Tiada iklan, tiada apa-apa untuk dibeli di dalamnya.",
  "sub.cancelledNote": "Tiada bayaran dibuat. Bila-bila anda sedia, pelan-pelan ada di bawah.",
  "sub.updatePayment": "Kemas kini butiran bayaran",
  "sub.start": "Mulakan KIDDO",
  "sub.footnote": "Batal bila-bila masa. Bayaran dikendalikan oleh Stripe.",
  "sub.billingHistory": "Sejarah bayaran",
  "sub.error.portal": "KIDDO tidak dapat membuka bahagian bayaran sekarang. Sila cuba lagi.",

  /* ---- /welcome: back from Stripe ------------------------------------- */
  "welcome.title": "Selamat datang ke KIDDO! 🎉",
  "welcome.body": "Pengembaraan KIDDO anda bermula di sini.",
  "welcome.who": "Siapa yang nak main?",
  "welcome.toParents": "Pergi ke ruang ibu bapa",
  "welcome.signedOut.title": "Log masuk untuk menyelesaikannya",
  "welcome.signedOut.body":
    "Kami tidak nampak akaun anda pada peranti ini, jadi KIDDO tidak dapat menyemak langganan anda. Log masuk dan ruang ibu bapa akan menunjukkan keadaan sebenarnya.",
  "welcome.cancelled.title": "Tiada bayaran dibuat",
  "welcome.cancelled.body":
    "Anda keluar dari pembayaran sebelum membayar, dan tiada apa-apa yang dicaj. Pelan-pelan menunggu bila-bila anda sedia.",
  "welcome.cancelled.cta": "Lihat pelan-pelan",
  "welcome.confirming.title": "Kami sedang mengesahkan akses KIDDO anda",
  "welcome.confirming.body":
    "Terima kasih! Bayaran anda sudah sampai ke Stripe dan KIDDO sedang dibuka. Biasanya ia mengambil masa beberapa saat sahaja — tiada apa-apa yang perlu anda lakukan, dan halaman ini akan bergerak sendiri.",
  "welcome.waiting.title": "Masih mengesahkan",
  "welcome.waiting.body":
    "Kami masih belum menerima maklum balas tentang bayaran itu. Jika kad anda sudah dicaj, KIDDO akan terbuka dengan sendirinya sebentar lagi — jangan bayar dua kali. Ruang ibu bapa sentiasa menunjukkan keadaan semasa langganan anda.",

  /* ---- The parent area's own gate ------------------------------------- */
  "parents.gate.deviceNote":
    "Semua yang anak anda sudah mainkan pada peranti ini akan disimpan, dan akan bergabung dengan akaun anda kali pertama anda log masuk di sini.",
  "parents.gate.trouble":
    "Kami tidak dapat menghubungi akaun anda sebentar tadi. Semak sambungan anda dan cuba lagi.",
  "parents.gate.opening": "Sedang membuka ruang ibu bapa…",

  /* ---- The one screen a child may meet the account on ------------------ */
  "play.gate.askGrownUp": "Minta orang dewasa bukakan KIDDO!",
  "play.gate.forGrownUps": "Untuk orang dewasa",

  /* ---- Who is playing? ------------------------------------------------- */
  "onboarding.title": "Selamat datang ke KIDDO",
  "onboarding.blurb":
    "Satu perkara terakhir: apakah nama pertama anak anda? KIDDO menggunakannya untuk menyapa. Hanya perkataan pertama disimpan.",
  "onboarding.field": "Nama pertama anak anda",
  "onboarding.error.empty": "Sila taip nama pertama anak anda.",
  "onboarding.error.save": "KIDDO tidak dapat menyimpannya sekarang. Sila cuba lagi.",

  /* ---- The account card ------------------------------------------------ */
  "account.title": "Akaun anda",
  "account.sync.error": "Kemajuan terkini belum sampai ke akaun anda.",
  "account.sync.saving": "Sedang menyimpan kemajuan…",
  "account.sync.synced": "Kemajuan disimpan ke akaun anda.",
  "account.sync.device": "Kemajuan berada pada peranti ini buat masa ini.",
  "account.verify.sent": "E-mel pengesahan telah dihantar. Buka pautan di dalamnya, kemudian kembali ke sini.",
  "account.verify.still": "Belum disahkan. Buka pautan dalam e-mel itu, kemudian semak semula.",
  "account.verify.failed": "Tidak dapat menghantar e-mel sekarang. Sila cuba lagi.",
  "account.verify.unverified": "E-mel anda belum disahkan.",
  "account.verify.sending": "Sedang menghantar…",
  "account.verify.sendAgain": "Hantar sekali lagi",
  "account.verify.send": "Hantar e-mel pengesahan",
  "account.verify.checking": "Sedang menyemak…",
  "account.verify.check": "Saya sudah sahkan",
  "account.delete.open": "Padam akaun",
  "account.delete.title": "Padam akaun KIDDO anda?",
  "account.delete.body":
    "Log masuk anda, nama anak anda dan setiap kemajuan akan dibuang daripada KIDDO, dan sebarang langganan akan dibatalkan supaya tiada caj lagi. Ini tidak boleh dibatalkan.",
  "account.delete.busy": "Sedang memadam…",
  "account.delete.error.recent-login":
    "Demi keselamatan, sila log keluar, log masuk semula, kemudian padam akaun.",
  "account.delete.error.unknown": "KIDDO tidak dapat memadam akaun sekarang. Sila cuba lagi.",

  /* ---- The billing card ------------------------------------------------ */
  "billing.title": "Langganan anda",
  "billing.confirmed": "Semuanya sedia — KIDDO sudah terbuka untuk anak anda.",
  "billing.planLine": "{name} · {price}/{per}",
  "billing.unknownPlan": "Langganan KIDDO",
  "billing.manage": "Urus langganan",

  /* ---- Where the emailed links land ----------------------------------- */
  "reset.title.reset": "Pilih kata laluan baharu",
  "reset.title.doneReset": "Kata laluan anda sudah ditukar",
  "reset.title.doneVerify": "E-mel anda sudah disahkan",
  "reset.title.badLink": "Pautan ini sudah tidak berfungsi",
  "reset.title.offline": "KIDDO tidak dapat menghubungi internet",
  "reset.title.unavailable": "Akaun belum disediakan pada KIDDO ini",
  "reset.body.checking": "Sedang menyemak pautan anda.",
  "reset.body.reset": "Untuk {email}. Sekurang-kurangnya 6 aksara.",
  "reset.body.doneReset": "Log masuk dengannya untuk kembali ke KIDDO anak anda.",
  "reset.body.doneVerify": "Terima kasih. Anda boleh teruskan di ruang ibu bapa.",
  "reset.body.badLink":
    "Pautan kata laluan akan luput selepas seketika dan hanya boleh digunakan sekali. Pergi ke log masuk dan pilih “Lupa kata laluan?” untuk mendapatkan yang baharu.",
  "reset.body.offline": "Semak sambungan dan buka pautan dalam e-mel anda sekali lagi.",
  "reset.body.unavailable":
    "KIDDO ini menyimpan segalanya pada peranti, jadi tiada kata laluan untuk ditetapkan semula.",
  "reset.field": "Kata laluan baharu",
  "reset.submit": "Simpan kata laluan baharu",
  "reset.back": "Pergi ke log masuk",
  "reset.orSignIn": "Atau {link}.",
  "reset.orSignIn.link": "pergi ke log masuk",
  "reset.error.badLink": "Pautan ini sudah luput atau sudah digunakan.",

  /* ---- What KIDDO says when the child arrives -------------------------- */
  "greeting.hello.1": "Hai, {name}!",
  "greeting.hello.2": "Hei, {name}!",
  "greeting.hello.3": "Selamat kembali, {name}!",
  "greeting.hello.4": "Yay, {name} dah sampai!",
  "greeting.invite.1": "Nak main apa?",
  "greeting.invite.2": "Sedia untuk main?",
  "greeting.invite.3": "Apa kita nak jumpa hari ini?",
  "greeting.invite.4": "Ke mana kita nak teroka?",
  "greeting.fallback.hello": "Hai!",
  "greeting.fallback.invite": "Nak main apa?",

  /* ---- Page metadata, evaluated at build time (see app/page.tsx) ------- */
  "meta.parents.title": "Untuk orang dewasa",
  "meta.join.title": "Mulakan KIDDO",
  "meta.join.description": "Pilih pelan dan buka akaun ibu bapa KIDDO anda.",
  "meta.welcome.title": "Selamat datang",
  "meta.reset.title": "Tetapkan semula kata laluan",
  "meta.privacy.title": "Privasi",
  "meta.privacy.description":
    "Apa yang KIDDO simpan pada peranti anda dan dalam akaun ibu bapa, mengapa, dan apa yang tidak dikumpulnya.",

  /* ---- The chrome around a page --------------------------------------- */
  "page.parentArea": "Ruang ibu bapa",
  "page.openKiddo": "Buka KIDDO",
  "page.step1": "Langkah 1 daripada 2",
  "page.step2": "Langkah 2 daripada 2",
  "notfound.title": "Hmm, tiada apa-apa di sini!",
  "notfound.cta": "Kembali ke Dunia KIDDO",

  /* ---- The parent dashboard ------------------------------------------- */
  "parents.greeting.hello": "Helo",
  "parents.greeting.morning": "Selamat pagi",
  "parents.greeting.afternoon": "Selamat petang",
  "parents.greeting.evening": "Selamat malam",
  "parents.child.showing": "Menunjukkan kemajuan {name}.",
  "parents.child.none": "Nama anak belum ditetapkan.",
  "parents.child.change": "Tukar nama",
  "parents.child.add": "Tambah nama",
  "parents.journey.title": "Perjalanan KIDDO anak anda",
  "parents.journey.titleNamed": "Perjalanan KIDDO {name}",
  "parents.journey.note":
    "Pusingan pendek, tiada markah. Setiap aktiviti yang disiapkan menjadi kenangan di dalam dunianya, dan tiada apa-apa yang dikunci atau ditarik balik.",
  "parents.stat.activities": "aktiviti diterokai",
  "parents.stat.keepsakes": "kenangan ditemui",
  "parents.stat.worlds": "dunia dilawati",
  "parents.overview.none": "Pengembaraan belum bermula.",
  "parents.overview.all": "Setiap aktiviti disiapkan di kesemua {worlds} dunia.",
  "parents.overview.line": "{activities} disiapkan merentasi {worlds}.",
  "parents.count.activity": "1 aktiviti",
  "parents.count.activities": "{n} aktiviti",
  "parents.count.world": "1 dunia",
  "parents.count.worlds": "{n} dunia",
  "parents.section.worlds": "Kemajuan dunia",
  "parents.section.recent": "Baru diterokai",
  "parents.section.next": "Seterusnya",
  "parents.section.practising": "Apa yang dilatih",
  "parents.section.settings": "Tetapan",
  "parents.world.complete": "Selesai",
  "parents.world.started": "Sedang berjalan",
  "parents.world.untouched": "Belum bermula",
  "parents.world.progressAria": "Kemajuan {world}",
  "parents.world.firstReward": "Setiap aktiviti yang disiapkan menumbuhkan {reward} di sini.",
  "parents.world.collected": "{done} {reward} telah dikumpul.",
  "parents.viewWorld": "Lihat {world}",
  "parents.progress.all": "Kesemua {total} aktiviti telah diterokai",
  "parents.progress.none": "Belum diterokai · {total} aktiviti",
  "parents.progress.some": "{done} daripada {total} aktiviti telah diterokai",
  "parents.recent.line": "{world} · {reward} diperoleh",
  "parents.recent.empty":
    "Belum ada yang disiapkan. Aktiviti yang siap akan muncul di sini, yang terbaharu dahulu.",
  "parents.tiers.none": "Belum disiapkan.",
  "parents.tiers.done": "Sudah siap: {tiers}.",
  "parents.next.first": "Hentian pertama",
  "parents.next.new": "Baharu",
  "parents.next.line": "{world} · {mode}",
  "parents.next.note":
    "Inilah aktiviti yang sama akan dicadangkan KIDDO pada skrin utama anak anda. Membukanya di sini akan memulakan pusingan, jadi serahkan peranti dahulu.",
  "parents.next.noteNamed":
    "Inilah aktiviti yang sama akan dicadangkan KIDDO pada skrin utama {name}. Membukanya di sini akan memulakan pusingan, jadi serahkan peranti dahulu.",
  "parents.next.open": "Buka aktiviti",
  "parents.next.done":
    "Setiap aktiviti di setiap dunia sudah diterokai. Mana-mana satu boleh dimain semula, bila-bila masa — dan dunia baharu sedang dalam perjalanan.",
  "parents.practising.note":
    "Setiap aktiviti mengambil soalannya daripada kemahiran ini. Tanda betul bermakna aktiviti yang melatihnya sudah disiapkan sekurang-kurangnya sekali.",
  "parents.practising.yes": " (sudah dilatih)",
  "parents.practising.no": " (belum lagi)",
  "parents.settings.resetTitle": "Mulakan pengembaraan semula",
  "parents.settings.resetBody":
    "Membersihkan setiap aktiviti dan kenangan pada peranti ini. Nama anak anda dikekalkan.",
  "parents.storage.account": "Kemajuan disimpan ke akaun anda dan disimpan sementara pada peranti ini.",
  "parents.storage.device": "Kemajuan disimpan pada peranti ini sahaja dan tidak pernah dihantar ke mana-mana.",
  "parents.privacyLink": "Apa yang KIDDO simpan",

  /* ---- The name box, and the one destructive button ------------------- */
  "name.title": "Biar KIDDO menyapa",
  "name.blurb":
    "Tambah nama pertama atau nama panggilan anak anda dan KIDDO akan menyapanya dengan nama itu. Biarkan kosong dan KIDDO cuma menyapa helo.",
  "name.field": "Nama pertama atau nama panggilan",
  "name.placeholder": "Adam",
  "name.hint":
    "Disimpan pada peranti ini sahaja, tidak dihantar ke mana-mana, dan hanya ditunjukkan pada skrin anak anda. Nama pertama paling sesuai — apa-apa selepas perkataan pertama akan dibuang.",
  "name.preview": "KIDDO akan kata:",
  "parents.reset.open": "Set semula kemajuan",
  "parents.reset.done": "Perjalanan anak anda telah diset semula. Setiap aktiviti baharu semula.",
  "parents.reset.doneNamed": "Perjalanan {name} telah diset semula. Setiap aktiviti baharu semula.",
  "parents.reset.confirm": "Set semula perjalanan anak anda?",
  "parents.reset.confirmNamed": "Set semula perjalanan {name}?",
  "parents.reset.body":
    "Semua aktiviti dan kenangan yang ditemui akan dibersihkan. Setiap dunia akan bermula semula. Ini tidak boleh dibatalkan.",

  /* ---- Meletakkan KIDDO pada skrin utama ------------------------------ */
  "install.title": "Letak KIDDO pada skrin utama",
  "install.body":
    "Tambah KIDDO ke skrin utama peranti ini dan anak anda sampai ke permainannya dengan satu ketikan — tanpa perlu menaip alamat dan tanpa tersesat dalam pelayar.",
  "install.cta": "Pasang KIDDO",
  "install.menu":
    "Anda masih boleh menambah KIDDO dari menu pelayar anda sendiri — cari “Install app” atau “Add to Home screen”.",
  "install.done.title": "KIDDO sudah dipasang",
  "install.done.body":
    "Ikon KIDDO sudah ada pada skrin utama peranti ini. Ketik ikon itu dan KIDDO terus terbuka, masih log masuk.",
  "install.browser.title": "Buka KIDDO dalam pelayar",
  "install.browser.body":
    "Anda sedang membaca KIDDO di dalam aplikasi lain, dan aplikasi itu tidak boleh menambah apa-apa ke skrin utama. Buka menu di penjuru, pilih “Buka dalam pelayar”, dan pilihan itu akan menunggu di sini.",
  "install.nudge.title": "Pasang KIDDO di telefon",
  "install.nudge.body":
    "Untuk akses lebih mudah: satu ketikan terus ke permainan, tanpa mencari halaman ini semula.",
  "install.nudge.later": "Nanti dulu",
  "install.guide.title": "Tambah KIDDO ke skrin utama",
  "install.guide.step1":
    "Tekan butang Share pada bar Safari — petak dengan anak panah menghala ke atas.",
  "install.guide.step2": "Skrol ke bawah senarai itu dan pilih “Add to Home Screen”.",
  "install.guide.step3":
    "Tekan “Add”. Ikon KIDDO akan muncul bersama aplikasi anda yang lain.",
  "install.guide.other":
    "Dalam pelayar selain Safari langkahnya sama, cuma butang Share berada di tempat lain. Membuka KIDDO dalam Safari ialah cara yang paling pasti.",
  "install.guide.close": "Sudah faham",

  /* ---- The privacy page ------------------------------------------------ */
  "privacy.eyebrow": "Privasi",
  "privacy.title": "Apa yang KIDDO simpan, dan apa yang tidak.",
  "privacy.lead":
    "KIDDO dibina supaya hampir tiada apa-apa yang perlu diberitahu kepada anda. Halaman ini menerangkan dengan tepat apa yang disimpan oleh versi semasa, di mana, dan mengapa — dalam bahasa yang digunakan seorang ibu bapa, bukan seorang peguam.",
  "privacy.reviewed": "Disemak kali terakhir pada {date}. Menggambarkan versi KIDDO yang anda guna sekarang.",

  "privacy.s.short": "Ringkasnya",
  "privacy.short.1":
    "Anak anda tidak pernah mempunyai akaun dan tidak pernah diminta log masuk. KIDDO tidak tahu siapa anak anda.",
  "privacy.short.2":
    "Tanpa akaun ibu bapa, kemajuan dan nama pertama anak anda kekal dalam pelayar ini, pada peranti ini. Ia tidak dihantar kepada KIDDO atau kepada sesiapa pun.",
  "privacy.short.3":
    "Orang dewasa boleh membuka akaun ibu bapa — satu alamat e-mel dan satu kata laluan — supaya kemajuan mengikut anak antara peranti. Selepas itu nama pertama dan perjalanan turut disimpan di bawah akaun tersebut, dan tiada apa-apa lagi.",
  "privacy.short.4":
    "KIDDO ialah langganan yang dibayar oleh ibu bapa. Bayaran diambil oleh Stripe, yang menyimpan butiran kad; KIDDO tidak pernah melihat atau menyimpan nombor kad.",
  "privacy.short.5":
    "Skrin anak anda tiada iklan, tiada analitik dan tiada penjejakan dalam apa jua bentuk, dan tiada apa-apa yang dijual atau ditayangkan kepada anak anda. Halaman yang ditulis untuk anda — halaman ini, halaman utama, halaman daftar dan ruang ibu bapa — membawa satu tag pengukuran daripada Meta (Facebook) yang mengira lawatan dan, apabila langganan dibeli, pelan yang dipilih serta harganya — supaya KIDDO tahu iklan yang mana berbaloi dibayar.",
  "privacy.short.6":
    "Anda boleh menukar atau memadam segala yang disimpan KIDDO, dan membatalkan langganan, dari ruang ibu bapa pada bila-bila masa.",

  "privacy.s.stores": "Apa yang KIDDO simpan",
  "privacy.stores.intro":
    "Pada peranti, KIDDO menyimpan empat perkara kecil menggunakan storan setempat pelayar anda. Setiap satu disenaraikan dengan nama tepat yang digunakan, supaya anda boleh menyemaknya sendiri.",
  "privacy.stored.name.title": "Nama pertama",
  "privacy.stored.name.body":
    "Ditaip oleh orang dewasa di ruang ibu bapa supaya KIDDO boleh berkata “Hai, Adam!”. Hanya perkataan pertama disimpan; nama keluarga yang ditaip ke dalam kotak itu dibuang sebelum disimpan. Membiarkannya kosong pun tidak mengapa — KIDDO cuma berkata “Hai!”.",
  "privacy.stored.journey.title": "Perjalanan",
  "privacy.stored.journey.body":
    "Senarai aktiviti yang telah disiapkan anak anda, dan dunia mana yang terakhir dimasukinya. Inilah yang melukis kenangan pada pintu, menggerakkan “Sambung pengembaraan”, dan mengisi papan pemuka ibu bapa. Ia tidak mengandungi jawapan, masa, atau markah — hanya pintu mana yang telah dibuka.",
  "privacy.stored.audio.title": "Tetapan bunyi",
  "privacy.stored.audio.body": "Sama ada bunyi dihidupkan, dan sekuat mana muzik dan kesan bunyinya.",
  "privacy.stored.install.title": "Peringatan pemasangan",
  "privacy.stored.install.body":
    "Satu “ya” sahaja, ditulis apabila orang dewasa menolak tawaran untuk meletak KIDDO pada skrin utama, supaya KIDDO tidak bertanya lagi pada peranti ini. Ia tidak memberitahu sama ada KIDDO benar-benar dipasang.",
  "privacy.stores.session":
    "Satu nilai kelima, nombor rawak untuk tab semasa, menentukan sapaan KIDDO yang mana ditunjukkan. Ia berada dalam storan sesi dan hilang apabila tab ditutup. Apabila seorang ibu bapa telah log masuk pada peranti ini, satu nilai keenam bernama {key} menyimpan satu “ya” supaya KIDDO tahu untuk memulihkan log masuk itu; ia tidak mengandungi maklumat peribadi. Log masuk itu sendiri disimpan oleh Firebase Authentication dalam storan pelayar yang sama, seperti mana-mana laman yang anda log masuk.",
  "privacy.stores.cloudIntro": "Dengan akaun ibu bapa, KIDDO turut menyimpan dalam awan, di bawah akaun anda:",
  "privacy.cloud.1":
    "Alamat e-mel dan kata laluan anda, disimpan oleh Firebase Authentication. KIDDO tidak pernah melihat kata laluan itu; ia disimpan sebagai cincangan (hash) oleh perkhidmatan log masuk.",
  "privacy.cloud.2":
    "Nama pertama anak anda — perkataan yang sama seperti di atas, dan tidak lebih daripada itu. Nama keluarga, tarikh lahir, gambar atau jantina tidak pernah diminta.",
  "privacy.cloud.3": "Perjalanan anak anda — senarai aktiviti siap yang sama seperti di atas.",
  "privacy.cloud.4":
    "Keadaan langganan anda: sama ada ia aktif, pelan yang mana (bulanan atau tahunan), bila tempoh semasa berakhir, dan pengenalan yang diberikan Stripe kepada rekod pelanggan dan langganan anda supaya kedua-dua perkhidmatan merujuk perkara yang sama. Semua ini ditulis hanya oleh pelayan KIDDO apabila Stripe melaporkan perubahan; aplikasi dalam pelayar anda boleh membacanya tetapi tidak sekali-kali mengubahnya.",
  "privacy.cloud.5": "Tarikh rekod ini dicipta dan kali terakhir diubah.",
  "privacy.stores.stripe":
    "Butiran pembayaran anda disimpan oleh Stripe, bukan oleh KIDDO. Apabila anda melanggan, anda dibawa ke halaman yang dihidangkan oleh Stripe, tempat anda memasukkan kad anda; Stripe menyimpan alamat e-mel anda, kad itu, dan sejarah bayaran serta invois bagi langganan tersebut, di bawah dasar privasinya sendiri. KIDDO menandakan rekod Stripe itu dengan pengenalan akaun anda supaya bayaran dapat dipadankan dengan akaun anda, dan tiada apa-apa lagi tentang anda atau anak anda.",
  "privacy.stores.noName":
    "Tiada ruangan untuk nama anda sendiri, dan tiada profil tentang anda selain alamat e-mel yang anda gunakan untuk log masuk.",

  "privacy.s.where": "Di mana ia disimpan",
  "privacy.where.device":
    "Pada peranti anda, sentiasa — dalam pelayar tempat anda membuka KIDDO, di bawah alamat tempat anda membukanya. Jika anda memasang KIDDO ke skrin utama, ia menggunakan storan setempat yang sama, jadi kemajuan berpindah antara aplikasi yang dipasang dan pelayar tempat ia dipasang pada peranti yang sama.",
  "privacy.where.cloud":
    "Dengan akaun ibu bapa, nama pertama, perjalanan dan keadaan langganan turut disimpan dalam Firebase milik Google — khususnya Firebase Authentication untuk log masuk dan Cloud Firestore untuk profil anak dan perjalanan — dalam projek milik KIDDO (pengenalannya ialah {project}). Peranti menyimpan satu salinan perjalanan supaya kunjungan berikutnya terbuka serta-merta; semasa anda log masuk, salinan awan itulah yang dikira, dan salinan pada peranti disegarkan daripadanya.",
  "privacy.where.rules":
    "Peraturan akses yang dikuatkuasakan oleh Firestore sendiri — bukan hanya oleh aplikasi — bermakna sesebuah akaun hanya boleh membaca dan menulis rekodnya sendiri, profil anaknya sendiri, dan perjalanan anak itu. Sesiapa yang tidak log masuk tidak boleh membaca apa-apa, dan tiada akaun boleh menyenaraikan atau mencari anak akaun lain. TODO(launch): nyatakan wilayah Firestore (tempat Google menyimpan data) di sini setelah lokasi projek disahkan.",
  "privacy.where.billing":
    "Rekod bil — kad, bayaran, invois, resit — disimpan oleh Stripe, dalam sistem Stripe, di bawah alamat e-mel yang sama yang anda gunakan untuk akaun anda.",
  "privacy.where.meta":
    "Kiraan lawatan itu pergi kepada Meta. Halaman KIDDO untuk ibu bapa — halaman utama, halaman pelan dan pendaftaran, halaman ini, dan ruang ibu bapa — memuatkan piksel Meta, yang merekodkan bahawa sesebuah halaman telah dibuka dan menetapkan satu kuki supaya lawatan yang bermula daripada iklan KIDDO dapat dikenali sebagai lawatan yang sama kemudian. Ia diberitahu alamat halaman itu, dan — pada dua saat sahaja — sedikit lagi: ketika anda meninggalkan KIDDO menuju Stripe untuk membayar, dan ketika bayaran telah berjaya, ia turut diberitahu pelan yang mana antara dua itu dan berapa harganya, supaya KIDDO tahu iklan yang mana membawa langganan dan bukan sekadar lawatan. Itu sahaja senarainya. KIDDO mematikan pengumpulan automatik piksel tersebut, jadi ia tidak pernah membaca butang yang anda tekan atau apa-apa yang anda taip, dan alamat e-mel anda, kad anda, nama anak anda serta perjalanan anak anda tidak pernah dihantar kepadanya. Ia tidak dimuatkan pada mana-mana skrin tempat anak anda bermain — bukan laman utama, bukan dunia, bukan permainan — jadi anak anda tidak pernah dikira langsung. Jika anda pun lebih suka tidak dikira, penyekat penjejak atau tetapan “sekat penjejak” dalam pelayar anda menghentikannya, dan KIDDO berfungsi sama sahaja tanpanya.",
  "privacy.where.noAccount":
    "Tanpa akaun, KIDDO tiada tempat lain untuk menyimpan apa-apa: membuka KIDDO dalam pelayar lain, atau pada peranti lain, bermula dengan perjalanan yang baharu dan kosong.",

  "privacy.s.why": "Mengapa ia disimpan",
  "privacy.why.body":
    "Supaya kunjungan semula terasa seperti pulang: KIDDO ingat di mana anak anda berada, apa yang telah ditemuinya, dan apa panggilannya. Akaun ibu bapa wujud atas satu sebab tambahan — supaya perjalanan yang sama ada pada tablet di rumah dan telefon di dalam kereta. Keadaan langganan disimpan supaya KIDDO tahu sama ada perlu dibuka untuk anak anda, dan supaya ruang ibu bapa dapat menunjukkan pelan dan tarikh pembaharuan anda. Tiada apa-apa tentang anak anda yang disimpan untuk pemasaran, untuk pengukuran atau untuk membina profil. Satu-satunya pengukuran yang KIDDO lakukan ialah kiraan lawatan ke halaman untuk ibu bapanya sendiri, seperti yang diterangkan di bawah “Di mana ia disimpan”. Alamat e-mel anda digunakan untuk log masuk, untuk menghantar e-mel tetapan semula kata laluan dan pengesahan, dan — oleh Stripe — untuk menghantar resit langganan anda.",

  "privacy.s.not": "Apa yang tidak disimpan atau dikumpul",
  "privacy.not.1": "Tiada akaun anak, e-mel anak, kata laluan anak atau log masuk anak dalam apa jua bentuk.",
  "privacy.not.2":
    "Tiada tarikh lahir, gambar, nama keluarga, sekolah, atau apa-apa tentang anak anda selain nama pertama yang pilihan.",
  "privacy.not.3": "Tiada rekod jawapan satu per satu, betul atau salah, atau berapa lama satu pusingan mengambil masa.",
  "privacy.not.4": "Tiada akses lokasi, kenalan, kamera atau mikrofon. KIDDO tidak pernah memintanya.",
  "privacy.not.5":
    "Tiada kuki yang ditetapkan oleh KIDDO sendiri, dan tiada skrip pihak ketiga dalam apa jua bentuk di bahagian anak anda — tiada analitik, tiada pengiklanan, tiada plugin sosial. Pengira Meta, yang memang menetapkan kukinya sendiri, hanya berjalan pada halaman untuk ibu bapa.",
  "privacy.not.6":
    "Tiada nombor kad, tarikh luput atau kod keselamatan. Semua itu dimasukkan pada halaman Stripe dan disimpan oleh Stripe.",
  "privacy.not.7":
    "Tiada harga, skrin bayaran, ajakan menaik taraf atau mesej bil pada mana-mana skrin anak anda. Semua itu berada di ruang ibu bapa.",
  "privacy.not.8":
    "Dari skrin anak anda, tiada permintaan kepada mana-mana perkhidmatan selain yang menghidangkan KIDDO itu sendiri dan, dengan akaun, Firebase untuk menyimpan perjalanan. Dari halaman untuk ibu bapa, perkhidmatan yang dihubungi ialah Firebase (log masuk dan storan), Stripe (pembayaran dan bil) dan Meta (kiraan yang disebut di atas).",
  "privacy.not.logs":
    "Seperti mana-mana laman web, perkhidmatan hos yang menghantar KIDDO, dan Firebase apabila sesebuah akaun digunakan, mungkin menyimpan log akses biasa (contohnya, alamat dan masa sesuatu permintaan) untuk keselamatan dan kebolehpercayaan. TODO(launch): namakan penyedia hos dan tempoh simpanan lognya di sini sebelum pelancaran.",

  "privacy.s.controls": "Kawalan ibu bapa",
  "privacy.controls.intro": "Semua di atas berada di tangan anda dari ruang ibu bapa:",
  "privacy.controls.1":
    "Tambah, tukar atau buang nama pertama. Dengan akaun, perubahan itu turut disimpan ke akaun.",
  "privacy.controls.2":
    "“Mulakan pengembaraan semula” memadam setiap aktiviti dan kenangan yang siap — pada peranti ini dan, dengan akaun, dalam awan. Nama dan akaun dikekalkan.",
  "privacy.controls.3":
    "“Log keluar” menamatkan log masuk pada peranti ini dan membersihkan nama serta perjalanan yang disimpan sementara padanya. Akaun dan salinan awannya tidak disentuh.",
  "privacy.controls.4":
    "“Urus langganan” membuka halaman bil Stripe untuk akaun anda, tempat anda boleh menukar kad, melihat invois, atau membatalkan. Langganan yang dibatalkan mengekalkan KIDDO terbuka sehingga hujung tempoh yang telah dibayar, dan tidak dicaj lagi.",
  "privacy.controls.5":
    "“Padam akaun” mula-mula membatalkan mana-mana langganan yang masih berjalan, membuang rekod pelanggan Stripe anda, kemudian membuang log masuk, profil anak dan perjalanan daripada Firebase, serta salinan simpanan pada peranti ini. Ia tidak boleh dibatalkan. Demi keselamatan, anda akan diminta log masuk semula dahulu jika log masuk anda sudah lama. Stripe menyimpan rekod bayaran lalu sebagaimana yang dikehendaki peraturannya sendiri.",
  "privacy.controls.6":
    "Tanpa akaun, membersihkan data laman ini dalam tetapan pelayar anda akan membuang segalanya sekali gus.",
  "privacy.controls.cta": "Buka ruang ibu bapa",
  "privacy.controls.after":
    "Ruang ibu bapa dicapai melalui butang “Untuk orang dewasa”. Dengan akaun, ia berada di sebalik log masuk anda; tanpa akaun, ia cuma diasingkan daripada skrin anak. Skrin anak tidak pernah menunjukkan log masuk, alamat e-mel atau tetapan akaun.",

  "privacy.s.children": "Kanak-kanak",
  "privacy.children.body":
    "KIDDO dibuat untuk kanak-kanak berumur 4 hingga 8 tahun bermain dengan orang dewasa berdekatan. Akaun, apabila ada, milik ibu bapa; seorang anak ialah profil di dalamnya yang menyimpan nama pertama yang pilihan dan senarai pintu yang dibuka, dan tiada apa-apa lagi. KIDDO tidak berkongsi atau menjual maklumat ini. Kami belum lagi meminta peguam menyemak pernyataan ini terhadap mana-mana undang-undang privasi kanak-kanak yang khusus; kami akan menyatakannya di sini apabila sudah.",

  "privacy.s.changes": "Apabila ini berubah",
  "privacy.changes.body":
    "Jika versi KIDDO yang akan datang menyimpan apa-apa lebih daripada yang disenaraikan di sini, halaman ini akan berubah dahulu, dan ia akan menyatakan dengan jelas apa yang disimpan dan di mana. Tiada apa-apa meninggalkan peranti anda melainkan seorang dewasa memilih untuk membuka akaun.",

  "privacy.s.contact": "Hubungi kami",
  "privacy.contact.body": "Soalan tentang halaman ini dialu-alukan.",
  "privacy.contact.todo":
    "TODO(launch): tambah alamat e-mel sokongan dan nama syarikat atau orang yang bertanggungjawab bagi KIDDO.",
  "privacy.done": "Sudah habis membaca? KIDDO sedang menunggu.",

  /* ---- The shelf of games, and the screen they sit on ------------------ */
  "meta.play.title": "Dunia KIDDO",
  "meta.play.description": "Pilih satu dunia dan mulakan pengembaraan.",
  "play.worlds": "Pilih satu dunia",
  "play.moreGames": "Lagi permainan untuk dimainkan",
  "upcoming.title": "Lagi kawan, lagi permainan",
  "upcoming.body": "Benda baharu untuk dimainkan sedang dalam perjalanan.",
  "upcoming.science": "Sains",
  "upcoming.time": "Masa",
  "upcoming.music": "Muzik",
  "upcoming.feelings": "Perasaan",
  "soon.title": "Hampir siap!",
  "soon.themes": "Apa yang awak akan main",
  "soon.back": "Kembali ke Dunia KIDDO",

  /* ---- The games themselves: a name, a line spoken to the child, and a
         sentence for the grown-up. Keyed by the id in `data/games.ts`, so
         the catalogue there carries no English of its own. ---------------- */
  "game.memory-match.title": "Padan Ingatan",
  "game.memory-match.tagline": "Cari kawan yang sepadan!",
  "game.memory-match.summary":
    "Balikkan kad dan ingat di mana setiap kawan bersembunyi. Membina ingatan visual dan tumpuan.",
  "game.memory-match.theme.friends": "KIDDO & Kawan-kawan",
  "game.memory-match.theme.animals": "Haiwan",
  "game.memory-match.theme.shapes": "Bentuk",
  "game.memory-match.theme.colours": "Warna",

  "game.find-it.title": "Jom Cari!",
  "game.find-it.tagline": "Boleh awak cari yang betul?",
  "game.find-it.summary":
    "Kenal pasti watak atau objek yang dinamakan antara beberapa pilihan. Membina pengecaman dan perbendaharaan kata.",
  "game.find-it.theme.friends": "KIDDO & Kawan-kawan",
  "game.find-it.theme.animals": "Haiwan",
  "game.find-it.theme.colours": "Warna",

  "game.math-quest.title": "Jelajah Nombor",
  "game.math-quest.tagline": "Jom main dengan nombor!",
  "game.math-quest.summary":
    "Sepuluh soalan diambil segar setiap kali: mengira, mengenal nombor, lebih besar dan lebih kecil, menambah dan menolak, urutan nombor dan corak.",
  "game.math-quest.theme.counting": "Mengira 1-10",
  "game.math-quest.theme.numbers": "Kawan Nombor",
  "game.math-quest.theme.compare": "Lebih Besar atau Lebih Kecil",
  "game.math-quest.theme.adding": "Tambah & Tolak",
  "game.math-quest.theme.patterns": "Corak & Urutan",

  "game.english-quest.title": "Jelajah Bahasa Inggeris",
  "game.english-quest.tagline": "Jom main dengan huruf dan perkataan!",
  "game.english-quest.summary":
    "Sepuluh soalan diambil segar setiap kali: menamakan huruf, memadankan huruf besar dan huruf kecil, mendengar bunyi permulaan sesuatu perkataan, dan mencari huruf yang hilang daripada sesuatu perkataan.",
  "game.english-quest.theme.letters": "Mengenal Huruf",
  "game.english-quest.theme.case": "Huruf Besar & Huruf Kecil",
  "game.english-quest.theme.sounds": "Bunyi Awal",
  "game.english-quest.theme.spelling": "Melengkapkan Perkataan",

  "game.logic-quest.title": "Jelajah Logik",
  "game.logic-quest.tagline": "Jom fikir bersama-sama!",
  "game.logic-quest.summary":
    "Sepuluh teka-teki diambil segar setiap kali: melengkapkan corak berulang, mengesan yang tidak sekumpulan, mengasingkan benda ke dalam kumpulan yang sesuai, dan memikirkan apa yang datang seterusnya dalam sesuatu urutan.",
  "game.logic-quest.theme.patterns": "Melengkapkan Corak",
  "game.logic-quest.theme.odd-one-out": "Yang Tak Sama",
  "game.logic-quest.theme.sorting": "Mengasingkan Benda",
  "game.logic-quest.theme.sequences": "Apa Seterusnya",

  "game.shapes-colours-quest.title": "Jelajah Bentuk & Warna",
  "game.shapes-colours-quest.tagline": "Jom tengok betul-betul!",
  "game.shapes-colours-quest.summary":
    "Sepuluh gambar diambil segar setiap kali: menamakan bentuk dan warna, memadankan satu ciri sambil mengabaikan yang lain, besar dan kecil, mengira, bucu dan sisi, di mana sesuatu berada, bentuk cerminan, serta corak warna dan saiz.",
  "game.shapes-colours-quest.theme.shapes": "Mengenal Bentuk",
  "game.shapes-colours-quest.theme.colours": "Mengenal Warna",
  "game.shapes-colours-quest.theme.matching": "Sama atau Berbeza",
  "game.shapes-colours-quest.theme.counting": "Berapa Banyak?",
  "game.shapes-colours-quest.theme.space": "Di Mana Letaknya",

  "game.match-quest.title": "Jelajah Padanan",
  "game.match-quest.tagline": "Cari kawan yang berpasangan!",
  "game.match-quest.summary":
    "Sepuluh papan diambil segar setiap kali. Setiap huruf besar mempunyai pasangan huruf kecilnya yang bersembunyi antara yang lain, dan anak memadankannya dengan mengetuk satu kad kemudian yang satu lagi, atau dengan menyeret satu ke atas yang lain. Tiada apa-apa yang hilang apabila pasangan itu tidak menjadi.",
  "game.match-quest.theme.case": "Huruf Besar & Huruf Kecil",

  "game.general-knowledge-quest.title": "Jelajah Dunia",
  "game.general-knowledge-quest.tagline": "Jom kenali dunia!",
  "game.general-knowledge-quest.summary":
    "Sepuluh soalan diambil segar setiap kali daripada hampir empat ratus fakta: haiwan dan rumahnya, bunyinya, anaknya dan makanannya; tumbuhan, cuaca dan musim; makanan, pakaian dan barang di dalam rumah; kenderaan, orang yang membantu kita dan tempat yang kita tuju; badan, deria, langit, dan menjaga keselamatan.",
  "game.general-knowledge-quest.theme.animals": "Haiwan",
  "game.general-knowledge-quest.theme.nature": "Alam & Cuaca",
  "game.general-knowledge-quest.theme.everyday": "Benda Harian",
  "game.general-knowledge-quest.theme.people": "Orang & Tempat",
  "game.general-knowledge-quest.theme.body": "Badan Saya",
  "game.general-knowledge-quest.theme.space": "Angkasa & Keselamatan",

  /* ---- Bingkai setiap skrin yang dilihat oleh kanak-kanak -------------- */
  "chrome.home": "Laman utama KIDDO",
  "chrome.forGrownUps": "Untuk dewasa",
  "chrome.back": "Kembali ke Dunia KIDDO",
  "chrome.soundOn": "Bunyi hidup",
  "chrome.soundOff": "Bunyi mati",
  "chrome.step": "Langkah {current} daripada {total}",
  "chrome.tagline": "Main. Belajar. Senyum.",

  /* ---- Penghujung satu pusingan ---------------------------------------- */
  "celebrate.title": "Kamu berjaya!",
  "celebrate.playAgain": "Main lagi",

  /* ---- Apa yang dituturkan sepanjang pusingan, untuk yang mendengar ---- */
  "quest.asking": "Soalan {current} daripada {total}. {question}",
  "quest.answered":
    "Ya, jawapannya {answer}. Soalan {current} daripada {total} selesai.",
  "quest.boardAnswered": "{said} Soalan {current} daripada {total} selesai.",
  "quest.joined": "Ya. {current} daripada {total} dah disambung.",
  "quest.notQuite": "Belum tepat. Cuba sekali lagi.",

  /* ---- Suara setiap permainan: sapaan, sorakan, pujukan, pintu masuk,
         dan dua baris di penghujungnya. Setiap permainan memiliki
         kesemuanya, walaupun dua permainan berkata benda sama dalam bahasa
         Inggeris, kerana suara itulah satu-satunya perkara yang wajar
         dibezakan oleh penterjemah. ------------------------------------- */
  "game.memory-match.foundAll": "Kamu dah jumpa semuanya!",
  "game.memory-match.foundOne": "Ya! Kamu jumpa {name}!",
  "game.memory-match.checking": "Ooh, bukan dua itu. Cuba lagi!",
  "game.memory-match.peek": "Jom tengok...",
  "game.memory-match.findMatch": "Sekarang cari yang sepadan!",
  "game.memory-match.another": "Bagus! Cari pasangan lain pula.",
  "game.memory-match.start": "Ketik dua kad untuk cari kawan yang sepadan!",
  "game.memory-match.saidAll":
    "Kamu jumpa kesemua {total} pasangan dalam {tries} cubaan.",
  "game.memory-match.saidOne":
    "{name} dah sepadan. {done} daripada {total} pasangan dijumpai.",
  "game.memory-match.saidMiss": "Bukan pasangan. Kedua-dua kad terbalik semula.",
  "game.memory-match.done.title": "Syabas!",
  "game.memory-match.done.message": "Kamu dah jumpa semua kawan!",
  "game.memory-match.card.found": "{name}, dah dijumpai",
  "game.memory-match.card.notPair": "{name}, bukan pasangan",
  "game.memory-match.card.faceDown": "Kad {number}, tertiarap",

  "game.find-it.ask": "Boleh kamu cari {name}?",
  "game.find-it.askMe": "Boleh kamu cari saya, {name}?",
  "game.find-it.yes": "Ya! Itu {name}!",
  "game.find-it.wrong": "Itu {picked}! Boleh kamu cari {name}?",
  "game.find-it.saidYes":
    "Ya, itu {name}. Pusingan {current} daripada {total} selesai.",
  "game.find-it.saidWrong": "Itu {picked}. Teruskan mencari {name}.",
  "game.find-it.saidAsking": "Pusingan {current} daripada {total}. Cari {name}.",
  "game.find-it.done.title": "Kamu dah jumpa semuanya!",
  "game.find-it.done.message": "Setiap seorang kawan. Hebat betul mata kamu!",

  "game.math-quest.hello": "Hai! Saya KIDDO. Jom kita main dengan nombor?",
  "game.math-quest.yes": "Ya! Jawapannya {answer}.",
  "game.math-quest.retry": "Ooh, hampir betul! Cuba sekali lagi.",
  "game.math-quest.start": "Jom main!",
  "game.math-quest.done.title": "Kamu dah habiskan seluruh pengembaraan!",
  "game.math-quest.done.message":
    "Sepuluh soalan, sampai ke penghujung. Hebat betul fikiran kamu!",

  "game.english-quest.hello": "Hai! Saya KIDDO. Jom kita main dengan huruf dan perkataan?",
  "game.english-quest.yes": "Ya! Jawapannya {answer}.",
  "game.english-quest.retry": "Ooh, hampir betul! Cuba sekali lagi.",
  "game.english-quest.start": "Jom main!",
  "game.english-quest.done.title": "Kamu dah habiskan seluruh pengembaraan!",
  "game.english-quest.done.message":
    "Sepuluh huruf, bunyi dan perkataan, sampai ke penghujung. Bacaan yang hebat!",

  "game.logic-quest.hello": "Hai! Saya KIDDO. Jom kita berfikir sama-sama?",
  "game.logic-quest.yes": "Ya! Jawapannya {answer}.",
  "game.logic-quest.retry": "Hampir! Jom kita tengok sekali lagi.",
  "game.logic-quest.start": "Jom berfikir!",
  "game.logic-quest.done.title": "Kamu dah selesaikan semuanya!",
  "game.logic-quest.done.message":
    "Sepuluh teka-teki, sampai ke penghujung. Itu pemikiran yang sangat bagus.",

  "game.shapes-colours-quest.hello":
    "Hai! Saya KIDDO. Jom kita tengok bentuk dan warna?",
  "game.shapes-colours-quest.yes": "Ya! Jawapannya {answer}.",
  "game.shapes-colours-quest.retry": "Hampir! Jom kita tengok sekali lagi.",
  "game.shapes-colours-quest.start": "Jom tengok!",
  "game.shapes-colours-quest.done.title": "Kamu dah tengok setiap satu!",
  "game.shapes-colours-quest.done.message":
    "Sepuluh gambar, sampai ke penghujung. Kamu jumpa setiap bentuk dan setiap warna.",

  "game.match-quest.hello":
    "Hai! Saya KIDDO. Jom kita cari huruf yang berpasangan?",
  "game.match-quest.praise.1": "Padanan yang bagus!",
  "game.match-quest.praise.2": "Dua ini memang sepasang!",
  "game.match-quest.praise.3": "Bagus!",
  "game.match-quest.praise.4": "Itulah dia!",
  "game.match-quest.nudge.1": "Belum lagi dua ini.",
  "game.match-quest.nudge.2": "Cuba tengok sekali lagi.",
  "game.match-quest.nudge.3": "Siapa agaknya kawannya?",
  "game.match-quest.solved": "Kamu dah jumpa semua kawan!",
  "game.match-quest.saidSolved": "Kamu dah jumpa semuanya.",
  "game.match-quest.said": "{said} Papan {current} daripada {total} selesai.",
  "game.match-quest.start": "Jom padankan!",
  "game.match-quest.done.title": "Semua dah jumpa kawan!",
  "game.match-quest.done.message":
    "Setiap huruf besar dah jumpa kawan kecilnya. Padanan yang hebat!",

  "game.general-knowledge-quest.hello":
    "Hai! Saya KIDDO. Jom kita kenal dunia ini?",
  "game.general-knowledge-quest.yes": "Bagus betul fikiran kamu! Jawapannya {answer}.",
  "game.general-knowledge-quest.retry": "Ooh, bukan yang itu. Cuba lagi!",
  "game.general-knowledge-quest.joined": "Kamu dah sambungkan semuanya!",
  "game.general-knowledge-quest.yesBoard": "Ya! Itulah dia.",
  "game.general-knowledge-quest.retryBoard": "Ooh, bukan yang itu. Cuba sekali lagi.",
  "game.general-knowledge-quest.start": "Jom cari tahu!",
  "game.general-knowledge-quest.done.title": "Banyaknya kamu tahu!",
  "game.general-knowledge-quest.done.message":
    "Sepuluh soalan tentang seluruh dunia, sampai ke penghujung. Haiwan, cuaca, orang, tempat — kamu tahu semuanya.",

  /* ---- Enjin permainan. Setiap baris di sini didengar, bukan dibaca:
         jubin menyebut namanya dan keadaannya, kerana warna sempadan bukan
         sesuatu yang boleh disampaikan oleh pembaca skrin. --------------- */
  "stage.choice.correct": "{name}, itulah dia",
  "stage.choice.wrong": "{name}, bukan yang ini",
  "stage.choice.tried": "Pilih {name}, sudah dicuba",
  "stage.choice.idle": "Pilih {name}",
  "stage.match.matched": "{name}, sepadan dengan {partner}.",
  "stage.match.selected": "{name}, dipilih. Pilih benda yang sepadan dengannya.",
  "stage.match.idle": "{name}, belum sepadan. Pilih ia.",
  "stage.match.no": "{from} dan {to} tidak sepadan. Cuba yang lain pula.",
  "stage.match.allDone": "{from} sepadan dengan {to}. Kamu dah jumpa semuanya!",
  "stage.match.more": "{from} sepadan dengan {to}. Tinggal {remaining} lagi.",
  "stage.match.left": "Set pertama",
  "stage.match.right": "Set yang sepadan dengannya",
  "stage.connect.joined": "{name}, disambung ke {partner}",
  "stage.connect.selected": "{name}, dipilih. Sekarang pilih yang sepadan dengannya.",
  "stage.connect.idle": "{name}, belum disambung. Pilih ia.",
  "stage.order.chosen":
    "{name}, dipilih. Pilih sekali lagi untuk meletakkannya di tempat {place} daripada {total}.",
  "stage.order.waiting": "{name}, menunggu. Pilih untuk menggerakkannya.",
  "stage.order.filled": "Tempat {place} daripada {total}: {name}.",
  "stage.order.empty": "Tempat {place} daripada {total}, masih kosong.",
  "stage.order.drop": "Letak {name} di tempat {place} daripada {total}.",
  "stage.order.next":
    "Tempat {place} daripada {total}, seterusnya untuk diisi. Pilih satu jubin dahulu.",

  /* ---- Simbol dalam soalan, disebut dengan suara ----------------------- */
  "prompt.plus": "campur",
  "prompt.minus": "tolak",
  "prompt.equals": "sama dengan",
  "prompt.question": "berapa",
  "prompt.less": "kurang daripada",
  "prompt.greater": "lebih daripada",
  "prompt.arrow": "kemudian",
  "prompt.blank": "apa?",

  /* ---- Dunia-dunia: peta, pintu, dan apa yang sesebuah tempat berikan
         kembali. Nama sesebuah dunia, ayatnya dan ganjarannya ada di bawah
         `world.` dan `reward.` di atas; ini pula kata-kata yang dibalut oleh
         peta di sekelilingnya. ------------------------------------------- */
  "worlds.map": "Dunia",
  "worlds.door.allFound": "Semua dijumpai",
  "worlds.door.new": "Baharu",
  "worlds.door.progress": "{done} daripada {total} selesai",
  "worlds.door.sr": "{name}. {line} {state}",
  "worlds.door.state.done": "Semuanya sudah dijumpai.",
  "worlds.door.state.new": "Baharu.",
  "worlds.door.state.going": "{done} daripada {total} selesai.",
  "worlds.keepsake.none": "Belum ada {many}",
  "worlds.keepsake.all": "Kesemua {total} {many}",
  "worlds.keepsake.some": "{done} daripada {total} {many}",
  "worlds.keepsake.sr": "{name}: {label}.",
  "worlds.continue.done": "Kamu dah jelajah semua dunia!",
  "worlds.continue.back": "Teruskan pengembaraan kamu",
  "worlds.continue.start": "Mulakan pengembaraan kamu",
  "worlds.continue.next": "Seterusnya: {door} di {world}",
  "worlds.continue.first": "Hentian pertama: {door} di {world}",
  "worlds.continue.allOpen":
    "Setiap pintu sudah terbuka. Main mana-mana sekali lagi, bila-bila masa.",
  "worlds.continue.goDone": "Lawati dunia-dunia",
  "worlds.continue.goBack": "Teruskan",
  "worlds.continue.goStart": "Jom pergi!",
  "worlds.stickers.one": "1 pelekat",
  "worlds.stickers.many": "{count} pelekat",
  "worlds.stickers.earned": "{stickers} diperoleh",
  "worlds.page.allDone": "Hebat! Kamu dah jumpa semuanya di sini.",
  "worlds.page.allDoneNamed": "Hebat, {name}! Kamu dah jumpa semuanya di sini.",
  "worlds.page.back": "Selamat kembali! {rest}",
  "worlds.page.backNamed": "Selamat kembali, {name}! {rest}",
  "worlds.page.try": "Jom cuba {door}?",
  "worlds.page.startHere": "Mula di sini",
  "worlds.page.continue": "Teruskan",
  "worlds.page.visit": "Lawati {world}",
  "worlds.page.doors": "Perkara yang boleh dibuat di {world}",
  "worlds.status.done": "Selesai",
  "worlds.status.next": "Seterusnya",
  "worlds.status.new": "Baharu",
  "worlds.doorCard.sr": "{title}. {blurb} {status}.",
  "worlds.doorCard.tier": "{tier} {state}.",
  "worlds.doorCard.playAgain": "Main lagi",
  "worlds.doorCard.play": "Jom main",
  "worlds.tierState.done": "sudah selesai",
  "worlds.tierState.ready": "sudah terbuka",
  "worlds.tierState.locked": "berkunci",
  "worlds.tier.group": "Sebesar mana cabarannya",
  "worlds.tier.ask": "Sebesar mana cabarannya?",
  "worlds.tier.sr": "{tier}. {state}.",
  "worlds.tier.done": "Sudah selesai",
  "worlds.tier.ready": "Sudah terbuka",
  "worlds.tier.locked": "Berkunci",
  "worlds.game.hello": "Hai, {name}! {intro}",
  "worlds.game.next": "Seterusnya: {door}",
  "worlds.game.back": "Kembali ke {world}",
  "worlds.game.worldDone": "Hebat! Kamu dah jumpa semuanya di {world}!",
  "worlds.game.worldDoneAgain": "Hebat! Kamu dah jumpa semuanya di {world}.",
  "worlds.game.tricky": "Itu memang mencabar — dan kamu berjaya!",
  "worlds.game.figured": "Wah! Kamu dah dapat jawapannya!",
  "worlds.game.again": "Tetap hebat. Setiap kali tetap bermakna!",
  "worlds.game.bigger": "Sedia untuk cabaran yang lebih besar?",
  "worlds.game.start": "Jom pergi!",

  /* ---- The little notice: another family joined ----------------------- */
  "social.join.plan": "🚀 Satu keluarga baru sahaja memilih pelan {plan}",
  "social.join.joined": "🎉 Satu lagi keluarga KIDDO baru sahaja menyertai",
  "social.join.started": "✨ Satu lagi keluarga memulakan perjalanan KIDDO mereka",
};
