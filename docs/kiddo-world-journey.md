# The KIDDO world journey

Phase 5 turned the home screen from a list of games into a place to explore,
and gave each world a door a child can walk through. This note is the map of
what was added and the one rule behind it: **nothing here is a new engine.**
A world activity is a `SessionPlan` played by the General Knowledge quest
machine inside the existing `GameShell`, and progress is a list of door ids.

## The journey

```
/parents  ──name──▶  /  (greeting · Continue your adventure · Pick a world)
                        │
                        ▼
                 /worlds/<world>        banner · friend · keepsake · three doors
                        │
                        ▼
           /worlds/<world>/<activity>   intro → round → celebration + reward
                        │                       └── Next: <door>  /  Visit <world>
                        ▼
                  back to the world (door ticked, next door waiting)
```

## The pieces

| What                         | Where                                   |
| ---------------------------- | --------------------------------------- |
| Doors (activities) and rewards | `src/lib/worlds/activities.ts`        |
| Places (name, friend, route) | `src/lib/worlds/places.ts`              |
| Journey (pure)               | `src/lib/journey/journey.ts`            |
| Journey on the device        | `src/lib/journey/useJourney.ts` — `kiddo.journey.v1` |
| Home panel                   | `src/components/worlds/ContinueAdventure.tsx` |
| World map on home            | `WorldMap.tsx` → `WorldDoor.tsx` → `WorldScene.tsx` |
| World page                   | `src/components/worlds/WorldPage.tsx`   |
| A round inside a world       | `src/components/worlds/WorldActivityGame.tsx` |
| Keepsake (flower / paw / page) | `src/components/worlds/WorldKeepsake.tsx` |
| Routes                       | `src/app/worlds/[worldId]/…`            |

### A door is a plan

Each `WorldActivity` names the content it draws from as `{ level, from }`
slots — the same `SessionPlan` shape the quests use — so the curriculum is
not rewritten and a door can be retuned by editing one array. The General
Knowledge quest's reducer already plays mixed choice + connect rounds, so
`useGeneralKnowledgeQuest(plan)` is the whole runtime.

### Progress is a list

`Journey = { completed: WorldActivityId[], medium, hard, last }`. Everything the screens
show — done / next / new, the keepsake count, the sticker count, what
"Continue" points at — is derived from that list by the pure functions in
`journey.ts`. There is no XP, no score, and no streak; a sticker is one
finished door.

"Continue" means: the next unfinished door in the world the child was last
in; failing that, the first world with one; failing that, nothing to chase,
and the panel says so.

### How big a challenge (Phase 11)

Every door now owns three plans — Easy, Medium, Hard — drawn from the same
content at higher levels; harder means stronger distractors and less
scaffolding, never more questions. `completed` kept its exact meaning
(finished at Easy, the tier every door opens on), and `medium` / `hard`
record the bigger sizes; a journey written before tiers reads back with
those lists empty, which is precisely what was true of it. Unlocks are
derived, per door, and only ever open: Medium when Easy is done, Hard when
Medium is. The picker (`TierPicker.tsx`) appears on a door's way in once
there is a choice, and the celebration invites the next size the moment a
finish unlocks it. See `docs/kiddo-adaptive-play.md` for the whole story.

### Rewards belong to the world

`WORLD_REWARDS` gives each world its own thing to collect — a flower, an
animal friend, a page — with the words the celebration says the first time a
door is finished. Playing a door again is still celebrated, but nothing new
is grown.

## The stale-question bug

The last question used to stay on screen inside the next one. The cause was
in `ChoiceStage`: the prompt and the options row were siblings keyed with the
same `challenge.id`. When the question changed, React matched the old
prompt's key against the new options' key (and vice versa), so instead of an
unmount + mount it reconciled across the two and the old prompt lingered. The
keys are now `${id}:prompt` and `${id}:options`. No timeouts were added;
`scripts/repro-stale.mjs` samples the transition every 100ms and
`scripts/measure-journey.mjs` asserts no sample ever has two prompts.

## Measuring it

```
npm run build && npm start -- -p 4310
node scripts/measure-journey.mjs [--quick] [--shots=<dir>]
```

Fifteen checks, in the order a child meets them, on all eight screens.
