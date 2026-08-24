import { defineQuizActivity, except, pic, type Question, type Sym } from "./shared";

/**
 * Vehicles: what they are called, and where they travel.
 *
 * The second half is the interesting one, because "where does it go?" is a
 * child's first taste of sorting by a property they cannot see in the
 * picture. It also needs the most care: three of these vehicles fly, so the
 * flying question names the two that are not the answer and keeps them off
 * the board rather than hoping nobody notices.
 */

const VEHICLES = {
  car: pic("🚗", "a car"),
  bus: pic("🚌", "a bus"),
  bicycle: pic("🚲", "a bicycle"),
  train: pic("🚂", "a train"),
  plane: pic("✈️", "an aeroplane"),
  boat: pic("⛵", "a sailing boat"),
  ship: pic("🚢", "a big ship"),
  helicopter: pic("🚁", "a helicopter"),
  rocket: pic("🚀", "a rocket"),
  fireEngine: pic("🚒", "a fire engine"),
  ambulance: pic("🚑", "an ambulance"),
  police: pic("🚓", "a police car"),
  tractor: pic("🚜", "a tractor"),
  lorry: pic("🚚", "a lorry"),
  motorbike: pic("🏍️", "a motorbike"),
  scooter: pic("🛴", "a scooter"),
} as const;

type VehicleKey = keyof typeof VEHICLES;

export const VEHICLE_TILES: readonly Sym[] = Object.values(VEHICLES);

const NAMES: readonly { key: VehicleKey; level: 1 | 2 | 3 }[] = [
  { key: "car", level: 1 },
  { key: "bus", level: 1 },
  { key: "bicycle", level: 1 },
  { key: "train", level: 1 },
  { key: "plane", level: 1 },
  { key: "boat", level: 2 },
  { key: "fireEngine", level: 2 },
  { key: "ambulance", level: 2 },
  { key: "police", level: 2 },
  { key: "tractor", level: 2 },
  { key: "helicopter", level: 3 },
  { key: "rocket", level: 3 },
  { key: "lorry", level: 3 },
  { key: "ship", level: 3 },
  { key: "motorbike", level: 3 },
  { key: "scooter", level: 3 },
];

export const vehicleNames = defineQuizActivity({
  id: "vehicle-names",
  title: "Things That Go",
  activityType: "transport",
  ageRange: { min: 3, max: 6 },
  host: "wally",
  questions: NAMES.map(({ key, level }): Question => {
    const answer = VEHICLES[key];
    /* A police car is a car. Asked for a car, the board must not hold one. */
    const barred = key === "car" ? [VEHICLES.police] : [];
    return {
      level,
      ask: `Which one is ${answer.key}?`,
      answer,
      distractors: except(VEHICLE_TILES, answer, ...barred),
      because: `That is ${answer.key}.`,
      hint: "Look at the shape of each one, and its wheels.",
      idea: `vehicle:${key}`,
      family: "vehicle",
    };
  }),
});

/* ------------------------------------------------------- where it travels */

const GROUND: readonly Sym[] = [
  VEHICLES.car,
  VEHICLES.bus,
  VEHICLES.bicycle,
  VEHICLES.lorry,
  VEHICLES.tractor,
  VEHICLES.motorbike,
];

const TRAVEL: readonly {
  key: VehicleKey;
  ask: string;
  because: string;
  hint: string;
  idea: string;
  /** Vehicles that would also be right, kept off this board. */
  avoid?: readonly VehicleKey[];
  level: 1 | 2 | 3;
}[] = [
  {
    key: "boat", ask: "Which one travels on the water?",
    because: "A sailing boat glides across the water.",
    hint: "The others all need a road. One needs the sea.",
    idea: "travels:water", avoid: ["ship"], level: 1,
  },
  {
    key: "plane", ask: "Which one flies high up in the sky?",
    because: "An aeroplane flies through the sky on its big wings.",
    hint: "Look for the one with wings.",
    idea: "travels:sky", avoid: ["helicopter", "rocket"], level: 1,
  },
  {
    key: "train", ask: "Which one runs along a track?",
    because: "A train runs along rails, all the way to the station.",
    hint: "It is long, and it cannot steer.",
    idea: "travels:track", level: 2,
  },
  {
    key: "bicycle", ask: "Which one do you have to pedal with your feet?",
    because: "You pedal a bicycle to make it go.",
    hint: "It has two wheels and no engine at all.",
    idea: "travels:pedal", avoid: ["scooter"], level: 2,
  },
  {
    key: "rocket", ask: "Which one can travel all the way to space?",
    because: "A rocket blasts up past the sky and out into space.",
    hint: "Only one of these could leave the Earth behind.",
    idea: "travels:space", avoid: ["plane", "helicopter"], level: 2,
  },
  {
    key: "bus", ask: "Which one carries lots of people at once?",
    because: "A bus carries a whole crowd of people together.",
    hint: "Think about the one with rows and rows of seats.",
    idea: "travels:many-people", avoid: ["train", "ship", "plane"], level: 2,
  },
  {
    key: "helicopter", ask: "Which one has spinning blades on the top?",
    because: "A helicopter's blades spin round and lift it straight up.",
    hint: "Look on the roof of each one.",
    idea: "travels:blades", level: 3,
  },
  {
    key: "lorry", ask: "Which one carries heavy loads along the motorway?",
    because: "A lorry carries heavy loads in the big box on its back.",
    hint: "It is the biggest thing on the road.",
    idea: "travels:heavy-loads", avoid: ["train", "ship"], level: 3,
  },
  {
    key: "tractor", ask: "Which one works in the fields on a farm?",
    because: "A tractor pulls and digs all day on the farm.",
    hint: "It has enormous back wheels for the bumpy mud.",
    idea: "travels:farm", level: 3,
  },
];

export const vehicleTravel = defineQuizActivity({
  id: "vehicle-travel",
  title: "How Does It Travel?",
  activityType: "transport",
  ageRange: { min: 4, max: 6 },
  host: "pip",
  questions: TRAVEL.map((entry): Question => {
    const answer = VEHICLES[entry.key];
    const barred = new Set<string>([
      answer.key,
      ...(entry.avoid ?? []).map((key) => VEHICLES[key].key),
    ]);
    const pool = entry.idea === "travels:water" || entry.idea === "travels:sky"
      || entry.idea === "travels:space"
      ? GROUND
      : VEHICLE_TILES;
    return {
      level: entry.level,
      ask: entry.ask,
      answer,
      distractors: pool.filter((tile) => !barred.has(tile.key)),
      because: entry.because,
      hint: entry.hint,
      idea: entry.idea,
      family: "vehicle",
    };
  }),
});

export const TRANSPORT_ACTIVITIES = [vehicleNames, vehicleTravel];
