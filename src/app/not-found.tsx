import { T } from "@/components/i18n/T";
import { ButtonLink } from "@/components/ui/Button";
import { KIDDO_HOME } from "@/lib/routes";
import { CharacterFigure } from "@/components/kiddo/CharacterFigure";
import { SpeechBubble } from "@/components/kiddo/SpeechBubble";
import { Screen } from "@/components/ui/Screen";

/** Getting lost should still feel like part of the world. */
export default function NotFound() {
  return (
    <Screen width="narrow">
      <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <SpeechBubble tail="bottom" className="max-w-md">
          <p className="font-display text-2xl font-semibold sm:text-3xl">
            <T k="notfound.title" />
          </p>
        </SpeechBubble>
        <CharacterFigure id="foxy" size="xl" />
        <ButtonLink href={KIDDO_HOME} size="lg">
          <T k="notfound.cta" />
        </ButtonLink>
      </main>
    </Screen>
  );
}
