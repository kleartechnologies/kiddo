/**
 * Everything KIDDO says in English, and the shape every other language is
 * held to.
 *
 * ## Why one flat object of dotted keys
 *
 * `en` is not just a translation — it is the *schema*. `MessageKey` is
 * `keyof typeof en`, and every other catalogue is declared as
 * `Record<MessageKey, string>`, so a missing Malay line is a build error and
 * a Malay line for a key that no longer exists is also a build error. There
 * is no runtime "fall back to English and hope somebody notices": the whole
 * point of §13 (no half-translated screens) is that mixed language must be
 * impossible rather than unlikely, and a type is the only thing that makes
 * something impossible.
 *
 * Flat, dotted keys rather than nested objects, because nesting buys tidier
 * source and costs the thing that matters — `keyof` on a nested object is a
 * union of *top-level* names, so the compiler stops checking exactly where
 * the strings start. `"landing.hero.title"` reads like a path and type-checks
 * like a name.
 *
 * ## Why the English is transcribed rather than referenced
 *
 * Every line below is the copy that was already in the component, character
 * for character — the curly apostrophes included. That is deliberate: an
 * English build after this change renders the same bytes it did before, so
 * the existing tests and the eleven `scripts/measure-*.mjs` runs are still
 * measuring the same product, and any diff they report is a real regression
 * rather than a rewrite of the marketing copy.
 *
 * ## What does not belong here
 *
 * The questions. This catalogue is *chrome* — buttons, headings, labels,
 * feedback — a few hundred strings a person can read in one sitting. The
 * ~9,200 strings inside the content packs are localized at their own seam
 * (`lib/content/i18n`), because they are generated, composed and drawn by
 * seed, and no hand-written key could name them.
 */

export const en = {
  /* ---- The language switcher itself ---------------------------------- */
  "lang.label": "Language",
  "lang.choose": "Choose a language",
  "lang.current": "Language: {name}",
  "lang.selected": "Selected",

  /* ---- Words used on more than one screen ---------------------------- */
  "common.back": "Back",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.continue": "Continue",
  "common.loading": "Loading…",
  "common.tryAgain": "Try again",
  "common.signOut": "Sign out",
  "common.oneMoment": "One moment…",
  "common.enterKiddo": "Enter KIDDO",
  "common.and": "and",
  "common.somethingWentWrong": "Something went wrong. Please try again.",

  /* ---- Landing: header and footer ------------------------------------ */
  "landing.nav.aria": "Site",
  "landing.nav.home": "KIDDO home",
  "landing.nav.howItWorks": "How it works",
  "landing.nav.pricing": "Pricing",
  "landing.nav.parents": "For parents",
  "landing.nav.privacy": "Privacy",
  "landing.nav.signIn": "Sign in",
  "landing.footer.aria": "Footer",
  "landing.footer.blurb":
    "A small, safe play world for children aged 4 to 8, so that screen time becomes time to play, learn and explore. One parent account, no adverts, nothing sold to your child.",

  /* ---- Landing: metadata --------------------------------------------- */
  "landing.meta.title": "KIDDO — Screen time doesn’t have to be wasted time",
  "landing.meta.description":
    "KIDDO makes screen time worth something for children aged 4 to 8: a garden to count in, animals to guide home, and a storybook full of words. One subscription for the parent; no adverts, nothing to buy inside.",
  "landing.meta.ogDescription":
    "Your child still enjoys screen time — while learning, trying activities and discovering something new.",
  "landing.meta.twitterDescription":
    "Screen time that is worth something, for children aged 4 to 8.",

  /* ---- Landing: hero -------------------------------------------------- */
  "landing.hero.eyebrow": "For children aged 4 to 8",
  "landing.hero.title": "Screen time doesn’t have to be wasted time.",
  "landing.hero.body":
    "With KIDDO, your child still enjoys screen time — while learning, trying activities and discovering something new.",
  "landing.hero.cta": "Try KIDDO",
  "landing.hero.secondary": "See how KIDDO works",
  "landing.hero.trustAria": "What you get",
  "landing.hero.trust.1": "No adverts",
  "landing.hero.trust.2": "Nothing sold to your child",
  "landing.hero.trust.3": "From {monthly} a month, cancel anytime",

  /* ---- Landing: the pain points --------------------------------------- */
  "landing.pain.eyebrow": "This might be your house too",
  "landing.pain.title": "When a child is already used to the screen…",
  "landing.pain.body":
    "Sometimes we hand over the screen just to get ten quiet minutes. But when it is time to stop, everything becomes harder.",
  "landing.pain.phone.title": "They keep asking for the phone",
  "landing.pain.phone.body":
    "The phone has barely been put down and they are already asking when they can have it again.",
  "landing.pain.phone.alt":
    "A small child reaching out for a phone held by an adult in a living room.",
  "landing.pain.videos.title": "One video after another",
  "landing.pain.videos.body":
    "One video becomes two, two becomes ten. Suddenly a long time has gone by.",
  "landing.pain.videos.alt":
    "A child sitting close to a tablet, watching one cartoon video after another.",
  "landing.pain.torn.title": "Parents feel torn about it too",
  "landing.pain.torn.body":
    "You want your child to grow up able to use technology, and at the same time you worry about what they are watching and doing.",
  "landing.pain.torn.alt":
    "A mother watching her child use a phone, hesitating about whether to say something.",
  "landing.pain.stop.title": "Stopping is the hard part",
  "landing.pain.stop.body":
    "When it is time to switch the screen off, it turns into a tantrum, tears, or “five more minutes”.",
  "landing.pain.stop.alt":
    "A child holding on to a tablet, unwilling to let go when it is time to stop.",

  /* ---- Landing: the shift ---------------------------------------------- */
  "landing.shift.eyebrow": "There is another way",
  "landing.shift.title":
    "The problem isn’t screen time. It’s what a child does with it.",
  "landing.shift.body":
    "Technology itself isn’t the enemy. What matters is how the time in front of it is spent.",
  "landing.shift.listAria": "From what, to what",
  "landing.shift.fromLabel": "Instead of",
  "landing.shift.toLabel": "This",
  "landing.shift.from.1": "One video pulling in the next",
  "landing.shift.to.1": "A short round with an ending",
  "landing.shift.from.2": "Scrolling with nothing to stop for",
  "landing.shift.to.2": "Finish one activity, then put it down",
  "landing.shift.from.3": "Hard to tell what they actually did",
  "landing.shift.to.3": "A parent can see what was explored",
  "landing.shift.transition":
    "Instead of only watching and scrolling, let screen time be time for a child to play, learn and explore.",

  /* ---- Landing: meet KIDDO, and the three worlds ----------------------- */
  "landing.meet.eyebrow": "Not another video app",
  "landing.meet.title": "Meet KIDDO",
  "landing.meet.body":
    "KIDDO makes screen time worth something, through adventures, activities and learning made for children.",
  "landing.meet.child": "To your child, it feels like playing.",
  "landing.meet.parent": "You know they are learning.",
  "landing.meet.worldsLead":
    "Three little worlds, each with its own place and its own friend.",
  "landing.worlds.number.counting": "World one",
  "landing.worlds.number.animals": "World two",
  "landing.worlds.number.words": "World three",
  "landing.worlds.with": "with {name}",
  "landing.worlds.activitiesIn": "Activities in {world}",
  "landing.worlds.inside.counting":
    "Children discover numbers through the apples, flowers and pebbles in a little garden.",
  "landing.worlds.inside.animals":
    "Children meet the animals, learn where each one lives, and walk them home across the land.",
  "landing.worlds.inside.words":
    "Children open a storybook and find letters, rhymes and sounds growing on its pages.",
  "landing.worlds.shot.counting":
    "Count the Apples: KIDDO asks how many can you count, above a garden where number signs stand in the grass.",
  "landing.worlds.shot.animals":
    "Find the Home: animals on one side of the land, their homes on the other, waiting to be joined.",
  "landing.worlds.shot.words":
    "Rhyming Friends: two pages of an open storybook with words on each side to match with a ribbon.",

  /* ---- Landing: the rest of the library -------------------------------- */
  "landing.more.eyebrow": "Not just one game",
  "landing.more.title": "Plenty More to Explore",
  "landing.more.body":
    "Beyond the three worlds there are {count} more games waiting on your child's home screen, each with its own friend, its own pictures and its own activities.",
  "landing.more.listAria": "The other games inside KIDDO",

  /* ---- Landing: how it works ------------------------------------------ */
  "landing.how.eyebrow": "How it works",
  "landing.how.title": "Four steps, and that is the whole of it.",
  "landing.how.body":
    "A child can start on their own. No long tutorial, and nothing for them to sign in to.",
  "landing.how.step1.title": "Your child picks an adventure",
  "landing.how.step1.detail":
    "Open the home screen and choose which world to go into today.",
  "landing.how.step2.title": "They explore and finish activities",
  "landing.how.step2.detail":
    "Every activity is a short round of five questions, set inside that world.",
  "landing.how.step3.title": "They learn while they play",
  "landing.how.step3.detail":
    "Counting, matching and words — and every finished activity stays in its world.",
  "landing.how.step4.title": "You can see how they are getting on",
  "landing.how.step4.detail":
    "The parent area lists what was explored, what comes next and what it was practising.",
  "landing.how.doorsAria": "Example world doors after a few visits",
  "landing.how.doorsCaption":
    "An example after a few visits: one world finished, one part-way, one still new. The ringed door is the one KIDDO would suggest next.",

  /* ---- Landing: why parents choose KIDDO ------------------------------- */
  "landing.why.eyebrow": "Why parents choose KIDDO",
  "landing.why.title": "Calmer for you. Worth more for your child.",
  "landing.why.body":
    "The screen time still happens. What changes is what happens inside it.",
  "landing.why.1.title": "No fight over screen time every day.",
  "landing.why.1.detail":
    "Every round has an ending, which makes “one more, then we stop” an easier thing to say.",
  "landing.why.2.title": "Your child still gets something they enjoy.",
  "landing.why.2.detail": "Worlds, friends and activities they open themselves.",
  "landing.why.3.title": "Screen time becomes time to learn and explore.",
  "landing.why.3.detail":
    "Numbers, animals and words — played rather than drilled.",
  "landing.why.4.title": "You feel better about what they are doing.",
  "landing.why.4.detail":
    "No adverts, no videos that play by themselves, and nothing to buy inside.",
  "landing.why.cta": "See the parent area",
  "landing.why.privacyLink": "What KIDDO stores, and what it doesn’t",
  "landing.why.shotAlt":
    "The KIDDO parent dashboard: a greeting, the child's journey in three numbers, and a progress card for each world.",
  "landing.why.shotCaption": "The parent area, part-way through a journey.",

  /* ---- Landing: what parents say --------------------------------------- */
  "landing.voices.eyebrow": "From parents",
  "landing.voices.title": "What parents say after trying it.",
  "landing.voices.body": "In their own words, left as they wrote them.",
  "landing.voices.aria": "Parent testimonials",
  "landing.voices.swipe": "Swipe to read more",

  /* ---- Landing: pricing ------------------------------------------------ */
  "landing.pricing.eyebrow": "Pricing",
  "landing.pricing.title": "Make screen time worth something.",
  "landing.pricing.body":
    "A plan for you, the grown-up. Your child never signs in, never sees a price and is never asked to buy anything.",
  "landing.pricing.included.1": "Every world, every door and every game",
  "landing.pricing.included.2":
    "One child’s journey, kept and carried between devices",
  "landing.pricing.included.3":
    "The parent area, with what was explored and what is next",
  "landing.pricing.included.4": "No adverts and nothing to buy inside",
  "landing.pricing.saving": "Save {saving}% compared with paying monthly",
  "landing.pricing.footnote":
    "Cancel anytime from the parent area. Payments are handled by Stripe — KIDDO never sees or stores your card.",

  /* ---- Landing: questions parents ask ---------------------------------- */
  "landing.faq.eyebrow": "Common questions",
  "landing.faq.title": "The things parents ask first.",
  "landing.faq.q1": "Is KIDDO right for my child’s age?",
  "landing.faq.a1":
    "KIDDO is made for children aged 4 to 8. Every activity comes in three sizes — Easy, Medium and Hard — so a child who is just starting and a child who has done it before can play the same activity.",
  "landing.faq.q2": "Does KIDDO replace school or formal learning?",
  "landing.faq.a2":
    "No. KIDDO is not a school and not a syllabus. It is a play world where children count, match and find words while exploring — something to do during screen time, not a substitute for lessons.",
  "landing.faq.q3": "Does my child need a tablet?",
  "landing.faq.a3":
    "No. KIDDO opens straight in the browser — phone, tablet or laptop — with no app to download. A bigger screen is more comfortable, but a phone works.",
  "landing.faq.q4": "How does KIDDO make screen time more positive?",
  "landing.faq.a4":
    "Every activity is a short round of five questions with an ending, so there is always a good moment to stop. There are no adverts, no videos that play by themselves and nothing to buy. What a child finishes stays in its world, and you can see what was explored in the parent area.",
  "landing.faq.q5": "What does KIDDO cost?",
  "landing.faq.a5":
    "{monthly} a month or {yearly} a year, and one subscription opens all of KIDDO. Cancel anytime from the parent area.",

  /* ---- Landing: closing ------------------------------------------------ */
  "landing.closing.title":
    "You don’t have to take screen time away. Make it worth something.",
  "landing.closing.body":
    "Let your child explore, play and learn — with a better kind of screen time.",
  "landing.closing.cta": "Start with KIDDO",

  /* ---- The worlds, as places a child goes ---------------------------- */
  "world.meadow.name": "Meadow",
  "world.counting.name": "Counting Garden",
  "world.counting.line": "Count what grows in the garden.",
  "world.counting.blurb":
    "Counting things, knowing numbers and finding the one that is asked for.",
  "world.animals.name": "Animal Adventure",
  "world.animals.line": "Help the animals find their homes.",
  "world.animals.blurb":
    "Animal names, sounds and babies, where they live and what they eat.",
  "world.words.name": "Word World",
  "world.words.line": "Open the book and find the words.",
  "world.words.blurb": "Letters, rhymes, and the sounds at the start and end of words.",

  /* ---- The nine doors ------------------------------------------------- */
  "door.counting.count-the-apples.title": "Count the Apples",
  "door.counting.count-the-apples.blurb": "Count the things in the garden and pick how many.",
  "door.counting.count-the-apples.intro": "Let's count in the garden!",
  "door.counting.count-the-apples.done": "You counted every single one!",
  "door.counting.count-the-flowers.title": "Count the Flowers",
  "door.counting.count-the-flowers.blurb":
    "Bigger groups to count, and a few more to choose from.",
  "door.counting.count-the-flowers.intro": "More things have grown! Let's count them.",
  "door.counting.count-the-flowers.done": "What a lot of counting. Brilliant!",
  "door.counting.find-the-number.title": "Find the Number",
  "door.counting.find-the-number.blurb":
    "Know the numbers by name and find the one KIDDO asks for.",
  "door.counting.find-the-number.intro": "Can you find the number I say?",
  "door.counting.find-the-number.done": "You know your numbers!",
  "door.animals.find-the-home.title": "Find the Home",
  "door.animals.find-the-home.blurb":
    "Join each animal to the place it lives, and watch it go home.",
  "door.animals.find-the-home.intro": "Help each animal find its way home!",
  "door.animals.find-the-home.done": "Every animal is home safe and sound!",
  "door.animals.who-lives-here.title": "Who Lives Here?",
  "door.animals.who-lives-here.blurb":
    "Name the animals, hear their sounds and meet their babies.",
  "door.animals.who-lives-here.intro": "Who's that over there? Let's find out!",
  "door.animals.who-lives-here.done": "You know all the animals!",
  "door.animals.land-or-sea.title": "Land or Sea?",
  "door.animals.land-or-sea.blurb": "Where things live, what they eat, and land and water.",
  "door.animals.land-or-sea.intro":
    "Some live on the land, some in the water. Which is which?",
  "door.animals.land-or-sea.done": "Land, sea and sky — you found them all!",
  "door.words.alphabet-adventure.title": "Alphabet Adventure",
  "door.words.alphabet-adventure.blurb":
    "Find the letters KIDDO says, big ones and little ones.",
  "door.words.alphabet-adventure.intro":
    "Let's open the word book and find some letters!",
  "door.words.alphabet-adventure.done": "You found every letter!",
  "door.words.rhyming-friends.title": "Rhyming Friends",
  "door.words.rhyming-friends.blurb": "Join the words that sound the same at the end.",
  "door.words.rhyming-friends.intro": "Cat, hat, bat! Let's find the words that rhyme.",
  "door.words.rhyming-friends.done": "Every word found its rhyming friend!",
  "door.words.word-discovery.title": "Word Discovery",
  "door.words.word-discovery.blurb": "Beginning sounds, ending sounds and finishing words.",
  "door.words.word-discovery.intro": "Listen to the sounds. What word is hiding?",
  "door.words.word-discovery.done": "You discovered so many words!",

  /* ---- How hard a door is played at ----------------------------------- */
  "tier.1": "Easy",
  "tier.2": "Medium",
  "tier.3": "Hard",


  /* ---- The lessons a world draws from, for the parent dashboard --------
     Grown-up facing, never shown to the child, and named from the activity
     id by `conceptKey` — the questions themselves carry no words. Every
     activity in the registry is here, in both languages; `tests/i18n.test.ts`
     fails if one is not. */
  "concept.math.counting": "Counting",
  "concept.math.counting-objects": "How Many Things?",
  "concept.math.number-recognition": "Knowing numbers",
  "concept.math.quantity-order": "Smallest group first",
  "concept.math.comparison": "Bigger or smaller",
  "concept.math.before-and-after": "Before and after",
  "concept.math.addition": "Adding up",
  "concept.math.subtraction": "Taking away",
  "concept.math.sum-partners": "Sums and answers",
  "concept.math.number-sequence": "What comes next",
  "concept.math.missing-number": "The missing number",
  "concept.math.number-order": "Numbers In Order",
  "concept.math.pattern": "What comes next in the pattern",
  "concept.english.letter-recognition": "Knowing letters",
  "concept.english.letter-case": "Big and little letters",
  "concept.english.alphabet-order": "Alphabet Order",
  "concept.english.beginning-sounds": "Beginning sounds",
  "concept.english.sound-partners": "Pictures and their first letter",
  "concept.english.ending-sounds": "Ending sounds",
  "concept.english.rhyming-partners": "Words That Rhyme",
  "concept.english.spelling": "Finishing words",
  "concept.english.word-build": "Building words",
  "concept.english.plurals": "One and more than one",
  "concept.english.opposites": "Opposites",
  "concept.logic.patterns": "Repeating patterns",
  "concept.logic.odd-one-out": "Odd one out",
  "concept.logic.sorting": "Sorting things into groups",
  "concept.logic.group-partners": "Which group does it go in?",
  "concept.logic.sequences": "What comes next",
  "concept.logic.pair-partners": "Things that go together",
  "concept.shapes.shape-names": "Which shape?",
  "concept.shapes.colour-names": "Which colour?",
  "concept.shapes.shape-objects": "What shape is it?",
  "concept.shapes.matching": "Find the one that matches",
  "concept.shapes.same-different": "Same or different?",
  "concept.shapes.size": "Big and small",
  "concept.shapes.size-order": "Smallest to biggest",
  "concept.shapes.counting": "How many?",
  "concept.shapes.classify": "Shape and colour",
  "concept.shapes.properties": "What is it made of?",
  "concept.shapes.shape-partners": "Things and their shapes",
  "concept.shapes.position": "Where is it?",
  "concept.shapes.symmetry": "The same both ways",
  "concept.shapes.patterns": "What comes next?",
  "concept.general-knowledge.animal-names": "Which Animal Is It?",
  "concept.general-knowledge.animal-sounds": "Who Made That Sound?",
  "concept.general-knowledge.baby-animals": "Baby Animals",
  "concept.general-knowledge.animal-babies": "Animals and Their Babies",
  "concept.general-knowledge.animal-diet": "What Do Animals Eat?",
  "concept.general-knowledge.animal-homes": "Where Do Animals Live?",
  "concept.general-knowledge.home-partners": "Animals and Their Homes",
  "concept.general-knowledge.plants": "Growing Things",
  "concept.general-knowledge.living-things": "Alive or Not Alive?",
  "concept.general-knowledge.natural-or-made": "Made by People, or Not?",
  "concept.general-knowledge.life-cycles": "How Things Grow",
  "concept.general-knowledge.weather": "What's the Weather?",
  "concept.general-knowledge.seasons": "The Four Seasons",
  "concept.general-knowledge.hot-or-cold": "Hot or Cold?",
  "concept.general-knowledge.food-names": "Food We Eat",
  "concept.general-knowledge.food-origins": "Where Food Comes From",
  "concept.general-knowledge.object-names": "Things Around the House",
  "concept.general-knowledge.object-uses": "What Is It For?",
  "concept.general-knowledge.clothing": "Getting Dressed",
  "concept.general-knowledge.vehicle-names": "Things That Go",
  "concept.general-knowledge.vehicle-travel": "How Does It Travel?",
  "concept.general-knowledge.community-helpers": "People Who Help Us",
  "concept.general-knowledge.helper-tools": "Tools of the Job",
  "concept.general-knowledge.helper-partners": "Who Uses What",
  "concept.general-knowledge.places": "Places We Go",
  "concept.general-knowledge.body-parts": "All About My Body",
  "concept.general-knowledge.senses": "My Five Senses",
  "concept.general-knowledge.body-partners": "What Each Part Does",
  "concept.general-knowledge.healthy-habits": "Looking After Myself",
  "concept.general-knowledge.space": "Up in Space",
  "concept.general-knowledge.day-and-night": "Day and Night",
  "concept.general-knowledge.day-order": "What Happens First",
  "concept.general-knowledge.land-and-water": "Land and Water",
  "concept.general-knowledge.safety": "Staying Safe",
  "concept.match.letter-partners": "Big letters and little letters",
  "concept.match.quantity-partners": "Numbers and how many",
  "concept.match.opposite-partners": "Words and their opposites",
  "concept.match.sound-partners": "Animals and their sounds",
  "concept.discovery.colours": "Naming colours",
  "concept.discovery.animal-food": "Animals and their food",
  "concept.discovery.animal-babies": "Grown-ups and babies",
  "concept.discovery.count-order": "Counting on",

  /* ---- What each world gives back ------------------------------------- */
  "reward.meadow.one": "flower",
  "reward.meadow.many": "flowers",
  "reward.meadow.earned": "A flower for the meadow!",
  "reward.counting.one": "flower",
  "reward.counting.many": "flowers",
  "reward.counting.earned": "A new flower has grown in your garden!",
  "reward.animals.one": "animal",
  "reward.animals.many": "animals",
  "reward.animals.earned": "A new animal friend has joined your adventure!",
  "reward.words.one": "page",
  "reward.words.many": "pages",
  "reward.words.earned": "A new page has been added to your storybook!",

  /* ---- KIDDO & Friends. The names are never translated. --------------- */
  "character.kiddo.blurb": "A round, big-eared creature that belongs to no species.",
  "character.foxy.blurb": "A clever, curious fox.",
  "character.bibi.blurb": "A cheerful rabbit.",
  "character.pip.blurb": "A funny little frog.",
  "character.wally.blurb": "A friendly little whale.",

  /* ---- The two plans -------------------------------------------------- */
  "plan.yearly.name": "Yearly",
  "plan.yearly.per": "year",
  "plan.yearly.note": "Best value",
  "plan.yearly.blurb": "{perMonth} a month, billed once a year",
  "plan.yearly.cta": "Try KIDDO now",
  "plan.monthly.name": "Monthly",
  "plan.monthly.per": "month",
  "plan.monthly.note": "",
  "plan.monthly.blurb": "Flexible monthly access",
  "plan.monthly.cta": "Choose the monthly plan",

  /* ---- What state the subscription is in, in one word ----------------- */
  "billing.status.active": "Active",
  "billing.status.renewing": "Renewing",
  "billing.status.ending": "Ending",
  "billing.status.past_due": "Payment failed",
  "billing.status.incomplete": "Confirming",
  "billing.status.cancelled": "Cancelled",
  "billing.status.expired": "Ended",
  "billing.status.none": "No subscription",

  /* ---- ...and in one sentence a parent can act on --------------------- */
  "billing.describe.renewing":
    "Your subscription is being renewed. If this takes more than a day, please check your payment details.",
  "billing.describe.endingOn": "Cancelled. KIDDO stays open until {when}.",
  "billing.describe.ending":
    "Cancelled. KIDDO stays open until the end of the paid period.",
  "billing.describe.planRenews": "{plan} plan, {price} a {per}. Renews on {when}.",
  "billing.describe.plan": "{plan} plan, {price} a {per}.",
  "billing.describe.activeRenews": "Active. Renews on {when}.",
  "billing.describe.active": "Active.",
  "billing.describe.past_due":
    "The last payment didn’t go through, so KIDDO is paused. Update your payment details to carry on.",
  "billing.describe.incomplete": "Your payment is still being confirmed.",
  "billing.describe.endedOn": "Your subscription ended on {when}.",
  "billing.describe.ended": "Your subscription has ended.",
  "billing.describe.none": "No subscription yet.",

  /* ---- Signing in, and making an account ------------------------------ */
  "auth.signin.title": "Sign in to KIDDO",
  "auth.signin.blurb": "Your child’s progress and name are kept with your account.",
  "auth.signup.title": "Create a KIDDO account",
  "auth.signup.blurb":
    "An account for you, the grown-up. Your child never signs in — they just play, and their progress follows them to any device you sign in on.",
  "auth.forgot.title": "Forgot your password?",
  "auth.forgot.blurb":
    "Type the email your KIDDO account is under and we’ll send a link to choose a new one.",
  /* Google's sign-in branding permits "Sign in with", "Sign up with" and
     "Continue with". One button does both jobs here, so "Continue with"
     is the only one of the three that is true in both modes. */
  "auth.google.continue": "Continue with Google",
  /* On a phone that leaves the page for Google, the button says where it is
     going rather than "one moment" — the page is about to disappear and the
     parent should not think KIDDO crashed. */
  "auth.google.leaving": "Taking you to Google…",
  "auth.google.or": "or",
  "auth.field.email": "Your email",
  "auth.field.password": "Password",
  "auth.field.confirm": "Confirm password",
  "auth.field.passwordHint": "At least 6 characters.",
  "auth.forgotLink": "Forgot password?",
  "auth.submit.busy": "One moment…",
  "auth.submit.forgot": "Send reset link",
  "auth.submit.signup": "Create account",
  "auth.submit.signin": "Sign in",
  "auth.switch.rememberedIt": "Remembered it?",
  "auth.switch.haveAccount": "Already have an account?",
  "auth.switch.newHere": "New to KIDDO?",
  "auth.switch.backToSignIn": "Back to sign in",
  "auth.switch.signInInstead": "Sign in instead",
  "auth.switch.createAccount": "Create an account",
  "auth.sent.title": "Check your email",
  "auth.sent.body":
    "If there is a KIDDO account for {email}, a link to choose a new password is on its way. It only works once and expires after a while.",

  /* ---- ...and what to say when it does not work ----------------------- */
  "auth.error.mismatch": "Those two passwords don’t match.",
  "auth.error.sameEitherWay": "That email and password don’t match.",
  "auth.error.invalid-email": "That doesn’t look like an email address.",
  "auth.error.weak-password": "Please choose a password with at least 6 characters.",
  "auth.error.email-in-use":
    "KIDDO couldn’t create an account with that email. If you already have one, sign in — or ask for a new password below.",
  "auth.error.too-many-attempts": "Too many tries for now. Please wait a little and try again.",
  "auth.error.offline": "KIDDO can’t reach the internet right now. Check the connection and try again.",
  "auth.error.bad-link": "That link has expired. Ask for a new one below.",
  "auth.error.recent-login": "Please sign in again first.",
  "auth.error.billing-unavailable": "Subscriptions aren’t set up on this KIDDO yet.",
  "auth.error.popup-blocked":
    "Your browser stopped the Google window from opening. Allow pop-ups for KIDDO, or use your email and a password below.",
  "auth.error.different-sign-in":
    "That email already signs in a different way. Try your email and password below.",
  /* KIDDO gave up waiting. It does not say what went wrong because it does
     not know — that is what a timeout means — but it does say that trying
     again is worth doing, and it names the other road on the same card. */
  "auth.error.timed-out":
    "That took too long, so KIDDO stopped waiting. Please try again, or use your email and password.",
  "auth.error.unknown": "Something went wrong. Please try again.",

  /* ---- /join: the road from choosing a plan to paying for it ---------- */
  "join.unavailable.title": "Subscriptions aren’t set up here yet",
  "join.unavailable.body":
    "This copy of KIDDO is running without accounts, so there is nothing to pay for yet. Everything a child plays stays on this device.",
  "join.unavailable.cta": "Open KIDDO",
  "join.subscribed.title": "You already have KIDDO",
  "join.subscribed.body":
    "Your subscription is active, so there is nothing to pay. Everything is open.",
  "join.subscribed.parents": "Parent area",
  "join.trouble.title": "We couldn’t reach your account",
  "join.trouble.body": "Check your connection and try again — nothing has been charged.",
  "join.beforeStripe":
    "You’ll be taken to Stripe to pay as soon as your account exists. Nothing is charged until you finish there, and KIDDO never sees your card.",
  "join.checkout.starting": "Taking you to Stripe…",
  "join.checkout.ready": "Ready when you are",
  "join.checkout.signedInAs": "Signed in as {email}. The next step is Stripe’s secure checkout.",
  "join.checkout.yourAccount": "your account",
  "join.checkout.cta": "Continue to checkout",
  "join.checkout.differentAccount": "Use a different account",
  "join.plan.eyebrow": "Your plan",
  "join.plan.heading": "{name} · {price} a {per}",
  "join.plan.yearlyBlurb": "{blurb} — {saving}% less than paying monthly.",
  "join.plan.monthlyBlurb": "{blurb}. Cancel anytime.",
  "join.plan.legend": "Choose a plan",
  "join.plan.option": "{name} · {price}/{per}",
  "join.plan.compare": "Compare the plans again",
  "join.error.billing-unavailable":
    "Subscriptions aren’t set up on this KIDDO yet. Please try again later.",
  "join.error.no-account": "Please sign in again and then choose a plan.",
  "join.error.checkout": "Something went wrong starting the payment. Please try again.",

  /* ---- The subscription gate ------------------------------------------ */
  "sub.confirming.title": "We’re confirming your KIDDO access",
  "sub.confirming.body":
    "Thank you! Your payment went through to Stripe and KIDDO is opening up. This usually takes a few seconds — there’s nothing you need to do.",
  "sub.headline.past_due": "A payment didn’t go through",
  "sub.headline.returning": "Welcome back to KIDDO",
  "sub.headline.incomplete": "Your payment is still being confirmed",
  "sub.headline.ready": "Your child’s adventure is ready.",
  "sub.lead.past_due":
    "KIDDO is paused until the payment goes through. Updating the card in billing usually sorts it out straight away.",
  "sub.lead.ended":
    "Your subscription has ended. Choose a plan and everything your child played is right where they left it.",
  "sub.lead.incomplete":
    "Stripe hasn’t confirmed the first payment yet. If it was declined, you can try again below; a pending payment opens KIDDO as soon as it clears.",
  "sub.lead.stale":
    "We haven’t heard back from the payment yet. If your card was charged, KIDDO will open on its own shortly — please don’t pay twice. If the payment didn’t go through, you can try again below.",
  "sub.lead.default":
    "One subscription opens every world, every game and every new story for your child. No ads, nothing to buy inside.",
  "sub.cancelledNote": "No payment was made. Whenever you’re ready, the plans are below.",
  "sub.updatePayment": "Update payment details",
  "sub.start": "Start KIDDO",
  "sub.footnote": "Cancel anytime. Payments are handled by Stripe.",
  "sub.billingHistory": "Billing history",
  "sub.error.portal": "KIDDO couldn’t open billing just now. Please try again.",

  /* ---- /welcome: back from Stripe ------------------------------------- */
  "welcome.title": "Welcome to KIDDO! 🎉",
  "welcome.body": "Your KIDDO adventure starts here.",
  "welcome.who": "Who’s playing?",
  "welcome.toParents": "Go to the parent area",
  "welcome.signedOut.title": "Sign in to finish",
  "welcome.signedOut.body":
    "We can’t see your account on this device, so KIDDO can’t check your subscription. Sign in and the parent area will show exactly where things stand.",
  "welcome.cancelled.title": "No payment was made",
  "welcome.cancelled.body":
    "You left the checkout before paying, and nothing was charged. The plans are waiting whenever you are.",
  "welcome.cancelled.cta": "See the plans",
  "welcome.confirming.title": "We’re confirming your KIDDO access",
  "welcome.confirming.body":
    "Thank you! Your payment reached Stripe and KIDDO is opening up. This usually takes a few seconds — there’s nothing you need to do, and this page will move on by itself.",
  "welcome.waiting.title": "Still confirming",
  "welcome.waiting.body":
    "We haven’t heard back about the payment yet. If your card was charged, KIDDO will open on its own shortly — please don’t pay twice. The parent area always shows the current state of your subscription.",

  /* ---- The parent area's own gate ------------------------------------- */
  "parents.gate.deviceNote":
    "Anything your child has already played on this device is kept, and joins your account the first time you sign in here.",
  "parents.gate.trouble":
    "We couldn’t reach your account just now. Check your connection and try again.",
  "parents.gate.opening": "Opening the parent area…",

  /* ---- The one screen a child may meet the account on ------------------ */
  "play.gate.askGrownUp": "Ask a grown-up to open KIDDO!",
  "play.gate.forGrownUps": "For grown-ups",

  /* ---- Who is playing? ------------------------------------------------- */
  "onboarding.title": "Welcome to KIDDO",
  "onboarding.blurb":
    "One last thing: what’s your child’s first name? KIDDO uses it to say hello. Only the first word is kept.",
  "onboarding.field": "Your child’s first name",
  "onboarding.error.empty": "Please type your child’s first name.",
  "onboarding.error.save": "KIDDO couldn’t save that just now. Please try again.",

  /* ---- The account card ------------------------------------------------ */
  "account.title": "Your account",
  "account.sync.error": "The latest progress has not reached your account yet.",
  "account.sync.saving": "Saving progress…",
  "account.sync.synced": "Progress is saved to your account.",
  "account.sync.device": "Progress is on this device for now.",
  "account.verify.sent": "Verification email sent. Open the link in it, then come back here.",
  "account.verify.still": "Not verified yet. Open the link in the email, then check again.",
  "account.verify.failed": "Couldn’t send the email just now. Please try again.",
  "account.verify.unverified": "Your email isn’t verified yet.",
  "account.verify.sending": "Sending…",
  "account.verify.sendAgain": "Send again",
  "account.verify.send": "Send verification email",
  "account.verify.checking": "Checking…",
  "account.verify.check": "I’ve verified",
  "account.delete.open": "Delete account",
  "account.delete.title": "Delete your KIDDO account?",
  "account.delete.body":
    "Your sign-in, your child’s name and every bit of progress will be removed from KIDDO, and any subscription is cancelled so nothing more is charged. This cannot be undone.",
  "account.delete.busy": "Deleting…",
  "account.delete.error.recent-login":
    "For safety, please sign out, sign in again, and then delete the account.",
  "account.delete.error.unknown": "KIDDO couldn’t delete the account just now. Please try again.",

  /* ---- The billing card ------------------------------------------------ */
  "billing.title": "Your subscription",
  "billing.confirmed": "You’re all set — KIDDO is open for your child.",
  "billing.planLine": "{name} · {price}/{per}",
  "billing.unknownPlan": "KIDDO subscription",
  "billing.manage": "Manage subscription",

  /* ---- Where the emailed links land ----------------------------------- */
  "reset.title.reset": "Choose a new password",
  "reset.title.doneReset": "Your password is changed",
  "reset.title.doneVerify": "Your email is verified",
  "reset.title.badLink": "This link doesn’t work any more",
  "reset.title.offline": "KIDDO can’t reach the internet",
  "reset.title.unavailable": "Accounts aren’t set up on this KIDDO",
  "reset.body.checking": "Checking your link.",
  "reset.body.reset": "For {email}. At least 6 characters.",
  "reset.body.doneReset": "Sign in with it to get back to your child’s KIDDO.",
  "reset.body.doneVerify": "Thank you. You can carry on in the parent area.",
  "reset.body.badLink":
    "Password links expire after a while and only work once. Go to sign in and choose “Forgot password?” to get a new one.",
  "reset.body.offline": "Check the connection and open the link from your email again.",
  "reset.body.unavailable":
    "This KIDDO keeps everything on the device, so there is no password to reset.",
  "reset.field": "New password",
  "reset.submit": "Save new password",
  "reset.back": "Go to sign in",
  "reset.orSignIn": "Or {link}.",
  "reset.orSignIn.link": "go to sign in",
  "reset.error.badLink": "This link has expired or has already been used.",

  /* ---- What KIDDO says when the child arrives -------------------------- */
  "greeting.hello.1": "Hi, {name}!",
  "greeting.hello.2": "Hey, {name}!",
  "greeting.hello.3": "Welcome back, {name}!",
  "greeting.hello.4": "Yay, {name} is here!",
  "greeting.invite.1": "What do you want to play?",
  "greeting.invite.2": "Ready to play?",
  "greeting.invite.3": "What shall we discover today?",
  "greeting.invite.4": "Where should we explore?",
  "greeting.fallback.hello": "Hi!",
  "greeting.fallback.invite": "What do you want to play?",

  /* ---- Page metadata, evaluated at build time (see app/page.tsx) ------- */
  "meta.parents.title": "For grown-ups",
  "meta.join.title": "Start KIDDO",
  "meta.join.description": "Choose a plan and create your KIDDO parent account.",
  "meta.welcome.title": "Welcome",
  "meta.reset.title": "Reset password",
  "meta.privacy.title": "Privacy",
  "meta.privacy.description":
    "What KIDDO stores on your device and in a parent account, why, and what it does not collect.",

  /* ---- The chrome around a page --------------------------------------- */
  "page.parentArea": "Parent area",
  "page.openKiddo": "Open KIDDO",
  "page.step1": "Step 1 of 2",
  "page.step2": "Step 2 of 2",
  "notfound.title": "Hmm, there is nothing here!",
  "notfound.cta": "Back to KIDDO World",

  /* ---- The parent dashboard ------------------------------------------- */
  "parents.greeting.hello": "Hello",
  "parents.greeting.morning": "Good morning",
  "parents.greeting.afternoon": "Good afternoon",
  "parents.greeting.evening": "Good evening",
  "parents.child.showing": "Showing {name}’s progress.",
  "parents.child.none": "No child name set yet.",
  "parents.child.change": "Change name",
  "parents.child.add": "Add a name",
  "parents.journey.title": "Your child’s KIDDO journey",
  "parents.journey.titleNamed": "{name}’s KIDDO journey",
  "parents.journey.note":
    "Short rounds, no scores. Every finished activity becomes a keepsake in its world, and nothing is ever locked or taken away.",
  "parents.stat.activities": "activities explored",
  "parents.stat.keepsakes": "keepsakes discovered",
  "parents.stat.worlds": "worlds visited",
  "parents.overview.none": "The adventure has not started yet.",
  "parents.overview.all": "Every activity completed across all {worlds} worlds.",
  "parents.overview.line": "{activities} completed across {worlds}.",
  "parents.count.activity": "1 activity",
  "parents.count.activities": "{n} activities",
  "parents.count.world": "1 world",
  "parents.count.worlds": "{n} worlds",
  "parents.section.worlds": "World progress",
  "parents.section.recent": "Recently explored",
  "parents.section.next": "Next up",
  "parents.section.practising": "What they’re practising",
  "parents.section.settings": "Settings",
  "parents.world.complete": "Complete",
  "parents.world.started": "In progress",
  "parents.world.untouched": "Not started",
  "parents.world.progressAria": "{world} progress",
  "parents.world.firstReward": "Each finished activity grows a {reward} here.",
  "parents.world.collected": "{done} {reward} collected.",
  "parents.viewWorld": "View {world}",
  "parents.progress.all": "All {total} activities explored",
  "parents.progress.none": "Not explored yet · {total} activities",
  "parents.progress.some": "{done} of {total} activities explored",
  "parents.recent.line": "{world} · {reward} earned",
  "parents.recent.empty": "Nothing finished yet. Finished activities will appear here, newest first.",
  "parents.tiers.none": "Not completed yet.",
  "parents.tiers.done": "Completed {tiers}.",
  "parents.next.first": "First stop",
  "parents.next.new": "New",
  "parents.next.line": "{world} · {mode}",
  "parents.next.note":
    "This is the same activity KIDDO will suggest on your child’s home screen. Opening it here starts the round, so hand the device over first.",
  "parents.next.noteNamed":
    "This is the same activity KIDDO will suggest on {name}’s home screen. Opening it here starts the round, so hand the device over first.",
  "parents.next.open": "Open activity",
  "parents.next.done":
    "Every activity in every world has been explored. Any of them can be played again, any time — and new worlds are on the way.",
  "parents.practising.note":
    "Each activity draws its questions from these skills. A tick means an activity that practises it has been finished at least once.",
  "parents.practising.yes": " (practised)",
  "parents.practising.no": " (not yet)",
  "parents.settings.resetTitle": "Start the adventure over",
  "parents.settings.resetBody":
    "Clears every finished activity and keepsake on this device. The child’s name is kept.",
  "parents.storage.account": "Progress is saved to your account and cached on this device.",
  "parents.storage.device": "Progress is stored on this device only and is never sent anywhere.",
  "parents.privacyLink": "What KIDDO stores",

  /* ---- The name box, and the one destructive button ------------------- */
  "name.title": "Let KIDDO say hello",
  "name.blurb":
    "Add your child’s first name or nickname and KIDDO will greet them by it. Leave it empty and KIDDO simply says hello.",
  "name.field": "First name or nickname",
  "name.placeholder": "Noah",
  "name.hint":
    "Kept on this device only, never sent anywhere, and only ever shown on your child’s own screen. First names work best — anything after the first word is discarded.",
  "name.preview": "KIDDO will say:",
  "parents.reset.open": "Reset progress",
  "parents.reset.done": "Your child’s journey has been reset. Every activity is new again.",
  "parents.reset.doneNamed": "{name}’s journey has been reset. Every activity is new again.",
  "parents.reset.confirm": "Reset your child’s journey?",
  "parents.reset.confirmNamed": "Reset {name}’s journey?",
  "parents.reset.body":
    "All discovered activities and keepsakes will be cleared. Every world will start fresh. This cannot be undone.",

  /* ---- Putting KIDDO on the home screen ------------------------------- */
  "install.title": "Put KIDDO on the home screen",
  "install.body":
    "Add KIDDO to this device’s home screen and your child reaches their games with one tap — no address to type and no browser to get lost in.",
  "install.cta": "Install KIDDO",
  "install.menu":
    "You can still add KIDDO from your browser’s own menu — look for “Install app” or “Add to Home screen”.",
  "install.done.title": "KIDDO is installed",
  "install.done.body":
    "The KIDDO icon is on this device’s home screen. Tap it and KIDDO opens straight away, still signed in.",
  "install.browser.title": "Open KIDDO in your browser",
  "install.browser.body":
    "You are reading KIDDO inside another app, and that app cannot add anything to a home screen. Open the menu in the corner, choose “Open in browser”, and the option will be waiting here.",
  "install.nudge.title": "Install KIDDO on your phone",
  "install.nudge.body":
    "For easier access: one tap straight to the games, instead of finding this page again.",
  "install.nudge.later": "Not now",
  "install.guide.title": "Add KIDDO to the Home Screen",
  "install.guide.step1":
    "Tap the Share button on the Safari bar — the square with an arrow pointing up.",
  "install.guide.step2": "Scroll down the list and choose “Add to Home Screen”.",
  "install.guide.step3": "Tap “Add”. The KIDDO icon appears alongside your other apps.",
  "install.guide.other":
    "In a browser other than Safari the steps are the same, but the Share button sits somewhere else. Opening KIDDO in Safari is the surest way.",
  "install.guide.close": "Got it",

  /* ---- The privacy page ------------------------------------------------ */
  "privacy.eyebrow": "Privacy",
  "privacy.title": "What KIDDO stores, and what it doesn’t.",
  "privacy.lead":
    "KIDDO is built so that there is almost nothing to tell you. This page describes exactly what the current version keeps, where, and why — in the words a parent would use, not a lawyer.",
  "privacy.reviewed": "Last reviewed {date}. Reflects the version of KIDDO you are using now.",

  "privacy.s.short": "The short version",
  "privacy.short.1":
    "Your child never has an account and is never asked to sign in. KIDDO does not know who your child is.",
  "privacy.short.2":
    "Without a parent account, your child’s progress and first name stay in this browser, on this device. They are not sent to KIDDO or to anyone else.",
  "privacy.short.3":
    "A grown-up can create a parent account — an email address and a password — so progress follows the child between devices. Then the first name and the journey are also kept under that account, and nothing else is.",
  "privacy.short.4":
    "KIDDO is a subscription paid by the parent. The payment is taken by Stripe, which keeps the card details; KIDDO never sees or stores a card number.",
  "privacy.short.5":
    "Your child’s screens have no ads, no analytics and no tracking of any kind, and nothing is ever sold or shown to your child. The pages written for you — this one, the landing page, the sign-up and the parent area — carry one measurement tag from Meta (Facebook) that counts visits and, when a subscription is bought, which plan and what it cost — so KIDDO knows which advertisements are worth paying for.",
  "privacy.short.6":
    "You can change or erase everything KIDDO keeps, and cancel the subscription, from the parent area at any time.",

  "privacy.s.stores": "What KIDDO stores",
  "privacy.stores.intro":
    "On the device, KIDDO keeps four small things using your browser’s local storage. Each is listed with the exact name it is stored under, so you can check for yourself.",
  "privacy.stored.name.title": "A first name",
  "privacy.stored.name.body":
    "Typed by a grown-up in the parent area so KIDDO can say “Hi, Noah!”. Only the first word is kept; a surname typed into the box is thrown away before saving. Leaving the box empty is fine — KIDDO simply says “Hi!”.",
  "privacy.stored.journey.title": "The journey",
  "privacy.stored.journey.body":
    "The list of activities your child has finished, and which world they were last in. This is what draws the keepsakes on the doors, powers “Continue your adventure”, and fills the parent dashboard. It contains no answers, no timings, and no scores — only which doors have been opened.",
  "privacy.stored.audio.title": "The sound setting",
  "privacy.stored.audio.body": "Whether sound is on, and how loud the music and the effects are.",
  "privacy.stored.install.title": "The install reminder",
  "privacy.stored.install.body":
    "A single “yes”, written when a grown-up waves away the offer to put KIDDO on the home screen, so that KIDDO does not ask again on this device. It says nothing about whether KIDDO was installed.",
  "privacy.stores.session":
    "A fifth value, a random number for the current tab, decides which of KIDDO’s greetings is shown. It lives in session storage and disappears when the tab is closed. When a parent has signed in on this device, a sixth value named {key} holds a single “yes” so KIDDO knows to restore the sign-in; it contains no personal information. The sign-in itself is kept by Firebase Authentication in the same browser storage, as any signed-in website does.",
  "privacy.stores.cloudIntro": "With a parent account, KIDDO also keeps in the cloud, under your account:",
  "privacy.cloud.1":
    "Your email address and password, held by Firebase Authentication. KIDDO never sees the password; it is stored as a hash by the sign-in service.",
  "privacy.cloud.2":
    "Your child’s first name — the same word as above, and nothing more. No surname, date of birth, photo or gender is ever asked for.",
  "privacy.cloud.3": "Your child’s journey — the same list of finished activities as above.",
  "privacy.cloud.4":
    "The state of your subscription: whether it is active, which plan (monthly or yearly), when the current period ends, and the identifiers Stripe gives your customer record and subscription so the two services can refer to the same thing. These are written only by KIDDO’s server when Stripe reports a change; the app in your browser can read them but never change them.",
  "privacy.cloud.5": "The dates these records were created and last changed.",
  "privacy.stores.stripe":
    "Your payment details are held by Stripe, not by KIDDO. When you subscribe you are taken to a page served by Stripe, where you enter your card; Stripe keeps your email address, the card, and the history of payments and invoices for that subscription, under its own privacy policy. KIDDO tags the Stripe record with your account’s identifier so the payment can be matched to your account, and nothing else about you or your child.",
  "privacy.stores.noName":
    "There is no field for your own name, and no profile of you beyond the email address you sign in with.",

  "privacy.s.where": "Where it is stored",
  "privacy.where.device":
    "On your device, always — in the browser you opened KIDDO in, under the address you opened it at. If you install KIDDO to your home screen, it uses that same local storage, so progress carries across between the installed app and the browser it was installed from on the same device.",
  "privacy.where.cloud":
    "With a parent account, the first name, the journey and the subscription state are also stored in Google’s Firebase — specifically Firebase Authentication for the sign-in and Cloud Firestore for the child profile and journey — in a project that belongs to KIDDO (its identifier is {project}). The device keeps a copy of the journey so a return visit opens instantly; while you are signed in, the cloud copy is the one that counts, and the device copy is refreshed from it.",
  "privacy.where.rules":
    "Access rules enforced by Firestore itself — not only by the app — mean that an account can read and write only its own record, its own child profile, and that child’s journey. Nobody who is not signed in can read anything, and no account can list or look up another account’s child. TODO(launch): state the Firestore region (where Google stores the data) here once the project’s location is confirmed.",
  "privacy.where.billing":
    "Billing records — card, payments, invoices, receipts — are stored by Stripe, in Stripe’s systems, under the same email address you use for your account.",
  "privacy.where.meta":
    "The visit counts go to Meta. KIDDO’s parent-facing pages — the landing page, the plan and sign-up pages, this page, and the parent area — load Meta’s pixel, which records that a page was opened and sets a cookie so that a visit which began with one of KIDDO’s advertisements can be recognised as the same visit later. It is told the address of the page, and — at two moments, and only those two — a little more: when you leave KIDDO for Stripe to pay, and when a payment has gone through, it is also told which of the two plans it was and what that plan costs, so that KIDDO can tell which advertisements lead to subscriptions and not only to visits. That is the whole list. KIDDO switches off the pixel’s automatic collection, so it never reads the buttons you press or anything you type, and your email address, your card, your child’s name and your child’s journey are never sent to it. It is not loaded on any screen your child plays on — not the home, not a world, not a game — so your child is never counted at all. If you would rather not be counted either, a tracker blocker or your browser’s “block trackers” setting stops it, and KIDDO works exactly the same without it.",
  "privacy.where.noAccount":
    "Without an account, KIDDO has nowhere else to keep anything: opening KIDDO in a different browser, or on a different device, starts with a fresh, empty journey.",

  "privacy.s.why": "Why it is stored",
  "privacy.why.body":
    "So that a return visit feels like a return: KIDDO remembers where your child was, what they have found, and what to call them. A parent account exists for one reason more — so that the same journey is there on the tablet at home and the phone in the car. The subscription state is kept so KIDDO knows whether to open for your child, and so the parent area can show you your plan and renewal date. Nothing about your child is kept for marketing, for measurement or for building a profile. The only measurement KIDDO does at all is a count of visits to its own parent-facing pages, described under “Where it is stored”. Your email address is used to sign you in, to send password-reset and verification emails, and — by Stripe — to send receipts for your subscription.",

  "privacy.s.not": "What is not stored or collected",
  "privacy.not.1": "No child account, child email, child password or child login of any kind.",
  "privacy.not.2":
    "No date of birth, photo, surname, school, or anything about your child beyond an optional first name.",
  "privacy.not.3": "No record of individual answers, right or wrong, or how long a round took.",
  "privacy.not.4": "No location, contacts, camera or microphone access. KIDDO never asks for them.",
  "privacy.not.5":
    "No cookies set by KIDDO itself, and no third-party script of any kind on your child’s side of the app — no analytics, no advertising, no social plugins. Meta’s counter, which does set its own cookie, runs on the parent-facing pages only.",
  "privacy.not.6":
    "No card numbers, expiry dates or security codes. These are entered on Stripe’s page and held by Stripe.",
  "privacy.not.7":
    "No prices, payment screens, upgrade prompts or billing messages on any of your child’s screens. All of that lives in the parent area.",
  "privacy.not.8":
    "From your child’s screens, no requests to any service other than the one that serves KIDDO itself and, with an account, Firebase to save the journey. From the parent-facing pages, the services contacted are Firebase (sign-in and storage), Stripe (checkout and billing) and Meta (the counting described above).",
  "privacy.not.logs":
    "Like any website, the hosting service that delivers KIDDO, and Firebase when an account is used, may keep ordinary access logs (for example, the address and time of a request) for security and reliability. TODO(launch): name the hosting provider and its log retention here before going live.",

  "privacy.s.controls": "Parent controls",
  "privacy.controls.intro": "Everything above is in your hands from the parent area:",
  "privacy.controls.1":
    "Add, change or remove the first name. With an account, the change is saved to the account too.",
  "privacy.controls.2":
    "“Start the adventure over” erases every finished activity and keepsake — on this device and, with an account, in the cloud. The name and the account are kept.",
  "privacy.controls.3":
    "“Sign out” ends the sign-in on this device and clears the cached name and journey from it. The account and its cloud copy are untouched.",
  "privacy.controls.4":
    "“Manage subscription” opens Stripe’s billing page for your account, where you can change the card, see invoices, or cancel. A cancelled subscription keeps KIDDO open until the end of the period already paid for, and is not charged again.",
  "privacy.controls.5":
    "“Delete account” first cancels any subscription still running, removes your Stripe customer record, then removes the sign-in, the child profile and the journey from Firebase, and the cached copies from this device. It cannot be undone. For safety, you will be asked to sign in again first if your sign-in is old. Stripe keeps records of past payments as its own rules require.",
  "privacy.controls.6":
    "Without an account, clearing this site’s data in your browser settings removes everything at once.",
  "privacy.controls.cta": "Open the parent area",
  "privacy.controls.after":
    "The parent area is reached by a “For grown-ups” button. With an account, it is behind your sign-in; without one, it is simply set apart from the child’s screens. The child’s screens never show a sign-in, an email address or an account setting.",

  "privacy.s.children": "Children",
  "privacy.children.body":
    "KIDDO is made for children aged 4 to 8 to use with a grown-up nearby. The account, when there is one, belongs to the parent; a child is a profile inside it holding an optional first name and a list of opened doors, and nothing else. KIDDO does not share or sell this information. We have not yet had this statement reviewed by a lawyer against any specific children’s-privacy law; we will say so here when we have.",

  "privacy.s.changes": "When this changes",
  "privacy.changes.body":
    "If a future version of KIDDO keeps anything more than what is listed here, this page will change first, and it will say plainly what is kept and where. Nothing leaves your device unless a grown-up has chosen to create an account.",

  "privacy.s.contact": "Contact",
  "privacy.contact.body": "Questions about this page are welcome.",
  "privacy.contact.todo":
    "TODO(launch): add a support email address and the name of the company or person responsible for KIDDO.",
  "privacy.done": "Done reading? KIDDO is waiting.",

  /* ---- The shelf of games, and the screen they sit on ------------------ */
  "meta.play.title": "KIDDO World",
  "meta.play.description": "Pick a world and start the adventure.",
  "play.worlds": "Pick a world",
  "play.moreGames": "More games to play",
  "upcoming.title": "More friends, more games",
  "upcoming.body": "New things to play are on the way.",
  "upcoming.science": "Science",
  "upcoming.time": "Time",
  "upcoming.music": "Music",
  "upcoming.feelings": "Feelings",
  "soon.title": "Almost ready!",
  "soon.themes": "What you will play",
  "soon.back": "Back to KIDDO World",

  /* ---- The games themselves: a name, a line spoken to the child, and a
         sentence for the grown-up. Keyed by the id in `data/games.ts`, so
         the catalogue there carries no English of its own. ---------------- */
  "game.memory-match.title": "Memory Match",
  "game.memory-match.tagline": "Find the matching friends!",
  "game.memory-match.summary":
    "Flip cards and remember where each friend is hiding. Builds visual memory and concentration.",
  "game.memory-match.theme.friends": "KIDDO & Friends",
  "game.memory-match.theme.animals": "Animals",
  "game.memory-match.theme.shapes": "Shapes",
  "game.memory-match.theme.colours": "Colours",

  "game.find-it.title": "Find It!",
  "game.find-it.tagline": "Can you find the right one?",
  "game.find-it.summary":
    "Spot the named character or object among several choices. Builds recognition and vocabulary.",
  "game.find-it.theme.friends": "KIDDO & Friends",
  "game.find-it.theme.animals": "Animals",
  "game.find-it.theme.colours": "Colours",

  "game.math-quest.title": "Math Quest",
  "game.math-quest.tagline": "Let’s play with numbers!",
  "game.math-quest.summary":
    "Ten questions drawn fresh each time: counting, number recognition, bigger and smaller, adding and taking away, number sequences and patterns.",
  "game.math-quest.theme.counting": "Counting 1-10",
  "game.math-quest.theme.numbers": "Number Friends",
  "game.math-quest.theme.compare": "Bigger or Smaller",
  "game.math-quest.theme.adding": "Adding & Taking Away",
  "game.math-quest.theme.patterns": "Patterns & Sequences",

  "game.english-quest.title": "English Quest",
  "game.english-quest.tagline": "Let’s play with letters and words!",
  "game.english-quest.summary":
    "Ten questions drawn fresh each time: naming letters, matching big and little letters, hearing the sound a word starts with, and finding the letter missing from a word.",
  "game.english-quest.theme.letters": "Knowing Letters",
  "game.english-quest.theme.case": "Big & Little Letters",
  "game.english-quest.theme.sounds": "Beginning Sounds",
  "game.english-quest.theme.spelling": "Finishing Words",

  "game.logic-quest.title": "Logic Quest",
  "game.logic-quest.tagline": "Let’s work it out together!",
  "game.logic-quest.summary":
    "Ten puzzles drawn fresh each time: finishing a repeating pattern, spotting the one that does not belong, sorting things into the group they fit, and working out what comes next in a sequence.",
  "game.logic-quest.theme.patterns": "Finishing Patterns",
  "game.logic-quest.theme.odd-one-out": "Odd One Out",
  "game.logic-quest.theme.sorting": "Sorting Things Out",
  "game.logic-quest.theme.sequences": "What Comes Next",

  "game.shapes-colours-quest.title": "Shapes & Colours Quest",
  "game.shapes-colours-quest.tagline": "Let’s look closely together!",
  "game.shapes-colours-quest.summary":
    "Ten pictures drawn fresh each time: naming shapes and colours, matching one thing while ignoring another, big and small, counting, corners and sides, where things are, mirror shapes, and patterns of colour and size.",
  "game.shapes-colours-quest.theme.shapes": "Knowing Shapes",
  "game.shapes-colours-quest.theme.colours": "Knowing Colours",
  "game.shapes-colours-quest.theme.matching": "Same or Different",
  "game.shapes-colours-quest.theme.counting": "How Many?",
  "game.shapes-colours-quest.theme.space": "Where Things Are",

  "game.match-quest.title": "Match Quest",
  "game.match-quest.tagline": "Find the friends that belong together!",
  "game.match-quest.summary":
    "Ten boards drawn fresh each time. Every capital letter has its lower case partner hiding among the others, and the child pairs them up by tapping one card and then the other, or by dragging one onto the other. Nothing is lost by a pair that does not hold.",
  "game.match-quest.theme.case": "Big & Little Letters",

  "game.general-knowledge-quest.title": "General Knowledge Quest",
  "game.general-knowledge-quest.tagline": "Let’s find out about the world!",
  "game.general-knowledge-quest.summary":
    "Ten questions drawn fresh each time from nearly four hundred facts: animals and their homes, sounds, babies and food; plants, weather and seasons; food, clothes and the things in a house; vehicles, the people who help us and the places we go; the body, the senses, the sky, and staying safe.",
  "game.general-knowledge-quest.theme.animals": "Animals",
  "game.general-knowledge-quest.theme.nature": "Nature & Weather",
  "game.general-knowledge-quest.theme.everyday": "Everyday Things",
  "game.general-knowledge-quest.theme.people": "People & Places",
  "game.general-knowledge-quest.theme.body": "My Body",
  "game.general-knowledge-quest.theme.space": "Space & Safety",

  /* ---- The chrome around every screen a child sees --------------------- */
  "chrome.home": "KIDDO home",
  "chrome.forGrownUps": "For grown-ups",
  "chrome.back": "Back to KIDDO World",
  "chrome.soundOn": "Sound on",
  "chrome.soundOff": "Sound off",
  "chrome.step": "Step {current} of {total}",
  "chrome.tagline": "Play. Learn. Smile.",

  /* ---- The end of a round ---------------------------------------------- */
  "celebrate.title": "You did it!",
  "celebrate.playAgain": "Play again",

  /* ---- What a round says out loud, for a child who is listening -------- */
  "quest.asking": "Question {current} of {total}. {question}",
  "quest.answered": "Yes, the answer is {answer}. Question {current} of {total} done.",
  "quest.boardAnswered": "{said} Question {current} of {total} done.",
  "quest.joined": "Yes. {current} of {total} joined.",
  "quest.notQuite": "Not quite. Have another go.",

  /* ---- Each game's own voice: the hello, the cheer, the nudge, the way
         in, and the two lines at the end. Every game owns all of them, even
         where two games say the same thing in English, because a voice is
         the one thing a translator should be free to tell apart. --------- */
  "game.memory-match.foundAll": "You found them all!",
  "game.memory-match.foundOne": "Yes! You found {name}!",
  "game.memory-match.checking": "Ooh, not those two. Try again!",
  "game.memory-match.peek": "Let's see...",
  "game.memory-match.findMatch": "Now find the one that matches!",
  "game.memory-match.another": "Nice! Find another pair.",
  "game.memory-match.start": "Tap two cards to find matching friends!",
  "game.memory-match.saidAll": "You found all {total} pairs in {tries} tries.",
  "game.memory-match.saidOne": "{name} matched. {done} of {total} pairs found.",
  "game.memory-match.saidMiss": "Not a pair. Both cards are turning back over.",
  "game.memory-match.done.title": "Great job!",
  "game.memory-match.done.message": "You found all the friends!",
  "game.memory-match.card.found": "{name}, found",
  "game.memory-match.card.notPair": "{name}, not a pair",
  "game.memory-match.card.faceDown": "Card {number}, face down",

  "game.find-it.ask": "Can you find {name}?",
  "game.find-it.askMe": "Can you find me, {name}?",
  "game.find-it.yes": "Yes! That's {name}!",
  "game.find-it.wrong": "That's {picked}! Can you find {name}?",
  "game.find-it.saidYes": "Yes, that is {name}. Round {current} of {total} done.",
  "game.find-it.saidWrong": "That is {picked}. Keep looking for {name}.",
  "game.find-it.saidAsking": "Round {current} of {total}. Find {name}.",
  "game.find-it.done.title": "You found them all!",
  "game.find-it.done.message": "Every single friend. Great looking!",

  "game.math-quest.hello": "Hello! I'm KIDDO. Shall we play with some numbers?",
  "game.math-quest.yes": "Yes! It's {answer}.",
  "game.math-quest.retry": "Ooh, so close! Have another go.",
  "game.math-quest.start": "Let's play!",
  "game.math-quest.done.title": "You did the whole quest!",
  "game.math-quest.done.message": "Ten questions, all the way to the end. Brilliant thinking!",

  "game.english-quest.hello": "Hello! I'm KIDDO. Shall we play with letters and words?",
  "game.english-quest.yes": "Yes! It's {answer}.",
  "game.english-quest.retry": "Ooh, so close! Have another go.",
  "game.english-quest.start": "Let's play!",
  "game.english-quest.done.title": "You did the whole quest!",
  "game.english-quest.done.message":
    "Ten letters, sounds and words, all the way to the end. Wonderful reading!",

  "game.logic-quest.hello": "Hello! I'm KIDDO. Shall we do some thinking together?",
  "game.logic-quest.yes": "Yes! It's {answer}.",
  "game.logic-quest.retry": "Almost! Let's take another look.",
  "game.logic-quest.start": "Let's think!",
  "game.logic-quest.done.title": "You worked it all out!",
  "game.logic-quest.done.message":
    "Ten puzzles, all the way to the end. That was some very good thinking.",

  "game.shapes-colours-quest.hello":
    "Hello! I'm KIDDO. Shall we look at some shapes and colours?",
  "game.shapes-colours-quest.yes": "Yes! It's {answer}.",
  "game.shapes-colours-quest.retry": "Almost! Let's take another look.",
  "game.shapes-colours-quest.start": "Let's look!",
  "game.shapes-colours-quest.done.title": "You looked at every one!",
  "game.shapes-colours-quest.done.message":
    "Ten pictures, all the way to the end. You spotted every shape and every colour.",

  "game.match-quest.hello":
    "Hello! I'm KIDDO. Shall we find the letters that belong together?",
  "game.match-quest.praise.1": "Great match!",
  "game.match-quest.praise.2": "Those two belong together!",
  "game.match-quest.praise.3": "Nice one!",
  "game.match-quest.praise.4": "That's the one!",
  "game.match-quest.nudge.1": "Not these two yet.",
  "game.match-quest.nudge.2": "Have another look.",
  "game.match-quest.nudge.3": "Who could be its friend?",
  "game.match-quest.solved": "You found all the friends!",
  "game.match-quest.saidSolved": "You found them all.",
  "game.match-quest.said": "{said} Board {current} of {total} done.",
  "game.match-quest.start": "Let's match!",
  "game.match-quest.done.title": "Everyone found a friend!",
  "game.match-quest.done.message":
    "Every big letter found its little friend. Wonderful matching!",

  "game.general-knowledge-quest.hello":
    "Hello! I'm KIDDO. Shall we find out about the world?",
  "game.general-knowledge-quest.yes": "Great thinking! It's {answer}.",
  "game.general-knowledge-quest.retry": "Ooh, not that one. Try again!",
  "game.general-knowledge-quest.joined": "You joined them all up!",
  "game.general-knowledge-quest.yesBoard": "Yes! That's the one.",
  "game.general-knowledge-quest.retryBoard": "Ooh, not that one. Have another go.",
  "game.general-knowledge-quest.start": "Let's find out!",
  "game.general-knowledge-quest.done.title": "You know so much!",
  "game.general-knowledge-quest.done.message":
    "Ten questions about the whole wide world, all the way to the end. Animals, weather, people, places — you knew them all.",

  /* ---- The engines. Every line here is heard rather than read: the tiles
         say what they are and what state they are in, because a border
         colour is not a thing a screen reader can pass on. --------------- */
  "stage.choice.correct": "{name}, that's the one",
  "stage.choice.wrong": "{name}, not this one",
  "stage.choice.tried": "Choose {name}, already tried",
  "stage.choice.idle": "Choose {name}",
  "stage.match.matched": "{name}, matched with {partner}.",
  "stage.match.selected": "{name}, selected. Choose the item that matches it.",
  "stage.match.idle": "{name}, not matched yet. Choose it.",
  "stage.match.no": "{from} and {to} do not go together. Try another one.",
  "stage.match.allDone": "{from} goes with {to}. You found them all!",
  "stage.match.more": "{from} goes with {to}. {remaining} more to find.",
  "stage.match.left": "First set",
  "stage.match.right": "The set that goes with it",
  "stage.connect.joined": "{name}, joined to {partner}",
  "stage.connect.selected": "{name}, chosen. Now choose the one it goes with.",
  "stage.connect.idle": "{name}, not joined yet. Choose it.",
  "stage.order.chosen":
    "{name}, chosen. Choose it again to put it in place {place} of {total}.",
  "stage.order.waiting": "{name}, waiting. Choose it to move it.",
  "stage.order.filled": "Place {place} of {total}: {name}.",
  "stage.order.empty": "Place {place} of {total}, still empty.",
  "stage.order.drop": "Put {name} in place {place} of {total}.",
  "stage.order.next": "Place {place} of {total}, next to fill. Choose a tile first.",

  /* ---- The symbols in a question, said out loud ------------------------ */
  "prompt.plus": "plus",
  "prompt.minus": "take away",
  "prompt.equals": "equals",
  "prompt.question": "what",
  "prompt.less": "is less than",
  "prompt.greater": "is greater than",
  "prompt.arrow": "then",
  "prompt.blank": "what?",

  /* ---- The worlds: the map, the doors, and what a place gives back.
         A world's own name, its line and its rewards live under `world.` and
         `reward.` further up; these are the words the map wraps around
         them. ----------------------------------------------------------- */
  "worlds.map": "Worlds",
  "worlds.door.allFound": "All found",
  "worlds.door.new": "New",
  "worlds.door.progress": "{done} of {total} done",
  "worlds.door.sr": "{name}. {line} {state}",
  "worlds.door.state.done": "Everything found.",
  "worlds.door.state.new": "New.",
  "worlds.door.state.going": "{done} of {total} done.",
  "worlds.keepsake.none": "No {many} yet",
  "worlds.keepsake.all": "All {total} {many}",
  "worlds.keepsake.some": "{done} of {total} {many}",
  "worlds.keepsake.sr": "{name}: {label}.",
  "worlds.continue.done": "You explored every world!",
  "worlds.continue.back": "Continue your adventure",
  "worlds.continue.start": "Start your adventure",
  "worlds.continue.next": "Next up: {door} in {world}",
  "worlds.continue.first": "First stop: {door} in {world}",
  "worlds.continue.allOpen": "Every door is open. Play any of them again, any time.",
  "worlds.continue.goDone": "Visit the worlds",
  "worlds.continue.goBack": "Continue",
  "worlds.continue.goStart": "Let's go!",
  "worlds.stickers.one": "1 sticker",
  "worlds.stickers.many": "{count} stickers",
  "worlds.stickers.earned": "{stickers} earned",
  "worlds.page.allDone": "Wonderful! You discovered everything here.",
  "worlds.page.allDoneNamed": "Wonderful, {name}! You discovered everything here.",
  "worlds.page.back": "Welcome back! {rest}",
  "worlds.page.backNamed": "Welcome back, {name}! {rest}",
  "worlds.page.try": "Shall we try {door}?",
  "worlds.page.startHere": "Start here",
  "worlds.page.continue": "Continue",
  "worlds.page.visit": "Visit {world}",
  "worlds.page.doors": "Things to do in {world}",
  "worlds.status.done": "Done",
  "worlds.status.next": "Next",
  "worlds.status.new": "New",
  "worlds.doorCard.sr": "{title}. {blurb} {status}.",
  "worlds.doorCard.tier": "{tier} {state}.",
  "worlds.doorCard.playAgain": "Play again",
  "worlds.doorCard.play": "Let's play",
  "worlds.tierState.done": "finished",
  "worlds.tierState.ready": "unlocked",
  "worlds.tierState.locked": "locked",
  "worlds.tier.group": "How big a challenge",
  "worlds.tier.ask": "How big a challenge?",
  "worlds.tier.sr": "{tier}. {state}.",
  "worlds.tier.done": "Completed",
  "worlds.tier.ready": "Unlocked",
  "worlds.tier.locked": "Locked",
  "worlds.game.hello": "Hi, {name}! {intro}",
  "worlds.game.next": "Next: {door}",
  "worlds.game.back": "Back to {world}",
  "worlds.game.worldDone": "Wonderful! You discovered everything in {world}!",
  "worlds.game.worldDoneAgain": "Wonderful! You discovered everything in {world}.",
  "worlds.game.tricky": "That was tricky — and you did it!",
  "worlds.game.figured": "Wow! You figured it out!",
  "worlds.game.again": "Still brilliant. Every time counts!",
  "worlds.game.bigger": "Ready for a bigger challenge?",
  "worlds.game.start": "Let's go!",

  /* ---- The little notice: another family joined ----------------------- */
  "social.join.plan": "🚀 A family just chose the {plan} plan",
  "social.join.joined": "🎉 A new KIDDO family just joined",
  "social.join.started": "✨ Another family started their KIDDO journey",
} as const;

/** Every string KIDDO can say. Adding one here obliges every language. */
export type MessageKey = keyof typeof en;
