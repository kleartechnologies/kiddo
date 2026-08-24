"use client";

import { useId, useState } from "react";
import { Smile } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { MAX_CHILD_NAME_LENGTH } from "@/lib/profile/child";
import { greetingFor } from "@/lib/profile/greeting";
import { setChildName, useChildName } from "@/lib/profile/useChildName";

/**
 * Where a grown-up tells KIDDO who is playing.
 *
 * On the parent side, because it is the only side with typing on it — the
 * child experience is taps, and asking a four-year-old to spell their own name
 * before they are allowed to play is a worse product than not knowing it.
 *
 * The whole control is one text box. There is no save button because there is
 * nothing to save to: the value lands in this device's storage as it is typed
 * and reaches the child's screen the moment it does. Emptying the box removes
 * it, which is why there is no "delete" either — the box being empty *is* the
 * absence of a name, and a parent should not have to learn a second gesture to
 * express that.
 *
 * The preview underneath is the honest part. The name that gets kept is the
 * first word of what was typed, and rather than explain that rule the card
 * shows the sentence a child will actually see.
 */
export function ChildNameField() {
  const stored = useChildName();
  /* The box holds what is being typed; the store holds what is being kept.
     They differ mid-word — "Noah W" is stored as "Noah" — and forcing the
     input back to the stored value would fight the parent's cursor. */
  const [typed, setTyped] = useState<string | null>(null);
  const value = typed ?? stored ?? "";

  const fieldId = useId();
  const hintId = `${fieldId}-hint`;

  /* Seeded at zero rather than from the visit: this is a sample of the
     greeting, and a preview that reshuffles itself while a parent types would
     read as a bug. */
  const { hello, invitation } = greetingFor(stored, 0);

  return (
    <Card className="flex flex-col gap-4" padding="lg">
      <div className="flex items-start gap-4">
        <span className="bg-sage-soft text-sage-ink flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <Smile className="size-6" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold sm:text-xl">
            Let KIDDO say hello
          </h2>
          <p className="text-ink-500 mt-1 text-base leading-snug">
            Add your child&rsquo;s first name or nickname and KIDDO will greet
            them by it. Leave it empty and KIDDO simply says hello.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={fieldId} className="text-ink-700 text-base font-semibold">
          First name or nickname
        </label>
        <input
          id={fieldId}
          name="child-name"
          type="text"
          value={value}
          onChange={(event) => {
            setTyped(event.target.value);
            setChildName(event.target.value);
          }}
          maxLength={MAX_CHILD_NAME_LENGTH}
          placeholder="Noah"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={hintId}
          className="bg-paper border-edge text-ink-900 placeholder:text-ink-300 min-h-14 rounded-tile border-2 px-4 text-lg"
        />
        <p id={hintId} className="text-ink-500 text-sm leading-snug">
          Kept on this device only, never sent anywhere, and only ever shown on
          your child&rsquo;s own screen. First names work best &mdash; anything
          after the first word is discarded.
        </p>
      </div>

      <p
        aria-live="polite"
        className="bg-cream-100 text-ink-700 rounded-tile px-4 py-3 text-base"
      >
        <span className="text-ink-700">KIDDO will say:</span>{" "}
        <span className="font-display font-semibold">
          {hello} {invitation}
        </span>
      </p>
    </Card>
  );
}
