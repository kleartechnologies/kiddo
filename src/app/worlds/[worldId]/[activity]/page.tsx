import { notFound } from "next/navigation";

import { WorldActivityGame } from "@/components/worlds/WorldActivityGame";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { doorKey } from "@/lib/i18n/names";
import { findWorldActivity, WORLD_ACTIVITIES } from "@/lib/worlds/activities";

/**
 * One door in a world: `/worlds/<world>/<activity>`.
 *
 * The round inside is General Knowledge Quest's machine over the door's own
 * five-question plan — see `WorldActivityGame`. Nothing about the child is
 * in the URL; the journey stays in the browser.
 */
export function generateStaticParams() {
  return WORLD_ACTIVITIES.map((activity) => ({
    worldId: activity.world,
    activity: activity.slug,
  }));
}

export async function generateMetadata(
  props: PageProps<"/worlds/[worldId]/[activity]">,
) {
  const { worldId, activity } = await props.params;
  const door = findWorldActivity(worldId, activity);
  /* English, at build time — see the world map's title beside this one. */
  return { title: door ? translate(DEFAULT_LOCALE, doorKey(door, "title")) : "Play" };
}

export default async function WorldActivityRoute(
  props: PageProps<"/worlds/[worldId]/[activity]">,
) {
  const { worldId, activity } = await props.params;
  const found = findWorldActivity(worldId, activity);
  if (!found) notFound();
  return <WorldActivityGame key={found.id} activity={found} />;
}
