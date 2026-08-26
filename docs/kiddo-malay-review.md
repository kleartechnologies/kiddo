# Malay copy — native-speaker review list

**This Malay has not been reviewed by a native Malaysian speaker. It should be,
before launch.** It was written and revised carefully against Malaysian usage —
not Indonesian — but "careful" is not "native", and this document exists so
nobody downstream reads the coverage tests passing as a claim about the
language. The tests prove every string *exists* and that no English leaked
through. They cannot prove a sentence sounds right to a Malaysian four-year-old
or their parent.

What follows is the reviewer's worklist, ordered by how much a wrong call
costs. Sections 1–3 are where the risk is. Section 4 is the long tail: the
complete lesson-name table to read through.

Everything here is copy. None of it is an id, an answer, a number or a piece
of game state — see [kiddo-localization.md](kiddo-localization.md) for what may
never be translated. A reviewer can change any Malay string in this document
freely without touching how a game behaves.

---

## 1. Highest risk: the baby-animals wording

**Where:** `src/lib/content/i18n/phrases.ts`, and the boards dealt by
`general-knowledge.baby-animals`, `general-knowledge.animal-babies` and
`discovery.animal-babies`.

### The problem the wording is solving

English names a baby animal with a word of its own — *puppy*, *chick*, *foal*.
Malay names it as *anak* + the grown-up: *anak anjing*, *anak ayam*, *anak
kuda*. So the two nouns the English sentence needs are one noun in Malay, and
two of the English holes collapse onto the same Malay phrase:

| English line | Malay line |
| --- | --- |
| `Which animal has {} called {}?` | `{2} akan membesar menjadi haiwan apa?` |
| `{} is called {}.` | `Anak itu dipanggil {2}.` |
| `Every {} is home.` | `Setiap anak sudah pulang.` |
| `Can you help each animal find its {}?` | `Bolehkah kamu bantu setiap haiwan mencari anaknya?` |
| `Think of {} animal that the little one turns into.` | `Fikirkan haiwan dewasa yang anak kecil itu akan jadi apabila membesar.` |
| `Look for the little one that belongs to each {}.` | `Cari anak bagi setiap haiwan dewasa.` |

The literal rendering — *"Anak anjing dipanggil anak anjing."* — is what the
symmetric version produces, and it is nonsense. The wording above breaks the
symmetry on purpose: the explanation refers back with *anak itu* rather than
naming the baby twice.

### What a reviewer should decide

1. **Is `Anak itu dipanggil anak anjing.` the right sentence?** It is the
   explanation a child hears after answering. Alternatives worth weighing:
   *"Anak anjing ialah anak kepada anjing."*, *"Anjing kecil dipanggil anak
   anjing."*, or dropping the naming entirely: *"Betul — itu anak anjing."*
2. **Is `Anak anjing akan membesar menjadi haiwan apa?` a fair question?**
   This is the one place where the language changes how hard the lesson is,
   and it is a content-design question, not a translation one. In English,
   *"Which animal has a baby called a puppy?"* is a real riddle. In Malay the
   answer is inside the question — *anak **anjing*** → *anjing* — for ten of
   the twelve animals. Only two stay riddles:

   | English | Malay | still a riddle in Malay? |
   | --- | --- | --- |
   | puppy / kitten / chick / lamb / duckling / foal / calf / fawn / cub / joey | anak anjing / anak kucing / anak ayam / anak biri-biri / anak itik / anak kuda / anak lembu / anak rusa / anak singa / anak kanggaru | no — transparent |
   | tadpole | berudu | yes |
   | caterpillar | ulat beluncas | yes |

   This is not a defect in the Malay; it is a true fact about Malay. The
   options are to accept it (the Malay round is easier, and still teaches the
   *anak X* pattern, which is itself worth learning), or to reshape the Malay
   question into something that stays a question — e.g. asking for the picture
   of the grown-up rather than its name, or asking *"Anak haiwan ini dipanggil
   apa?"* with the picture given. **Reshaping is a product decision and has
   not been made here.** Flagged for the reviewer and the product owner
   together.
3. **`kanggaru`** — Malaysian spelling check. `kanggaru` was chosen over
   `kangaru` and the Indonesian `kanguru`.
4. **`ulat beluncas`** vs plain **`beluncas`** vs **`ulat bulu`** — which does
   a Malaysian preschooler actually meet?
5. **`biri-biri`** vs **`kambing biri-biri`** for *sheep*, given *kambing* is
   goat and the two are near-neighbours for a small child.

---

## 2. The other lines where Malay drops an English hole

Fourteen of the 850 sentence-book lines use fewer holes than their English
original. Six are the baby-animals lines in §1. The other eight are below,
each with why it was written that way. **A reviewer should confirm the Malay
still says the same thing to a child, not that it has the same shape.**

| # | English | Bahasa Melayu | why |
| --- | --- | --- | --- |
| 1 | `{@} is {@} {}.` | `{1} ialah {3}.` | English says *"B is b big."*-style letter-case; Malay names the case once. |
| 2 | `A is {}.` | `A ialah huruf.` | *a letter* → `huruf`; the hole held an article Malay has no use for. |
| 3 | `What does your body need lots of, so you can grow {} and strong?` | `Apa yang badan kamu perlukan banyak, supaya kamu boleh membesar dengan sihat dan kuat?` | *healthy and strong* → `sihat dan kuat`, one adverbial phrase. |
| 4 | `It is halfway between waking up and going to {}.` | `Ia berada di pertengahan antara bangun tidur dan pergi tidur.` | *going to bed* → `pergi tidur`; Malay has no separate noun in the phrase. |
| 5 | `{} gives us {} and warmth all day long.` | `{1} memberi kita cahaya dan kehangatan sepanjang hari.` | *light* is fixed as `cahaya`. Check `kehangatan` — is `kepanasan` or `haba` more natural for a child? |
| 6 | `Think about what you would roll into {} white {}.` | `Fikirkan apa yang kamu akan gulung menjadi tiga bola putih yang besar.` | The snowman hint; the count and noun are fixed in Malay. Check that *tiga bola putih yang besar* reads naturally. |
| 7 | `Which weather {} puddles all over the ground?` | `Cuaca manakah yang meninggalkan lopak air di seluruh tanah?` | *leaves* → `meninggalkan`. Check `lopak air` vs `takungan air`. |
| 8 | `Take {} sniff.` | `Hidu dalam-dalam.` | *a deep sniff*; Malay puts the depth on the verb. |

---

## 3. Counting dots — `titik`

**Where:** `sayDots()` in `src/lib/content/i18n/index.ts`, and every `titik`
line in `phrases.ts`.

English inflects the noun and Malay does not, so `1 dot` / `4 dots` are both
`1 titik` / `4 titik`. That is the whole rule, and it is deliberate: no plural
is invented, and no `s` is stripped off an English word to make a Malay one.
The number stays in front of the noun — an earlier bug produced `titik 4`,
which is Malay for nothing; `tests/localization.test.ts` now checks every count
from 1 to 20.

**For the reviewer:**

- Is `4 titik` right, or should a child hear `4 bintik`? `titik` is a dot/point;
  `bintik` is a spot or speck. The tiles are printed dots.
- The sentence-book lines fold the English singular and plural onto one Malay
  line — `The others all have {#} dot.` and `…{#} dots.` both become
  `Yang lain semuanya ada {1} titik.` Confirm that is correct and not merely
  convenient.
- `Berapa banyak titik yang boleh kamu kira?` — natural, or is
  `Berapa titik semuanya?` closer to how a Malaysian parent would ask?

---

## 4. Lesson names — the full list

All 86 `concept.*` keys, English beside Bahasa Melayu, grouped the way a child
meets them. These are the words a parent reads on the dashboard and on a world
card, so they carry more weight per word than anything else in the product.

### Changed during this pass

Seven names were rewritten for naturalness. The reasoning is given so a
reviewer can disagree with it:

| key | was | now | why |
| --- | --- | --- | --- |
| `english.opposites` | Lawan kata | Perkataan berlawanan | *lawan kata* reads as the Indonesian term; the sibling key already says `lawannya`. |
| `logic.sorting` | Mengasingkan benda mengikut kumpulan | Mengumpul benda mengikut jenis | *mengasingkan* is *separating*; the lesson is grouping. Also shorter. |
| `logic.group-partners` | Ia masuk ke dalam kumpulan mana? | Ia masuk kumpulan yang mana? | The original is a word-for-word calque of the English. |
| `general-knowledge.object-uses` | Untuk Apa Ia Digunakan? | Apa Kegunaannya? | Shorter and the way the question is actually asked. |
| `general-knowledge.helper-tools` | Alat Untuk Bekerja | Alat Untuk Setiap Kerja | *Tools of the Job* — the original lost the "each job" sense. |
| `general-knowledge.body-partners` | Apa Yang Setiap Bahagian Badan Buat | Apa Kerja Setiap Bahagian Badan | The original is awkwardly literal and ends on a weak verb. |
| `match.quantity-partners` | Nombor dan berapa banyak | Nombor dan bilangannya | *dan berapa banyak* is a calque; `bilangannya` parallels the other three `*-partners` names. |

### Open terminology questions

Decisions taken for consistency, each of which a native speaker may overturn:

- **`mengira` vs `membilang` for counting.** Malaysian preschool curriculum
  uses *membilang* for counting objects in sequence and *mengira* for
  calculating. KIDDO currently uses `mengira` in the lesson names
  (`math.counting`, `discovery.count-order`) **and** `kira` in the in-game
  speech, because switching only the names would leave the two disagreeing.
  If the reviewer prefers *membilang*, it must change in both places at once.
- **`anak`** is the word for every baby animal — see §1.
- **`haiwan`** for animal throughout (not *binatang*), **`haiwan dewasa`** for
  the grown-up.
- **`bentuk`** for shape, **`nombor`** for number, **`perkataan`** for word,
  **`huruf`** for letter, **`warna`** for colour.
- **Two registers, on purpose.** `anda` (and `anak anda`) to the parent —
  never `kamu` to a grown-up; `kamu` to the child, inside the games. `ibu bapa`
  rather than `bapa` alone. The full list of standing choices is in the header
  comment of `src/lib/i18n/messages/ms.ts` and includes `muka surat` vs
  `halaman`, the billing vocabulary (`langganan` / `pelan` / `bayaran`) and
  which loan words are left alone (`tablet`, `video`, `iklan`). **That header
  is part of what needs reviewing** — it is the rule every other string was
  written against, so a reviewer who disagrees with it disagrees with several
  hundred lines at once.

### Math world — 13 lesson names

| key | English | Bahasa Melayu |
| --- | --- | --- |
| `math.addition` | Adding up | Menambah |
| `math.before-and-after` | Before and after | Sebelum dan selepas |
| `math.comparison` | Bigger or smaller | Lebih besar atau lebih kecil |
| `math.counting` | Counting | Mengira |
| `math.counting-objects` | How Many Things? | Berapa Banyak Benda? |
| `math.missing-number` | The missing number | Nombor yang hilang |
| `math.number-order` | Numbers In Order | Nombor Mengikut Urutan |
| `math.number-recognition` | Knowing numbers | Mengenal nombor |
| `math.number-sequence` | What comes next | Apa yang seterusnya |
| `math.pattern` | What comes next in the pattern | Apa yang seterusnya dalam corak |
| `math.quantity-order` | Smallest group first | Kumpulan terkecil dahulu |
| `math.subtraction` | Taking away | Menolak |
| `math.sum-partners` | Sums and answers | Ayat matematik dan jawapannya |

### English world — 11 lesson names

| key | English | Bahasa Melayu |
| --- | --- | --- |
| `english.alphabet-order` | Alphabet Order | Urutan Abjad |
| `english.beginning-sounds` | Beginning sounds | Bunyi awal |
| `english.ending-sounds` | Ending sounds | Bunyi akhir |
| `english.letter-case` | Big and little letters | Huruf besar dan huruf kecil |
| `english.letter-recognition` | Knowing letters | Mengenal huruf |
| `english.opposites` | Opposites | Perkataan berlawanan |
| `english.plurals` | One and more than one | Satu dan lebih daripada satu |
| `english.rhyming-partners` | Words That Rhyme | Perkataan Yang Berima |
| `english.sound-partners` | Pictures and their first letter | Gambar dan huruf pertamanya |
| `english.spelling` | Finishing words | Melengkapkan perkataan |
| `english.word-build` | Building words | Membina perkataan |

### Logic world — 6 lesson names

| key | English | Bahasa Melayu |
| --- | --- | --- |
| `logic.group-partners` | Which group does it go in? | Ia masuk kumpulan yang mana? |
| `logic.odd-one-out` | Odd one out | Yang tidak sama |
| `logic.pair-partners` | Things that go together | Benda yang berpasangan |
| `logic.patterns` | Repeating patterns | Corak berulang |
| `logic.sequences` | What comes next | Apa yang seterusnya |
| `logic.sorting` | Sorting things into groups | Mengumpul benda mengikut jenis |

### Shapes & colours world — 14 lesson names

| key | English | Bahasa Melayu |
| --- | --- | --- |
| `shapes.classify` | Shape and colour | Bentuk dan warna |
| `shapes.colour-names` | Which colour? | Warna yang mana? |
| `shapes.counting` | How many? | Berapa banyak? |
| `shapes.matching` | Find the one that matches | Cari yang sepadan |
| `shapes.patterns` | What comes next? | Apa yang seterusnya? |
| `shapes.position` | Where is it? | Di manakah ia? |
| `shapes.properties` | What is it made of? | Diperbuat daripada apa? |
| `shapes.same-different` | Same or different? | Sama atau berbeza? |
| `shapes.shape-names` | Which shape? | Bentuk yang mana? |
| `shapes.shape-objects` | What shape is it? | Apakah bentuknya? |
| `shapes.shape-partners` | Things and their shapes | Benda dan bentuknya |
| `shapes.size` | Big and small | Besar dan kecil |
| `shapes.size-order` | Smallest to biggest | Terkecil ke terbesar |
| `shapes.symmetry` | The same both ways | Sama di kedua-dua belah |

### General knowledge world — 34 lesson names

| key | English | Bahasa Melayu |
| --- | --- | --- |
| `general-knowledge.animal-babies` | Animals and Their Babies | Haiwan dan Anaknya |
| `general-knowledge.animal-diet` | What Do Animals Eat? | Apa Yang Haiwan Makan? |
| `general-knowledge.animal-homes` | Where Do Animals Live? | Di Mana Haiwan Tinggal? |
| `general-knowledge.animal-names` | Which Animal Is It? | Haiwan Apakah Ini? |
| `general-knowledge.animal-sounds` | Who Made That Sound? | Siapa Yang Membuat Bunyi Itu? |
| `general-knowledge.baby-animals` | Baby Animals | Anak Haiwan |
| `general-knowledge.body-partners` | What Each Part Does | Apa Kerja Setiap Bahagian Badan |
| `general-knowledge.body-parts` | All About My Body | Semua Tentang Badan Saya |
| `general-knowledge.clothing` | Getting Dressed | Berpakaian |
| `general-knowledge.community-helpers` | People Who Help Us | Orang Yang Membantu Kita |
| `general-knowledge.day-and-night` | Day and Night | Siang dan Malam |
| `general-knowledge.day-order` | What Happens First | Apa Yang Berlaku Dahulu |
| `general-knowledge.food-names` | Food We Eat | Makanan Yang Kita Makan |
| `general-knowledge.food-origins` | Where Food Comes From | Dari Mana Datangnya Makanan |
| `general-knowledge.healthy-habits` | Looking After Myself | Menjaga Diri Sendiri |
| `general-knowledge.helper-partners` | Who Uses What | Siapa Guna Apa |
| `general-knowledge.helper-tools` | Tools of the Job | Alat Untuk Setiap Kerja |
| `general-knowledge.home-partners` | Animals and Their Homes | Haiwan dan Tempat Tinggalnya |
| `general-knowledge.hot-or-cold` | Hot or Cold? | Panas atau Sejuk? |
| `general-knowledge.land-and-water` | Land and Water | Darat dan Air |
| `general-knowledge.life-cycles` | How Things Grow | Bagaimana Ia Membesar |
| `general-knowledge.living-things` | Alive or Not Alive? | Hidup atau Bukan Hidup? |
| `general-knowledge.natural-or-made` | Made by People, or Not? | Buatan Manusia atau Bukan? |
| `general-knowledge.object-names` | Things Around the House | Benda di Sekeliling Rumah |
| `general-knowledge.object-uses` | What Is It For? | Apa Kegunaannya? |
| `general-knowledge.places` | Places We Go | Tempat Yang Kita Pergi |
| `general-knowledge.plants` | Growing Things | Tumbuh-tumbuhan |
| `general-knowledge.safety` | Staying Safe | Menjaga Keselamatan |
| `general-knowledge.seasons` | The Four Seasons | Empat Musim |
| `general-knowledge.senses` | My Five Senses | Lima Deria Saya |
| `general-knowledge.space` | Up in Space | Di Angkasa Lepas |
| `general-knowledge.vehicle-names` | Things That Go | Benda Yang Bergerak |
| `general-knowledge.vehicle-travel` | How Does It Travel? | Bagaimana Ia Bergerak? |
| `general-knowledge.weather` | What's the Weather? | Bagaimana Cuacanya? |

### Matching pairs — 4 lesson names

| key | English | Bahasa Melayu |
| --- | --- | --- |
| `match.letter-partners` | Big letters and little letters | Huruf besar dan huruf kecil |
| `match.opposite-partners` | Words and their opposites | Perkataan dan lawannya |
| `match.quantity-partners` | Numbers and how many | Nombor dan bilangannya |
| `match.sound-partners` | Animals and their sounds | Haiwan dan bunyinya |

### Discovery worlds — 4 lesson names

| key | English | Bahasa Melayu |
| --- | --- | --- |
| `discovery.animal-babies` | Grown-ups and babies | Haiwan dewasa dan anaknya |
| `discovery.animal-food` | Animals and their food | Haiwan dan makanannya |
| `discovery.colours` | Naming colours | Menamakan warna |
| `discovery.count-order` | Counting on | Mengira seterusnya |

---

## 5. Interface strings

Beyond the lesson names, `src/lib/i18n/messages/ms.ts` holds the whole
interface: the landing page, pricing, sign-up, the welcome screen, the parent
dashboard, billing states, errors. It is roughly 1,150 lines and is not
reproduced here — a reviewer should read it in the file, where the English
sits beside it in `en.ts` under the same keys.

The strings most worth a second opinion, because a parent reads them while
deciding whether to pay or while something has gone wrong:

- `landing.pricing.*`, `plan.*` (10 keys) and `join.*` (25 keys) — the money
  screens, read while a parent is deciding whether to pay
- `billing.*` (25 keys) — the eight subscription status labels (`Aktif`,
  `Memperbaharui`, `Akan tamat`, `Bayaran gagal`, `Sedang disahkan`,
  `Dibatalkan`, `Sudah tamat`, `Tiada langganan`) and the sentences describing
  what happens after cancelling
- `sub.*` (17 keys) — the screen a parent lands on when a payment failed, is
  still confirming, or has lapsed
- `auth.*` (34 keys) and `reset.*` (19 keys) — wrong password, unknown email,
  and every other sentence a parent meets at a bad moment
- `welcome.*` (13 keys) — the first thing a paying parent reads
- `parents.*` (64 keys) and `privacy.*` (64 keys) — the longest prose in the
  product, and the two screens a cautious parent reads word for word

Prices themselves (RM9.90, RM59.90) are never translated and never
reformatted. They come from one table in `src/lib/billing/subscription.ts`.

## 6. How to return this review

Any Malay string in this document can be changed by editing exactly one of two
files:

- lesson names and interface strings → `src/lib/i18n/messages/ms.ts`
- question, hint and explanation wording → `src/lib/content/i18n/phrases.ts`
  (whole sentences) or `src/lib/content/i18n/lexicon.ts` (single words)

**Do not change any key, any English string, or anything to the left of a
colon.** After a change, `npm test` must still pass — the sweeps will catch a
sentence-book line that no longer matches its English original, which is the
one way a wording change can silently take a question out of the game.
