import {
  capitalise,
  defineQuizActivity,
  except,
  pic,
  type Question,
  type Sym,
} from "./shared";

/**
 * Weather, seasons, and the difference between hot and cold.
 *
 * Weather is the first science a child does: they look out of the window,
 * they say a word, and they are right. So the naming half is deliberately
 * plain, and the thinking half asks what the weather *means* — puddles,
 * kites, snowmen — rather than anything a forecast would say.
 *
 * The seasons here are the temperate four a picture book draws. That is a
 * real limitation and it is written down rather than hidden: `SEASONS` says
 * what it assumes, so anyone localising the pack knows exactly which
 * questions to look at.
 */

/* --------------------------------------------------------------- weather */

const WEATHER = {
  sun: pic("☀️", "sunshine"),
  rain: pic("🌧️", "rain"),
  snow: pic("❄️", "snow"),
  cloud: pic("☁️", "a cloud"),
  wind: pic("🌬️", "wind"),
  storm: pic("⛈️", "a thunderstorm"),
  rainbow: pic("🌈", "a rainbow"),
  fog: pic("🌫️", "fog"),
} as const;

type WeatherKey = keyof typeof WEATHER;

export const WEATHER_TILES: readonly Sym[] = Object.values(WEATHER);

/**
 * Naming boards get the same care the fact boards already take, because one
 * weather can hide inside another glyph: the thunderstorm glyph has rain
 * falling out of a cloud, the fog glyph is a cloud sat behind grey bars, and
 * the wind glyph is drawn as a puffing cloud. A child who points at the rain
 * inside the storm must never be marked wrong.
 */
const WEATHER_NAMES: readonly {
  key: WeatherKey;
  level: 1 | 2 | 3;
  avoid?: readonly WeatherKey[];
}[] = [
  { key: "sun", level: 1 },
  { key: "rain", level: 1, avoid: ["storm"] },
  { key: "snow", level: 1 },
  { key: "cloud", level: 2, avoid: ["fog", "storm", "wind"] },
  { key: "rainbow", level: 2 },
  { key: "wind", level: 3 },
  { key: "storm", level: 3 },
  { key: "fog", level: 3, avoid: ["cloud"] },
];

/** What you would grab on the way out of the door. Its own little family. */
const TAKE: readonly Sym[] = [
  pic("☂️", "an umbrella"),
  pic("🧥", "a warm coat"),
  pic("🕶️", "sunglasses"),
  pic("👒", "a sun hat"),
  pic("🩱", "a swimsuit"),
];

const WEATHER_FACTS: readonly Question[] = [
  {
    level: 2,
    ask: "It is raining outside. What should you take with you?",
    answer: TAKE[0],
    distractors: [TAKE[2], TAKE[3], TAKE[4]],
    because: "An umbrella keeps the rain off your head.",
    hint: "Which one would you hold up over you?",
    idea: "rain-umbrella",
    family: "thing to take outside",
  },
  {
    level: 2,
    ask: "It is snowing outside. What should you put on?",
    answer: TAKE[1],
    distractors: [TAKE[2], TAKE[3], TAKE[4]],
    because: "A warm coat keeps the cold snow out.",
    hint: "It is freezing out there. Which one would you wrap up in?",
    idea: "snow-coat",
    family: "thing to take outside",
  },
  {
    level: 2,
    ask: "Which weather leaves puddles all over the ground?",
    answer: WEATHER.rain,
    distractors: except(WEATHER_TILES, WEATHER.rain, WEATHER.storm),
    because: "Rain falls and fills the puddles up.",
    hint: "Puddles are made of water. Where did the water fall from?",
    idea: "rain-puddles",
    family: "weather",
  },
  {
    level: 2,
    ask: "Which weather do you need to build a snowman?",
    answer: WEATHER.snow,
    distractors: except(WEATHER_TILES, WEATHER.snow),
    because: "You need soft, cold snow to roll a snowman.",
    hint: "Think about what you would roll into three big white balls.",
    idea: "snow-snowman",
    family: "weather",
  },
  {
    level: 3,
    ask: "Which weather do you need to fly a kite?",
    answer: WEATHER.wind,
    distractors: except(WEATHER_TILES, WEATHER.wind, WEATHER.storm),
    because: "The wind pushes a kite up into the sky.",
    hint: "Something has to push the kite along. You cannot see it.",
    idea: "wind-kite",
    family: "weather",
  },
  {
    level: 3,
    ask: "Which weather makes a loud rumble of thunder?",
    answer: WEATHER.storm,
    distractors: except(WEATHER_TILES, WEATHER.storm),
    because: "A thunderstorm brings flashes of lightning and loud thunder.",
    hint: "It is the noisiest weather of them all.",
    idea: "storm-thunder",
    family: "weather",
  },
  {
    level: 3,
    ask: "Which weather makes everything hard to see, like a grey cloud on the ground?",
    answer: WEATHER.fog,
    distractors: except(WEATHER_TILES, WEATHER.fog, WEATHER.cloud),
    because: "Fog is a cloud sitting right down on the ground.",
    hint: "It is soft, grey, and you cannot see far through it.",
    idea: "fog-hard-to-see",
    family: "weather",
  },
];

export const weather = defineQuizActivity({
  id: "weather",
  activityType: "weather",
  ageRange: { min: 3, max: 6 },
  host: "pip",
  questions: [
    ...WEATHER_NAMES.map(({ key, level, avoid }): Question => {
      const answer = WEATHER[key];
      const barred = (avoid ?? []).map((other) => WEATHER[other]);
      return {
        level,
        ask: `Which one is ${answer.key}?`,
        answer,
        distractors: except(WEATHER_TILES, answer, ...barred),
        because: `That is ${answer.key}.`,
        hint: "Think about looking out of the window and seeing it.",
        idea: `weather:${key}`,
        family: "weather",
      };
    }),
    ...WEATHER_FACTS,
  ],
});

/* --------------------------------------------------------------- seasons */

/**
 * The four temperate seasons, as drawn in a picture book: buds, beaches,
 * falling leaves, snow. Places with two seasons, or a wet season, are not
 * described here — an honest limitation, kept in one table so it is easy to
 * find and easy to swap.
 */
const SEASONS = {
  spring: pic("🌷", "spring"),
  summer: pic("🏖️", "summer"),
  autumn: pic("🍂", "autumn"),
  winter: pic("⛄", "winter"),
} as const;

const SEASON_TILES: readonly Sym[] = Object.values(SEASONS);

const SEASON_FACTS: readonly {
  key: keyof typeof SEASONS;
  ask: string;
  because: string;
  hint: string;
  idea: string;
  level: 1 | 2 | 3;
}[] = [
  { key: "winter", ask: "Which season is the coldest, with snow on the ground?", because: "Winter is the coldest season of all.", hint: "Think about the season with snowmen in it.", idea: "season-winter-cold", level: 1 },
  { key: "summer", ask: "Which season is the warmest, when we play outside all day?", because: "Summer is warm, bright and long.", hint: "Think about the season with the longest, sunniest days.", idea: "season-summer-warm", level: 1 },
  { key: "autumn", ask: "In which season do the leaves turn orange and fall off the trees?", because: "In autumn the leaves turn colour and drift down.", hint: "Think about crunching through leaves on the path.", idea: "season-autumn-leaves", level: 2 },
  { key: "spring", ask: "In which season do the first flowers open and baby lambs are born?", because: "Spring is when everything starts growing again.", hint: "It is the season right after the cold one.", idea: "season-spring-grows", level: 2 },
  { key: "summer", ask: "In which season do we go to the beach and eat ice cream?", because: "Summer is beach and ice cream weather.", hint: "You would need your swimsuit.", idea: "season-summer-beach", level: 2 },
  { key: "winter", ask: "In which season do we wear a big coat, gloves and a scarf?", because: "Winter is cold, so we wrap up warm.", hint: "Think about the season you can see your own breath in.", idea: "season-winter-coat", level: 3 },
  { key: "spring", ask: "Which season comes straight after winter?", because: "Winter is followed by spring.", hint: "After the cold one, everything starts to grow.", idea: "season-after-winter", level: 3 },
  { key: "autumn", ask: "Which season comes straight after summer?", because: "Summer is followed by autumn.", hint: "After the warm one, the leaves start to fall.", idea: "season-after-summer", level: 3 },
];

export const seasons = defineQuizActivity({
  id: "seasons",
  activityType: "seasons",
  ageRange: { min: 4, max: 6 },
  host: "bibi",
  tiles: { 1: 4, 2: 4, 3: 4 },
  questions: SEASON_FACTS.map((fact): Question => {
    const answer = SEASONS[fact.key];
    return {
      level: fact.level,
      ask: fact.ask,
      answer,
      distractors: except(SEASON_TILES, answer),
      because: fact.because,
      hint: fact.hint,
      idea: fact.idea,
      family: "season",
    };
  }),
});

/* ----------------------------------------------------------- hot and cold */

/* Nothing here is *called* hot or cold. A tile named "a hot cup of tea" reads
   the answer out to the one child who most needs the picture described — the
   label is what a screen reader says instead of the glyph, so the word the
   question is looking for must never be in it. */
const HOT: readonly Sym[] = [
  pic("🔥", "a fire"),
  pic("☀️", "the sun"),
  pic("🍵", "a cup of tea"),
  pic("🍲", "a bowl of soup"),
];

const COLD: readonly Sym[] = [
  pic("🧊", "an ice cube"),
  pic("❄️", "a snowflake"),
  pic("🍦", "an ice cream"),
  pic("⛄", "a snowman"),
];

export const hotOrCold = defineQuizActivity({
  id: "hot-or-cold",
  activityType: "hot-or-cold",
  ageRange: { min: 3, max: 6 },
  host: "foxy",
  questions: [
    ...HOT.map((answer, index): Question => ({
      level: index < 2 ? 1 : 2,
      ask: "Which one is hot?",
      answer,
      distractors: COLD,
      because: `${capitalise(answer.key)} is hot.`,
      hint: "The others would feel freezing. One would feel warm.",
      idea: `hot:${answer.key}`,
      family: "hot or cold",
    })),
    ...COLD.map((answer, index): Question => ({
      level: index < 2 ? 1 : 2,
      ask: "Which one is cold?",
      answer,
      distractors: HOT,
      because: `${capitalise(answer.key)} is cold.`,
      hint: "The others would feel warm. One would feel freezing.",
      idea: `cold:${answer.key}`,
      family: "hot or cold",
    })),
    {
      level: 3,
      ask: "Which one is too hot to touch?",
      answer: HOT[0],
      distractors: COLD,
      because: "A fire is far too hot to touch. Always stay back from one.",
      hint: "It is the one with flames.",
      idea: "hot-fire-danger",
      family: "hot or cold",
    },
    {
      level: 3,
      ask: "Which one melts away on a warm sunny day?",
      answer: COLD[3],
      distractors: HOT,
      because: "A snowman melts when the sun warms him up.",
      hint: "It is made of snow, so the sun is bad news for it.",
      idea: "cold-melts",
      family: "hot or cold",
    },
  ],
});

export const WEATHER_ACTIVITIES = [weather, seasons, hotOrCold];
