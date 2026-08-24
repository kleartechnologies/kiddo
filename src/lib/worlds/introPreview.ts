import type { Challenge, ContentItem, PromptPart } from "@/lib/content/types";

/**
 * What the way in shows a glimpse of: the things the round's first board is
 * *about*, picked from the challenge itself so the scene is always true.
 *
 * A joined-up board is about its two columns, so a couple of things from each
 * side stand in the scene. A tapped board is about its prompt — the cow the
 * question will ask about — so the prompt's own display items stand there;
 * **never the options**, because previewing the options is previewing the
 * answer. A question with nothing on its stage shows nothing, and the way in
 * is simply the friend, as it always was.
 */
export function introPreviewOf(
  challenge: Challenge | null | undefined,
): ContentItem[] {
  if (!challenge) return [];
  const payload = challenge.payload;
  if (payload.kind === "connect") {
    return [
      ...payload.left.slice(0, 2).map((node) => node.item),
      ...payload.right.slice(0, 2).map((node) => node.item),
    ];
  }
  if (payload.kind === "choice") {
    return (challenge.prompt.display ?? [])
      .filter(
        (part): part is Extract<PromptPart, { kind: "item" }> =>
          part.kind === "item",
      )
      .map((part) => part.item)
      .slice(0, 4);
  }
  return [];
}
