"use client";

import { useEffect, useRef } from "react";

import {
  getUrlWithoutPortfolioEntry,
  parsePortfolioEntry,
} from "@/lib/portfolio-entry";

const NORMAL_ENTRANCE_MS = 900;
const MAXIMUM_WAIT_MS = 3_000;
const EXIT_ANIMATION_MS = 500;

export function PortfolioEntryTransition() {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const entry = parsePortfolioEntry(window.location.search);
    const overlay = overlayRef.current;

    if (!entry || !overlay) {
      document.documentElement.removeAttribute("data-portfolio-entry");
      return;
    }

    const startedAt = performance.now();
    let revealScheduled = false;
    let maximumWaitTimer: number | undefined;
    let revealTimer: number | undefined;
    let removalTimer: number | undefined;

    overlay.classList.add("is-active");

    const cleanUpAndRemove = () => {
      document.documentElement.removeAttribute("data-portfolio-entry");
      window.history.replaceState(
        window.history.state,
        document.title,
        getUrlWithoutPortfolioEntry(window.location),
      );
      overlay.classList.remove("is-active", "is-leaving");
    };

    const beginReveal = () => {
      if (revealScheduled) return;
      revealScheduled = true;
      window.clearTimeout(maximumWaitTimer);

      const remainingEntrance = Math.max(
        0,
        NORMAL_ENTRANCE_MS - (performance.now() - startedAt),
      );

      revealTimer = window.setTimeout(() => {
        document.documentElement.removeAttribute("data-portfolio-entry");
        overlay.classList.add("is-leaving");
        removalTimer = window.setTimeout(cleanUpAndRemove, EXIT_ANIMATION_MS);
      }, remainingEntrance);
    };

    if (document.readyState === "complete") {
      beginReveal();
    } else {
      window.addEventListener("load", beginReveal, { once: true });
      maximumWaitTimer = window.setTimeout(beginReveal, MAXIMUM_WAIT_MS);
    }

    return () => {
      window.removeEventListener("load", beginReveal);
      window.clearTimeout(maximumWaitTimer);
      window.clearTimeout(revealTimer);
      window.clearTimeout(removalTimer);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="portfolio-entry-transition"
      aria-hidden="true"
      data-testid="portfolio-entry-transition"
    >
      <div className="portfolio-entry-transition-visual" />
    </div>
  );
}
