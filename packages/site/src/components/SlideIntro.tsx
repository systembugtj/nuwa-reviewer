import type { IntroSlide } from "../data/slides";

interface SlidePanelProps {
  slide: IntroSlide;
  active: boolean;
  exiting: boolean;
  direction: "forward" | "back";
}

export function SlidePanel({ slide, active, exiting, direction }: SlidePanelProps) {
  const state = exiting ? "exit" : active ? "active" : "idle";
  const motion =
    direction === "forward"
      ? exiting
        ? "exit-left"
        : "enter-right"
      : exiting
        ? "exit-right"
        : "enter-left";

  return (
    <article
      className={`slide-panel slide-panel--${slide.accent} slide-panel--${state} slide-panel--${motion}`}
      aria-hidden={!active && !exiting}
    >
      <div className="slide-panel__glow" aria-hidden />
      <p className="slide-panel__kicker">{slide.kicker}</p>
      <h2 className="slide-panel__title">
        {slide.title.split("\n").map((line, i) => (
          <span key={line} style={{ animationDelay: `${i * 80}ms` }}>
            {line}
            {i < slide.title.split("\n").length - 1 ? <br /> : null}
          </span>
        ))}
      </h2>
      <p className="slide-panel__body">{slide.body}</p>
      {slide.command ? (
        <pre className="slide-panel__command">
          <code>{slide.command}</code>
        </pre>
      ) : null}
      {slide.chips?.length ? (
        <ul className="slide-panel__chips">
          {slide.chips.map((chip) => (
            <li key={chip}>{chip}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

interface SlideChromeProps {
  index: number;
  total: number;
  progress: number;
  paused: boolean;
  onDot: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  onTogglePause: () => void;
}

export function SlideChrome({
  index,
  total,
  progress,
  paused,
  onDot,
  onPrev,
  onNext,
  onSkip,
  onTogglePause,
}: SlideChromeProps) {
  return (
    <div className="slide-chrome">
      <div className="slide-chrome__top">
        <span className="slide-chrome__brand">nuwa</span>
        <button type="button" className="slide-chrome__skip" onClick={onSkip}>
          Skip intro ↓
        </button>
      </div>

      <div className="slide-chrome__progress">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`slide-chrome__dot${i === index ? " is-active" : ""}${i < index ? " is-done" : ""}`}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index ? "step" : undefined}
            onClick={() => onDot(i)}
          >
            <span
              className="slide-chrome__dot-fill"
              style={{
                transform: `scaleX(${i === index ? progress : i < index ? 1 : 0})`,
              }}
            />
          </button>
        ))}
      </div>

      <div className="slide-chrome__bottom">
        <span className="slide-chrome__counter">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        <div className="slide-chrome__nav">
          <button
            type="button"
            onClick={onPrev}
            disabled={index === 0}
            aria-label="Previous slide"
          >
            ←
          </button>
          <button
            type="button"
            className="slide-chrome__pause"
            onClick={onTogglePause}
            aria-label={paused ? "Resume autoplay" : "Pause autoplay"}
          >
            {paused ? "▶" : "❚❚"}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={index >= total - 1}
            aria-label="Next slide"
          >
            →
          </button>
        </div>
        <span className="slide-chrome__hint">← → space · swipe</span>
      </div>
    </div>
  );
}
