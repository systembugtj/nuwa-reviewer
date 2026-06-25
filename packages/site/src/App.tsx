import { useState } from "react";
import { QuickStart, SiteFooter } from "./components/QuickStart";
import { SlideIntroSection } from "./components/SlideIntroSection";

export function App() {
  const [introDone, setIntroDone] = useState(false);

  const scrollToContent = () => {
    setIntroDone(true);
    requestAnimationFrame(() => {
      document.getElementById("quickstart")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  return (
    <div className="app">
      {!introDone ? (
        <SlideIntroSection onFinish={scrollToContent} />
      ) : (
        <button
          type="button"
          className="replay-intro"
          onClick={() => setIntroDone(false)}
        >
          ↺ Replay intro
        </button>
      )}

      <main className={introDone ? "main--visible" : "main--hidden"}>
        <QuickStart />
        <SiteFooter />
      </main>
    </div>
  );
}
