repo: kleartechnologies/kiddo
branch: main
path: src, docs

## Last sync

date: 2026-08-24T18:22:33Z

### Updated in this project

- Redesigned all five characters (KIDDO, FOXY, BIBI, PIP, WALLY) as one family, against the supplied reference sheet.
- Rebuilt six child-facing screens at 390×844; Connect, Choice and Counting are live prototypes.
- Re-tuned the six accent hues for chroma; documented the two canon rules the reference overturns.
- Matched the chrome to source: BackLink, SoundToggle and ProgressDots redrawn with lucide shapes, no emoji anywhere child-facing.
- No product code changed — visual proposal only, per brief §20.

## Screen map

| Project screen | Repo files it is built from |
| --- | --- |
| KIDDO Character Family.dc.html | `src/components/character/canon.ts`, `poses.ts`, `expressions.tsx`, `parts.tsx`, `Friend.tsx`; `src/data/characters.ts`; `src/app/globals.css` |
| Child Experience · World selection | `src/components/worlds/WorldDoor.tsx`, `WorldScene.tsx`, `WorldKeepsake.tsx`; `src/lib/worlds/places.ts`; `src/app/play/page.tsx` |
| Child Experience · Activity intro + tiers | `src/components/worlds/WorldActivityGame.tsx`, `TierPicker.tsx`; `src/components/games/world/worlds/counting.tsx`; `src/lib/worlds/introPreview.ts`, `activities.ts` |
| Child Experience · Connect | `src/components/games/engines/ConnectStage.tsx`; `src/lib/games/engines/connect.ts`, `useConnect.ts`; `src/components/games/world/worlds/animals.tsx`; `src/lib/content/packs/general-knowledge/habitats.ts` |
| Child Experience · Choice | `src/components/games/engines/ChoiceStage.tsx`; `src/components/kiddo/ChoiceTile.tsx`; `src/lib/content/packs/general-knowledge/animals.ts` |
| Child Experience · Counting | `src/components/games/engines/ChoiceStage.tsx`, `PromptDisplay.tsx`; `src/components/games/world/worlds/counting.tsx`; `src/lib/content/packs/math/countingObjects.ts` |
| Child Experience · Celebrations ×4 | `src/components/kiddo/Celebration.tsx`; `src/components/worlds/WorldKeepsake.tsx`; `src/lib/journey/journey.ts` |
| Child Experience · shared chrome (all screens) | `src/components/kiddo/BackLink.tsx`, `SoundToggle.tsx`, `ProgressDots.tsx`; `src/components/games/GameShell.tsx`; `src/components/ui/Button.tsx`, `Screen.tsx`; `src/components/kiddo/SpeechBubble.tsx` |
| KIDDO Visual System.dc.html | `src/app/globals.css`, `src/lib/accents.ts`, `src/lib/content/art.ts`, `src/lib/worlds/worlds.ts`, `docs/kiddo-child-experience-audit.md`, `docs/kiddo-visual-system.md`, `docs/kiddo-game-worlds.md`, `docs/kiddo-visual-play.md` |

## Source notes

- Design tokens: `src/app/globals.css` (@theme) — cream/ink/6 accent hues, radius tile/card/hero, shadow soft/lift.
- Worlds as places: `src/lib/worlds/places.ts` (Counting Garden · sprout · WALLY, Animal Adventure · apricot · FOXY, Word World · blossom · BIBI).
- Worlds as presentation profiles: `src/lib/worlds/worlds.ts` + `src/components/games/world/worlds/*.tsx` (backdrop, padding, entrance, composeChoice/Connect/Intro).
- Doors and tiers: `src/lib/worlds/activities.ts` (9 doors, Tier 1/2/3 = Easy/Medium/Hard, keepsakes flower/animal/page).
- Illustration library: `src/lib/content/art.ts` (44 ArtIds) → `src/components/kiddo/artwork/illustrations/*` with `paint.ts`. No pig, ever (`src/lib/content/vocabulary.ts`, `tests/safety.test.ts`).
- Audit driving this work: `docs/kiddo-child-experience-audit.md` (P0: empty activity intro, flat celebration hierarchy, no first-touch invitation on Connect).
- Chrome icons come from lucide-react (already a dependency): `ArrowLeft` (BackLink), `Volume2`/`VolumeX` (SoundToggle — a speaker, never a musical note), `Check`, `ArrowRight`, `Lock` (TierPicker), `Sparkles` (primary button), `Search` (retry badge). Redrawn as inline SVG in the prototypes; no emoji in child-facing chrome.
- ProgressDots geometry: done = 10px sprout dot, current = 24×10 honey pill, upcoming = ink at 12%.
- Not yet designed: Order and Match screens (spec'd in §6 of the visual system, screens outstanding).
