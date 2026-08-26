import { notFound } from "next/navigation";

import { WorldPage } from "@/components/worlds/WorldPage";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { isPlayableWorld, PLAYABLE_WORLDS } from "@/lib/worlds/activities";
import { WORLD_PLACES } from "@/lib/worlds/places";

/**
 * A world's map: `/worlds/<world>`.
 *
 * Three of them, prerendered. Everything a child has done there is read in
 * the browser from the journey, so the page itself is the same for everyone.
 */
export function generateStaticParams() {
  return PLAYABLE_WORLDS.map((worldId) => ({ worldId }));
}

export async function generateMetadata(props: PageProps<"/worlds/[worldId]">) {
  const { worldId } = await props.params;
  /* English, at build time, like every other title in the app: the tab is
     part of the prerendered HTML and the reader's language is not known
     until the page is in their browser. */
  return {
    title: isPlayableWorld(worldId)
      ? translate(DEFAULT_LOCALE, WORLD_PLACES[worldId].name)
      : "World",
  };
}

export default async function WorldRoute(props: PageProps<"/worlds/[worldId]">) {
  const { worldId } = await props.params;
  if (!isPlayableWorld(worldId)) notFound();
  return <WorldPage place={WORLD_PLACES[worldId]} />;
}
