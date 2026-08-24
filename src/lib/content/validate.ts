import { createRng } from "./rng";
import type { Activity, Challenge, ContentPack } from "./types";

/**
 * Authoring checks.
 *
 * Types stop a challenge being the wrong shape. They cannot stop it being
 * unanswerable — an `answerId` that is not among the options, a single-option
 * question, two challenges sharing an id. Those are the mistakes that arrive
 * with the ninety-first hand-written question, and they are cheap to catch.
 *
 * Nothing calls this in the product. It is for a test, a script, or the day a
 * content page exists. It returns problems rather than throwing, because an
 * author wants the whole list, not the first one.
 */
export function validateChallenge(challenge: Challenge): string[] {
  const problems: string[] = [];
  const where = challenge.id;
  const { payload } = challenge;

  switch (payload.kind) {
    case "choice": {
      const ids = payload.options.map((option) => option.id);
      if (payload.options.length < 2) {
        problems.push(`${where}: a choice needs at least two options`);
      }
      if (new Set(ids).size !== ids.length) {
        problems.push(`${where}: two options share an id`);
      }
      if (!ids.includes(payload.answerId)) {
        problems.push(`${where}: answerId "${payload.answerId}" is not an option`);
      }
      break;
    }

    case "order": {
      const ids = payload.items.map((item) => item.id);
      if (new Set(ids).size !== ids.length) {
        problems.push(`${where}: two items share an id`);
      }
      if (payload.answerOrder.length !== payload.items.length) {
        problems.push(`${where}: answerOrder does not cover every item`);
      }
      if (payload.answerOrder.some((id) => !ids.includes(id))) {
        problems.push(`${where}: answerOrder names an item that is not there`);
      }
      /* And each item exactly once. Without this an answerOrder of the right
         length, naming only real items, can still name one of them twice and
         leave another unreachable — a board with no right answer at all. */
      if (new Set(payload.answerOrder).size !== payload.answerOrder.length) {
        problems.push(`${where}: answerOrder names an item twice`);
      }
      break;
    }

    case "match": {
      const ids = payload.pairs.map((pair) => pair.id);
      if (payload.pairs.length < 2) {
        problems.push(`${where}: a match needs at least two pairs`);
      }
      if (new Set(ids).size !== ids.length) {
        problems.push(`${where}: two pairs share an id`);
      }
      break;
    }

    case "connect": {
      const leftIds = payload.left.map((node) => node.id);
      const rightIds = payload.right.map((node) => node.id);

      if (payload.pairs.length < 2) {
        problems.push(`${where}: a connect needs at least two pairs`);
      }
      if (new Set(leftIds).size !== leftIds.length) {
        problems.push(`${where}: two left nodes share an id`);
      }
      if (new Set(rightIds).size !== rightIds.length) {
        problems.push(`${where}: two right nodes share an id`);
      }

      /* A line to a node that is not on the board. */
      for (const pair of payload.pairs) {
        if (!leftIds.includes(pair.leftId)) {
          problems.push(`${where}: pair names a left node "${pair.leftId}" that is not there`);
        }
        if (!rightIds.includes(pair.rightId)) {
          problems.push(`${where}: pair names a right node "${pair.rightId}" that is not there`);
        }
      }

      /* One line per node, both ends. Two lines out of the same node would be
         two right answers, and `checkStep` would accept either. */
      const pairedLeft = payload.pairs.map((pair) => pair.leftId);
      const pairedRight = payload.pairs.map((pair) => pair.rightId);
      if (new Set(pairedLeft).size !== pairedLeft.length) {
        problems.push(`${where}: a left node is in two pairs`);
      }
      if (new Set(pairedRight).size !== pairedRight.length) {
        problems.push(`${where}: a right node is in two pairs`);
      }

      /* And the other way round: a node no line reaches is a node the child
         can never join, so the board could never be finished. */
      if (leftIds.some((id) => !pairedLeft.includes(id))) {
        problems.push(`${where}: a left node is in no pair`);
      }
      if (rightIds.some((id) => !pairedRight.includes(id))) {
        problems.push(`${where}: a right node is in no pair`);
      }
      break;
    }
  }

  if (!challenge.prompt.speech.trim()) {
    problems.push(`${where}: a challenge with nothing to say cannot be asked`);
  }

  return problems;
}

/**
 * @param sample How many challenges to draw from a generated activity. A
 * generator is infinite; checking it means checking a handful per level.
 */
export function validateActivity(activity: Activity, sample = 12): string[] {
  const problems: string[] = [];

  if (activity.levels.length === 0) {
    problems.push(`${activity.id}: offers no levels`);
  }

  if (activity.source === "static") {
    const challenges = activity.challenges;
    if (challenges.length === 0) {
      problems.push(`${activity.id}: a static activity with no challenges`);
    }
    const ids = challenges.map((challenge) => challenge.id);
    if (new Set(ids).size !== ids.length) {
      problems.push(`${activity.id}: two challenges share an id`);
    }
    for (const challenge of challenges) {
      problems.push(...validateChallenge(challenge));
      if (challenge.payload.kind !== activity.kind) {
        problems.push(
          `${challenge.id}: a ${challenge.payload.kind} payload in a ${activity.kind} activity`,
        );
      }
    }
  } else {
    for (const level of activity.levels) {
      for (let index = 0; index < sample; index++) {
        const challenge = activity.generate({
          level,
          rng: createRng(level * 1000 + index),
          index,
        });
        problems.push(...validateChallenge(challenge));
        if (challenge.level !== level) {
          problems.push(`${challenge.id}: generated at the wrong level`);
        }
        if (challenge.payload.kind !== activity.kind) {
          problems.push(
            `${challenge.id}: a ${challenge.payload.kind} payload in a ${activity.kind} activity`,
          );
        }
      }
    }
  }

  return problems;
}

export function validatePack(pack: ContentPack): string[] {
  const problems: string[] = [];
  const ids = pack.activities.map((activity) => activity.id);

  if (new Set(ids).size !== ids.length) {
    problems.push(`${pack.id}: two activities share an id`);
  }
  for (const activity of pack.activities) {
    if (activity.packId !== pack.id) {
      problems.push(`${activity.id}: sitting in the ${pack.id} pack`);
    }
    problems.push(...validateActivity(activity));
  }

  return problems;
}
