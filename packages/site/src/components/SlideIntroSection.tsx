import { useCallback } from "react";
import { INTRO_SLIDES } from "../data/slides";
import { useSlideDeck } from "../hooks/useSlideDeck";
import { SlideChrome, SlidePanel } from "./SlideIntro";

interface SlideIntroProps {
  onFinish: () => void;
}

export function SlideIntroSection({ onFinish }: SlideIntroProps) {
  const deck = useSlideDeck({
    total: INTRO_SLIDES.length,
    onComplete: onFinish,
  });

  const handleGoTo = useCallback(
    (next: number) => {
      if (next >= INTRO_SLIDES.length) {
        onFinish();
        return;
      }
      deck.goTo(next);
    },
    [deck, onFinish],
  );

  const visibleIndex =
    deck.isAnimating && deck.targetIndex !== null ? deck.targetIndex : deck.index;
  const outgoingIndex = deck.isAnimating ? deck.index : null;

  return (
    <section
      className="slide-intro"
      aria-label="Nuwa introduction"
      onMouseEnter={deck.pause}
      onMouseLeave={deck.resume}
    >
      <div className="slide-intro__stage">
        {outgoingIndex !== null ? (
          <SlidePanel
            slide={INTRO_SLIDES[outgoingIndex]!}
            active={false}
            exiting
            direction={deck.direction}
          />
        ) : null}
        <SlidePanel
          slide={INTRO_SLIDES[visibleIndex]!}
          active
          exiting={false}
          direction={deck.direction}
        />
      </div>

      <SlideChrome
        index={deck.index}
        total={INTRO_SLIDES.length}
        progress={deck.progress}
        paused={deck.paused}
        onDot={handleGoTo}
        onPrev={deck.prev}
        onNext={() => handleGoTo(deck.index + 1)}
        onSkip={onFinish}
        onTogglePause={() => (deck.paused ? deck.resume() : deck.pause())}
      />
    </section>
  );
}
