"use client";

import { useState } from "react";

import { Card, Chip } from "@/components/ui/Card";
import { Kiddo } from "@/components/character/Kiddo";
import { Friend, type FriendId } from "@/components/character/Friend";
import {
  BODY_CENTRE,
  BLUSH,
  HONEY,
  HUES,
  INK,
  PIVOTS,
  TIMING,
  VIEWBOX,
} from "@/components/character/canon";
import { EXPRESSION_ORDER, FACES } from "@/components/character/expressions";
import { Arm, Body, Cheeks, Ear, Leg, Shadow } from "@/components/character/parts";
import { POSES, POSE_ORDER, type Pose } from "@/components/character/poses";
import { CHARACTER_LIST } from "@/data/characters";
import { cn } from "@/lib/cn";

/**
 * The KIDDO character specification.
 *
 * Internal reference, not linked from the product. Everything on this page is
 * rendered by the same components the product uses, so it cannot drift from
 * the real character the way a static spec sheet would.
 */

function Section({
  index,
  title,
  lead,
  children,
}: {
  index: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="max-w-2xl">
        <p className="text-ink-300 font-display text-sm font-semibold tracking-[0.18em] uppercase">
          {index}
        </p>
        <h2 className="font-display mt-1 text-3xl font-bold sm:text-4xl">{title}</h2>
        {lead ? <p className="text-ink-500 mt-3 text-lg">{lead}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Tile({
  caption,
  note,
  children,
  className,
}: {
  caption: string;
  note?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card padding="none" className={cn("overflow-hidden", className)}>
      <div className="bg-cream-100 flex aspect-square items-center justify-center p-4">
        {children}
      </div>
      <div className="border-edge border-t px-4 py-3">
        <p className="font-display text-base font-semibold">{caption}</p>
        {note ? <p className="text-ink-500 mt-0.5 text-sm leading-snug">{note}</p> : null}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------------------
   D · Layer structure
   The same idle rig, drawn one layer at a time with the rest ghosted.
   -------------------------------------------------------------------------- */

type LayerId =
  | "leftEar"
  | "rightEar"
  | "body"
  | "leftArm"
  | "rightArm"
  | "leftLeg"
  | "rightLeg"
  | "face";

const LAYERS: { id: LayerId; label: string; note: string }[] = [
  { id: "leftEar", label: "Left ear", note: "Trails the breathe by 120ms" },
  { id: "rightEar", label: "Right ear", note: "Same shape, mirrored" },
  { id: "body", label: "Core body", note: "One mass, not a head on a body" },
  { id: "leftArm", label: "Left arm", note: `Pivot ${PIVOTS.leftArm.x}, ${PIVOTS.leftArm.y}` },
  { id: "rightArm", label: "Right arm", note: `Pivot ${PIVOTS.rightArm.x}, ${PIVOTS.rightArm.y}` },
  { id: "leftLeg", label: "Left leg", note: `Pivot ${PIVOTS.leftLeg.x}, ${PIVOTS.leftLeg.y}` },
  { id: "rightLeg", label: "Right leg", note: `Pivot ${PIVOTS.rightLeg.x}, ${PIVOTS.rightLeg.y}` },
  { id: "face", label: "Face layer", note: "Eyes, mouth, blush. The whole expression system" },
];

function LayerDiagram({ highlight }: { highlight: LayerId }) {
  const hue = HUES.kiddo;
  const on = (id: LayerId) => (highlight === id ? 1 : 0.12);
  const face = FACES.happy;

  return (
    <svg viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} className="h-full w-full">
      <g opacity={on("leftArm")} transform="translate(54,112) rotate(24)">
        <Arm hue={hue} />
      </g>
      <g opacity={on("rightArm")} transform="translate(146,112) rotate(-24)">
        <Arm hue={hue} />
      </g>
      <g opacity={on("leftLeg")} transform="translate(80,166)">
        <Leg hue={hue} />
      </g>
      <g opacity={on("rightLeg")} transform="translate(120,166)">
        <Leg hue={hue} />
      </g>
      <g opacity={on("leftEar")}>
        <Ear side="left" hue={hue} />
      </g>
      <g opacity={on("rightEar")}>
        <Ear side="right" hue={hue} />
      </g>
      <g opacity={on("body")}>
        <Body hue={hue} />
      </g>
      <g opacity={on("face")}>
        {face.eyes}
        {face.mouth}
        <Cheeks opacity={face.cheeks} />
      </g>
    </svg>
  );
}

/** The construction grid: eye line, pivots, and the body centre. */
function RigDiagram() {
  const hue = HUES.kiddo;
  const pivots = [
    PIVOTS.leftArm,
    PIVOTS.rightArm,
    PIVOTS.leftLeg,
    PIVOTS.rightLeg,
  ];
  return (
    <svg viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} className="h-full w-full">
      <Shadow />
      <g transform="translate(54,112) rotate(24)"><Arm hue={hue} /></g>
      <g transform="translate(146,112) rotate(-24)"><Arm hue={hue} /></g>
      <g transform="translate(80,166)"><Leg hue={hue} /></g>
      <g transform="translate(120,166)"><Leg hue={hue} /></g>
      <Ear side="left" hue={hue} />
      <Ear side="right" hue={hue} />
      <Body hue={hue} />
      <g opacity={0.5}>
        {FACES.happy.eyes}
        {FACES.happy.mouth}
      </g>

      {/* Annotations */}
      <line x1={8} y1={110} x2={192} y2={110} stroke={INK} strokeWidth={1} strokeDasharray="4 4" opacity={0.45} />
      <text x={8} y={104} fill={INK} opacity={0.55} fontSize={9} fontFamily="var(--font-sans)">
        eye line
      </text>
      {pivots.map((p) => (
        <g key={`${p.x}-${p.y}`}>
          <circle cx={p.x} cy={p.y} r={5} fill="none" stroke={INK} strokeWidth={1.5} opacity={0.55} />
          <circle cx={p.x} cy={p.y} r={1.5} fill={INK} opacity={0.55} />
        </g>
      ))}
      <circle cx={BODY_CENTRE.x} cy={BODY_CENTRE.y} r={3} fill={INK} opacity={0.35} />
    </svg>
  );
}

/* --------------------------------------------------------------------------
   C · Animation states
   -------------------------------------------------------------------------- */

const STATES: { pose: Pose; label: string; motion: string }[] = [
  { pose: "idle", label: "Idle", motion: "Breathe 1.00 → 1.02 over 2.4s, ears lag 120ms, blink every 3–7s" },
  { pose: "think", label: "Thinking", motion: "Tilt 4°, eyes up, three dots rising. Body keeps breathing" },
  { pose: "cheer", label: "Happy", motion: "Lift 4, gentle 0.9s bounce, two honey sparkles" },
  { pose: "celebrate", label: "Celebrate", motion: "Arms to 102°, legs kicked out, three confetti marks" },
  { pose: "reassure", label: "Encourage", motion: "Lean −5° towards the child, open hand, closed-eye smile" },
  { pose: "wonder", label: "Confused", motion: "Tilt 7°, one eye squints, mouth goes wavy. Never a frown" },
  { pose: "receive", label: "Surprised", motion: "Both arms up, eyes widen, the reward drops between them" },
  { pose: "hint", label: "Wink", motion: "One eye closes, arm half-raised. A nudge, not an answer" },
  { pose: "rest", label: "Sleepy", motion: "Lean −10°, relaxed eyes, slow dots. Ends screen time quietly" },
  { pose: "wave", label: "Wave", motion: "One arm swings 18° on a 1.1s loop. The other arm stays put" },
];

function StatePlayer() {
  const [pose, setPose] = useState<Pose>("idle");
  const active = STATES.find((s) => s.pose === pose) ?? STATES[0];

  return (
    <Card padding="lg" className="flex flex-col gap-6 lg:flex-row lg:items-center">
      <div className="bg-cream-100 rounded-card flex size-64 shrink-0 items-center justify-center self-center">
        <Kiddo pose={pose} className="size-52" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {STATES.map((state) => (
            <button
              key={state.pose}
              type="button"
              onClick={() => setPose(state.pose)}
              aria-pressed={pose === state.pose}
              className={cn(
                "font-display rounded-full px-4 py-2 text-base font-semibold transition-colors",
                pose === state.pose
                  ? "bg-ink-900 text-cream-50"
                  : "bg-cream-100 text-ink-700 hover:bg-cream-100/60",
              )}
            >
              {state.label}
            </button>
          ))}
        </div>
        <p className="text-ink-500 text-lg">{active.motion}</p>
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------------------
   H · Guardrails
   -------------------------------------------------------------------------- */

const ALWAYS = [
  "Flat fills, one hue per character, white overlays for every lighter form.",
  "One ink for every face, at every size, always with a single offset highlight.",
  "The silhouette reads as a solid shape before any face is added.",
  "Encouraging faces on failure. KIDDO is puzzled with the child, never at them.",
  "At least 12% negative space around the character on every side.",
  "Breathing and blinking are the only motion unless a pose asks for more.",
];

const NEVER = [
  "Gradients, glow, drop shadows on the character, outlines or texture.",
  "A sixth hue, a neon tint, or two saturated colours on one character.",
  "Pupils inside the eye. The whole eye moves instead.",
  "Squash and stretch on the silhouette, or motion that never settles.",
  "Fingers, teeth, or a tongue outside the two open-mouth faces.",
  "Two characters celebrating at once, or two particle effects on one screen.",
];

/* --------------------------------------------------------------------------
   Page
   -------------------------------------------------------------------------- */

const SMALL_SIZES = [128, 64, 48, 40, 32, 24];

const ON_COLOUR: { label: string; hex: string; warn?: string }[] = [
  { label: "Paper", hex: "#FBF8F3" },
  { label: "Apricot", hex: HUES.foxy },
  { label: "Blossom", hex: HUES.bibi },
  { label: "Sprout", hex: HUES.pip },
  { label: "Tide", hex: HUES.wally },
  { label: "Sage", hex: HUES.kiddo, warn: "The one pairing to avoid" },
];

const PALETTE = [
  { name: "Sage", role: "KIDDO · brand primary", hex: HUES.kiddo },
  { name: "Apricot", role: "FOXY", hex: HUES.foxy },
  { name: "Blossom", role: "BIBI", hex: HUES.bibi },
  { name: "Sprout", role: "PIP", hex: HUES.pip },
  { name: "Tide", role: "WALLY", hex: HUES.wally },
  { name: "Honey", role: "Rewards, stars, confetti", hex: HONEY },
  { name: "Blush", role: "Cheeks only, 26–45%", hex: BLUSH },
  { name: "Ink", role: "Every face, all type", hex: INK },
];

const USAGE: { pose: Pose; title: string; line: string }[] = [
  { pose: "wave", title: "Onboarding", line: "Hi! What do you want to play?" },
  { pose: "point", title: "Instructions", line: "Tap the one that matches." },
  { pose: "cheer", title: "Correct answer", line: "Yes! That's the one." },
  { pose: "reassure", title: "Wrong answer", line: "That's okay — let's try another way." },
  { pose: "think", title: "Loading & empty", line: "Nothing here yet." },
  { pose: "receive", title: "Reward unlock", line: "You earned a new sticker!" },
  { pose: "celebrate", title: "Level complete", line: "You did it!" },
  { pose: "rest", title: "Session over", line: "That was a good one. See you soon." },
];

export function CharacterSpec() {
  return (
    <div className="flex flex-col gap-20 py-10">
      <header className="max-w-3xl">
        <p className="text-ink-300 font-display text-sm font-semibold tracking-[0.18em] uppercase">
          KIDDO · character system
        </p>
        <h1 className="font-display mt-2 text-5xl font-bold sm:text-6xl">
          One character. Many expressions.
        </h1>
        <p className="text-ink-500 mt-4 text-xl">
          The production specification for KIDDO. Every drawing on this page is
          rendered by the components the product ships, so the spec cannot drift
          from the character.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Chip>Flat vector</Chip>
          <Chip>8 layers · 4 pivots</Chip>
          <Chip>{EXPRESSION_ORDER.length} expressions</Chip>
          <Chip>{POSE_ORDER.length} poses</Chip>
        </div>
      </header>

      {/* ---------------------------------------------------------------- A */}
      <Section
        index="A — Master"
        title="The canonical KIDDO"
        lead="The approved character, drawn from the master sheet. Round mass, two big ears, sage green, white overlays for every lighter form, one warm near-black for the face, soft cheeks. Nothing here is open to interpretation."
      >
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <Card padding="lg" className="bg-cream-100 flex items-center justify-center">
            <Kiddo pose="idle" className="w-full max-w-sm" />
          </Card>
          <div className="flex flex-col gap-5">
            <Card padding="lg" className="flex items-center justify-center">
              <div className="h-64 w-full max-w-[16rem]">
                <RigDiagram />
              </div>
            </Card>
            <Card padding="lg">
              <h3 className="font-display text-xl font-semibold">Construction</h3>
              <dl className="text-ink-500 mt-3 space-y-1.5 text-base">
                <div className="flex justify-between gap-4">
                  <dt>Drawing area</dt>
                  <dd className="text-ink-900 font-semibold">200 × 230</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Eye line</dt>
                  <dd className="text-ink-900 font-semibold">y 110 · 48% of height</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Body</dt>
                  <dd className="text-ink-900 font-semibold">ellipse 112 × 108</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Ears</dt>
                  <dd className="text-ink-900 font-semibold">r 23 · inner r 11 @ 38%</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Hue</dt>
                  <dd className="text-ink-900 font-semibold">{HUES.kiddo}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Ink</dt>
                  <dd className="text-ink-900 font-semibold">{INK}</dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {PALETTE.map((swatch) => (
            <Card key={swatch.name} padding="none" className="overflow-hidden">
              <div className="h-16 w-full" style={{ background: swatch.hex }} />
              <div className="px-3 py-2.5">
                <p className="font-display text-sm font-semibold">{swatch.name}</p>
                <p className="text-ink-500 text-xs leading-snug">{swatch.role}</p>
                <p className="text-ink-300 mt-1 font-mono text-[0.7rem]">{swatch.hex}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- B */}
      <Section
        index="B — Expressions"
        title="Ten faces, one body"
        lead="The body never changes between these. Expression lives entirely in a swappable face layer, so a new emotion costs a few shapes rather than a new illustration."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {EXPRESSION_ORDER.map((id) => (
            <Tile key={id} caption={FACES[id].label} note={FACES[id].meaning}>
              <Kiddo expression={id} pose="idle" alive={false} className="size-full" />
            </Tile>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- C */}
      <Section
        index="C — Animation"
        title="Built to be animated"
        lead={`Breathe ${TIMING.breatheScale}× over ${TIMING.breatheSeconds}s, ears trailing ${TIMING.earLagSeconds * 1000}ms. Blink for ${TIMING.blinkSeconds * 1000}ms every ${TIMING.blinkMinGap}–${TIMING.blinkMaxGap}s. Pose changes settle in about ${TIMING.reactionSeconds * 1000}ms with a small overshoot and no squash. Every state below respects the reduced-motion setting.`}
      >
        <StatePlayer />
      </Section>

      {/* ---------------------------------------------------------------- D */}
      <Section
        index="D — Layers"
        title="Eight layers, four pivots"
        lead="Everything in the pose library is one of these parts rotated around a fixed point. The arm and the leg are the same two objects across the whole cast — only the rotation changes."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {LAYERS.map((layer) => (
            <Tile key={layer.id} caption={layer.label} note={layer.note}>
              <LayerDiagram highlight={layer.id} />
            </Tile>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- E */}
      <Section
        index="E — Scale"
        title="Down to 24px, and on colour"
        lead="Two variants only: the full body above 64px, the head mark below it. Detail is never added just because there is room — the 128px drawing is the 24px drawing."
      >
        <Card padding="lg" className="bg-cream-100 flex flex-wrap items-end justify-center gap-8">
          {SMALL_SIZES.map((px) => (
            <div key={px} className="flex flex-col items-center gap-3">
              <Kiddo size={px} alive={false} />
              <span className="text-ink-500 font-mono text-xs">{px}px</span>
            </div>
          ))}
        </Card>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {ON_COLOUR.map((bg) => (
            <Card key={bg.label} padding="none" className="overflow-hidden">
              <div
                className="flex aspect-square items-center justify-center"
                style={{ background: bg.hex }}
              >
                <Kiddo size={72} variant="compact" alive={false} />
              </div>
              <div className="border-edge border-t px-3 py-2.5">
                <p className="font-display text-sm font-semibold">{bg.label}</p>
                <p className={cn("text-xs leading-snug", bg.warn ? "text-retry" : "text-ink-500")}>
                  {bg.warn ?? "Readable, no outline needed"}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- F */}
      <Section
        index="F — Poses"
        title="A pose for every product moment"
        lead="Each pose is the same rig at different rotations, so any two can be tweened. A pose names a moment, not a feeling: the feeling is the expression, and it can be swapped."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {POSE_ORDER.map((id) => (
            <Tile key={id} caption={POSES[id].label} note={POSES[id].moment}>
              <Kiddo pose={id} alive={false} className="size-full" />
            </Tile>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- G */}
      <Section
        index="G — Usage"
        title="A companion, not the interface"
        lead="KIDDO appears at the edge of the moment and says one short thing. The mascot supports the screen; it never becomes the screen."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {USAGE.map((item) => (
            <Card key={item.title} padding="md" className="flex items-center gap-4">
              <div className="bg-cream-100 rounded-card flex size-24 shrink-0 items-center justify-center">
                <Kiddo pose={item.pose} alive={false} className="size-20" />
              </div>
              <div className="min-w-0">
                <p className="text-ink-300 font-display text-xs font-semibold tracking-[0.14em] uppercase">
                  {item.title}
                </p>
                <p className="font-display mt-1 text-lg leading-snug font-semibold text-balance">
                  “{item.line}”
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- H */}
      <Section
        index="H — Guardrails"
        title="What keeps this premium"
        lead="The character is warm. The product around it is calm, modern and quiet. If a change makes the interface louder rather than the character kinder, it is the wrong change."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Card padding="lg">
            <h3 className="font-display text-yes text-xl font-semibold">Always</h3>
            <ul className="text-ink-700 mt-4 space-y-3 text-base">
              {ALWAYS.map((rule) => (
                <li key={rule} className="flex gap-3">
                  <span className="bg-yes mt-2 size-1.5 shrink-0 rounded-full" aria-hidden />
                  {rule}
                </li>
              ))}
            </ul>
          </Card>
          <Card padding="lg">
            <h3 className="font-display text-retry text-xl font-semibold">Never</h3>
            <ul className="text-ink-700 mt-4 space-y-3 text-base">
              {NEVER.map((rule) => (
                <li key={rule} className="flex gap-3">
                  <span className="bg-retry mt-2 size-1.5 shrink-0 rounded-full" aria-hidden />
                  {rule}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      {/* --------------------------------------------------------- The cast */}
      <Section
        index="Appendix"
        title="One family, five silhouettes"
        lead="KIDDO is the only non-animal in the cast, so it stays the brand mark and carries the rig. The four friends host the game worlds and share the same arm, leg, eye and cheek primitives."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CHARACTER_LIST.map((character) => (
            <Tile
              key={character.id}
              caption={character.name}
              note={character.traits.join(" · ")}
            >
              {character.id === "kiddo" ? (
                <Kiddo alive={false} className="size-full" />
              ) : (
                <Friend id={character.id as FriendId} className="size-full" />
              )}
            </Tile>
          ))}
        </div>
      </Section>
    </div>
  );
}
