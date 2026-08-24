"use client";

import { motion } from "framer-motion";

import { CharacterFigure } from "./CharacterFigure";
import { riseIn, springy, staggerChildren } from "@/lib/motion";
import { greetingFor } from "@/lib/profile/greeting";
import { useChildName } from "@/lib/profile/useChildName";
import { visitSeed } from "@/lib/profile/visit";

/**
 * The welcome. One question, asked large, with KIDDO standing next to it.
 *
 * Everything else on the screen is an answer to this question.
 *
 * When a grown-up has said who is playing, the question is asked of them by
 * name — KIDDO waves at the child, and the heading says the child's name back.
 * When nobody has, it is the same welcome it always was. Both come out of
 * `greetingFor`, so there is no branch here and no way for this component to
 * invent a name of its own.
 */
export function WorldHero() {
  const name = useChildName();
  /* Only ask for a seed once there is a name to vary: on the server, and on
     the render that hydrates it, there is neither. */
  const { hello, invitation } = greetingFor(name, name ? visitSeed() : 0);

  return (
    <motion.section
      variants={staggerChildren(0.12, 0.1)}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center gap-5 py-8 text-center sm:flex-row sm:gap-8 sm:py-12 sm:text-left"
    >
      <motion.div variants={riseIn} className="relative shrink-0">
        {/* A soft pool of light so KIDDO is standing somewhere, not floating. */}
        <div
          aria-hidden
          className="bg-honey-soft absolute inset-x-0 -bottom-2 mx-auto h-6 w-4/5 rounded-[50%] blur-[2px]"
        />
        {/* KIDDO leans when a hand lands on it and does nothing else, so it
            is not a stop on the way to the games. See `GameCard`. */}
        <motion.div
          whileHover={{ y: -6, rotate: -2 }}
          whileTap={{ scale: 0.95, rotate: 3 }}
          transition={springy}
          tabIndex={-1}
          className="relative"
        >
          <CharacterFigure id="kiddo" size="xl" pose="wave" />
        </motion.div>
      </motion.div>

      <motion.div variants={riseIn} className="space-y-3">
        <p className="text-ink-500 font-display text-base font-semibold tracking-wide sm:text-lg">
          Play. Learn. Smile.
        </p>
        {/* Two lines, always: the hello and the invitation are separate
            thoughts, and a name is not something to be met halfway down a
            line of text. `break-words` is the floor under an unusually long
            name on a 360px phone — it wraps rather than widening the page. */}
        <h1 className="font-display text-[2rem] leading-[1.05] font-bold text-balance break-words min-[380px]:text-4xl sm:text-5xl lg:text-6xl">
          {hello}
          <br />
          {invitation}
        </h1>
      </motion.div>
    </motion.section>
  );
}
