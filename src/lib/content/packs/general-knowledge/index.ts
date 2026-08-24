import type { Activity, ContentPack } from "../../types";
import { ANIMAL_ACTIVITIES } from "./animals";
import { BODY_ACTIVITIES } from "./body";
import { COMMUNITY_ACTIVITIES } from "./community";
import { EVERYDAY_ACTIVITIES } from "./everyday";
import { FOOD_ACTIVITIES } from "./food";
import { HABITAT_ACTIVITIES } from "./habitats";
import { LIFE_CYCLE_ACTIVITIES } from "./lifeCycles";
import { NATURE_ACTIVITIES } from "./nature";
import { SPACE_ACTIVITIES } from "./space";
import { TRANSPORT_ACTIVITIES } from "./transport";
import { WEATHER_ACTIVITIES } from "./weather";
import { WORLD_ACTIVITIES } from "./world";

/**
 * The General Knowledge pack: thirty-four activities about the world a child
 * can point at.
 *
 * Ordered the way a child's world widens. Animals first, because a two year
 * old knows a dog before they know a doctor. Then where those animals live,
 * then the plants and weather around them and how a living thing grows, then
 * the food on their plate and the things in their house, then out of the door
 * — clothes, vehicles, the people who help, the places in town — then their
 * own body, then the sky and the shape of a day, and last the two biggest
 * ideas in the pack: how the land is shaped, and how to stay safe in it.
 *
 * Thirty-four activities and no new engine. Twenty-eight of them are a
 * `choice`, drawn by the same `ChoiceStage` that draws a sum in Math Quest.
 * What the pack needed from the content layer was one new noun — a `picture`
 * item, a thing in the world with a name — and it went into `types.ts` as a
 * subject-neutral item that any pack may use.
 *
 * Four are `connect` boards and two are `order` boards, and five of the six
 * teach something the pack already knew one tile at a time.
 * `homePartners` is the same `animal-habitats` table as `animalHabitats`,
 * joined up instead of picked from; `babyPartners` is the same animal table as
 * `babyAnimals`, a whole family of them at once; `helperPartners` is the same
 * ten tools as `helperTools`, all handed out together; `bodyPartners` is the
 * same parts as `senses` with what each one does; and `dayOrder` is the four
 * parts of `dayAndNight` asked as a run rather than one at a time. Only
 * `lifeCycles` teaches something new outright. None of them needed an engine —
 * `ConnectStage` and `OrderStage` both existed — and they exist because one
 * thing to know is allowed more than one way to play. Nothing in any engine
 * knows this pack exists.
 */
export const GENERAL_KNOWLEDGE_ACTIVITIES: readonly Activity[] = [
  ...ANIMAL_ACTIVITIES,
  ...HABITAT_ACTIVITIES,
  ...NATURE_ACTIVITIES,
  ...LIFE_CYCLE_ACTIVITIES,
  ...WEATHER_ACTIVITIES,
  ...FOOD_ACTIVITIES,
  ...EVERYDAY_ACTIVITIES,
  ...TRANSPORT_ACTIVITIES,
  ...COMMUNITY_ACTIVITIES,
  ...BODY_ACTIVITIES,
  ...SPACE_ACTIVITIES,
  ...WORLD_ACTIVITIES,
];

export const GENERAL_KNOWLEDGE_PACK: ContentPack = {
  id: "general-knowledge",
  title: "General Knowledge",
  blurb: "The world around us: animals, nature, people, places and space.",
  accent: "sage",
  activities: GENERAL_KNOWLEDGE_ACTIVITIES,
};

export {
  animalDiet,
  animalRecognition,
  animalSounds,
  babyAnimals,
  babyPartners,
} from "./animals";
export { bodyParts, bodyPartners, healthyHabits, senses } from "./body";
export { communityHelpers, helperPartners, helperTools, places } from "./community";
export { clothing, objectNames, objectUses } from "./everyday";
export { foodNames, foodOrigins } from "./food";
export { animalHabitats, homePartners } from "./habitats";
export { lifeCycles } from "./lifeCycles";
export { livingThings, naturalOrMade, plants } from "./nature";
export { dayAndNight, dayOrder, spaceFacts } from "./space";
export { vehicleNames, vehicleTravel } from "./transport";
export { hotOrCold, seasons, weather } from "./weather";
export { landAndWater, safety } from "./world";
