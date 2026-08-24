# /public/audio

Everything KIDDO plays. Two kinds of file and one registry:
`src/lib/audio/tracks.ts` names them, and nothing else in the product knows
these paths.

| File | What it is |
| --- | --- |
| `kiddo-world.wav` | The looping bed for the play experience. |
| `tap.wav` | A finger landing on something. |
| `button.wav` | A control being used, rather than an answer given. |
| `correct.wav` | Right. |
| `retry.wav` | Not right — warm and falling, never a buzzer. |
| `complete.wav` | A round finished. |

## These are placeholders

They were synthesised from sine partials by
`scripts/make-placeholder-audio.mjs`, in this repo, so there is nothing
licensed here. They exist so the sound system is real and testable before the
real KIDDO music is written. Each one is flagged `placeholder: true` in the
registry, so what is still outstanding is a question the code answers.

**Replacing one is a new file here and one line in `tracks.ts`.** Nothing
else. Point `src` at the new file and delete its `placeholder` flag:

```ts
world: { src: "/audio/kiddo-world.mp3", gain: 1 },
```

The container does not have to match. Files are fetched and handed to
`decodeAudioData`, so wav, mp3, ogg and m4a are all the same to the engine,
and no component, hook or test names a file or a format. If the new master
sits hotter or quieter than the placeholder, trim it with `gain` rather than
re-mastering the file.

## What a replacement has to be

- **The bed must loop joinlessly.** It is played through an
  `AudioBufferSourceNode` with `loop = true`, which is sample-accurate — so the
  file itself has to meet its own start. No fade in and no fade out: a fade
  *is* the seam. Trim to a whole number of bars.
- **Quiet.** The bed is capped at `MAX_MUSIC_VOLUME` (0.45) and ships at 0.22.
  Master with headroom rather than to the limiter; a child's first second of
  KIDDO must never be loud.
- **Effects stay under a second.** They are replies to a tap, and a reply that
  outlasts the next tap stops being one.
- **Nothing startling.** No sharp transients, no buzzers, no descending minor
  seconds. `retry.wav` in particular is an invitation, not a verdict: it says
  "let's try again", never "you got that wrong". KIDDO does not scold.
