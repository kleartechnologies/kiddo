# KIDDO — child usability protocol

A manual test protocol for watching a real child (age 3–6) play KIDDO, written
so that any adult can run it and record the same things. **KIDDO has not yet
been child-tested against this protocol.** Nothing in this file is a result;
running the sessions and writing down what actually happened is the work, and
no observation below may be filled in from imagination or from an adult
playing "as" a child. An adult predicting what a child would do is exactly the
error this protocol exists to catch.

## How to run a session

- One child, one adult observer, one phone or tablet the child holds
  themselves. 10–15 minutes, or shorter the moment the child wants to stop.
- The adult may say what a parent would naturally say ("look, a game!") and
  answer direct questions, but never instructs ("tap the cow first"). The
  point is what the product communicates on its own.
- Start at `/play`, at level 1, with sound on. Note the device, viewport
  width, and whether the OS reduce-motion setting is on.
- Write observations down during play, not after. "She tapped the letter
  column three times before the picture column" is data; "she found it
  confusing" is interpretation — record the first, add the second only as a
  note.

## The ten observation points

1. **First touch.** On each new board, what does the child touch first, and
   how long after the board appears? Does the first touch land on something
   touchable?
2. **The connect affordance, without words.** On a connect board
   (home-partners, rhyming-partners, sound-partners): after choosing one
   card, does the child then move to the *other* column unprompted? Do the
   invited borders/ports visibly redirect them?
3. **The travel animation.** On home-partners, when the animal walks to its
   home: does the child say or show that they understood it as "going home"
   (pointing, narrating, smiling at the arrival) — or do they miss it?
4. **Recovering from a wrong join.** After a join that doesn't stick, does
   the child try a different partner without adult help? How many attempts
   before frustration signals appear?
5. **Naming the illustrations.** Pointing at drawn tiles (out of play, after
   the round): "what's this?" Record the child's word verbatim for each. A
   drawing a child names as something else is an ambiguity bug — file it.
6. **The prompt.** Does the child hear/read/understand what is being asked,
   or do they infer the task purely from the board? Both are acceptable;
   record which.
7. **Grip and reach.** On a phone (≤390px wide): can the child reach every
   target with the hand holding the device or do they reposition? Any
   accidental touches from the gripping palm?
8. **Reduced motion.** If the household device has reduce-motion on, run with
   it on. Does the child still understand chosen/joined/finished states?
9. **Frustration signals.** Timestamped: sighing, handing the device back,
   random tapping, asking for help, switching apps. Note which board and
   which state preceded each.
10. **Willingness to continue.** At the natural end of a round: does the
    child ask to keep playing? Record their words. Session length is chosen
    by the child; note when and why it ended.

## Recording

One markdown file per session under `docs/usability/` named
`YYYY-MM-DD-child-N.md` (no names, no photos — age in years, device, and the
ten points). Findings that demand a change become entries in the audit table
of `docs/kiddo-interactive-play.md`, with the session file cited.
