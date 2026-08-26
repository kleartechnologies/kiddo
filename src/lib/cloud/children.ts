/**
 * How many children one account may hold, and where they live.
 *
 * A child document is created by the browser, directly in Firestore, so
 * the only place a limit can be enforced is `firestore.rules` — and rules
 * cannot count the documents in a collection. What they *can* do is say
 * which document ids exist, so the cap is the id: a parent may create a
 * child at `{uid}-0` through `{uid}-5` and nowhere else. No counter to
 * keep in step, and deleting a child gives its slot back.
 *
 * Six is a family, not a classroom. KIDDO's own onboarding creates exactly
 * one child; the rest is room for a large family and for a parent who
 * starts over. `tests/journey.test.ts` checks that this number and the
 * slots in `firestore.rules` still agree.
 */
export const MAX_CHILDREN_PER_PARENT = 6;

/** The only child ids this parent may create, in the order they are taken. */
export function childSlotIds(parentId: string): string[] {
  return Array.from({ length: MAX_CHILDREN_PER_PARENT }, (_, index) => `${parentId}-${index}`);
}
