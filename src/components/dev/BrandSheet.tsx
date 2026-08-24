import { KiddoWordmark } from "@/components/kiddo/KiddoWordmark";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { Hills, Sun, Cloud, GroundThing } from "@/components/kiddo/world/scenery";
import { WorldScene } from "@/components/worlds/WorldScene";
import { PLAYABLE_WORLDS } from "@/lib/worlds/activities";
import { WORLD_PLACES } from "@/lib/worlds/places";

/**
 * The brand assets, drawn once from production parts.
 *
 * Each block is sized in CSS pixels to the file it becomes and carries a
 * `data-asset` name the script clips on. KIDDO here is the compact head
 * mark the rig already switches to below 64px — the same shape a child sees
 * in a tile — on the cream paper every screen is painted on. The maskable
 * icon is the same mark with the safe-zone padding Android asks for.
 */
export function BrandSheet() {
  return (
    <div className="flex flex-col items-start gap-8 bg-[#888] p-8">
      {/* App icon: the head mark on paper, sized so the head fills ~70%. */}
      <div data-asset="icon" className="bg-cream-100 relative size-[512px] overflow-hidden rounded-[112px]">
        <div className="absolute inset-0 flex items-center justify-center">
          <CharacterFigure id="kiddo" size="sm" alive={false} expression="happy" className="!size-[400px]" />
        </div>
      </div>

      {/* Maskable: same mark, inside the 80% safe circle, no rounding. */}
      <div data-asset="maskable" className="bg-cream-100 relative size-[512px] overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <CharacterFigure id="kiddo" size="sm" alive={false} expression="happy" className="!size-[320px]" />
        </div>
      </div>

      {/* Social card, 1200×630: the wordmark and the line, with the three
          worlds and KIDDO standing in front of them. */}
      <div
        data-asset="og"
        className="bg-cream-100 relative h-[630px] w-[1200px] overflow-hidden"
      >
        <div className="bg-tide-soft/60 absolute inset-0" />
        <Sun accent="honey" className="absolute top-[6%] right-[6%] w-[7%]" />
        <Cloud className="absolute top-[10%] left-[6%] w-[11%] opacity-90" />
        <Hills hills={["tide", "sprout", "sage"]} className="absolute inset-x-0 bottom-[10%] h-[34%] w-full" />
        <div className="bg-sprout-soft absolute inset-x-0 bottom-0 h-[12%]" />
        <GroundThing cover="flowers" accent="blossom" className="absolute bottom-[6%] left-[8%] w-[3%]" />
        <GroundThing cover="flowers" accent="honey" className="absolute bottom-[4%] right-[10%] w-[3%]" />

        <div className="absolute inset-0 flex items-center justify-between px-16">
          <div className="flex max-w-[470px] flex-col gap-6">
            <KiddoWordmark size="lg" className="!text-7xl" />
            <p className="font-display text-ink-900 text-[46px] leading-[1.08] font-bold text-balance">
              Learning should feel like an adventure.
            </p>
            <p className="text-ink-700 text-[22px] leading-snug">
              Playful little worlds for children aged 4 to 8.
            </p>
          </div>
          <div className="relative flex w-[520px] items-end justify-center">
            <ul className="grid list-none grid-cols-3 items-center gap-3">
              {PLAYABLE_WORLDS.map((id, index) => (
                <li
                  key={id}
                  className={[
                    "bg-paper border-edge overflow-hidden rounded-card border p-2 shadow-lift",
                    index === 0 ? "-rotate-6 translate-y-4" : index === 2 ? "rotate-6 translate-y-4" : "-translate-y-3",
                  ].join(" ")}
                >
                  <div className="relative aspect-[4/5] w-[150px] overflow-hidden rounded-[1.25rem]">
                    <WorldScene world={id} />
                  </div>
                  <p className="font-display text-ink-900 truncate pt-2 pb-1 text-center text-sm font-semibold">
                    {WORLD_PLACES[id].name}
                  </p>
                </li>
              ))}
            </ul>
            <div className="absolute -bottom-9 -left-[5rem]">
              <CharacterFigure id="kiddo" size="xl" pose="wave" alive={false} className="!size-[190px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
