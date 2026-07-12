import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Product updates for Summitodoro.",
};

const releases = [
  {
    version: "Current",
    date: "July 2026",
    title: "Expedition dashboard refinements",
    changes: [
      "Added Supabase Google sign-in and saved hiker names.",
      "Google profile photos can appear as the moving hiker on the map.",
      "Standardized focus and checkpoint timers to HH:MM:SS.",
      "Saved signed-in hikers' expedition summary, XP, focus time, summits, and focus chain to Supabase.",
      "Made /hike the primary expedition route and added a guided first-use tour.",
      "Refined the image-rich mountain selector and added selectable YouTube background streams.",
      "Improved Pulag's fitted map view with a summit marker that remains anchored to the trail while zooming.",
      "Kept the hiker profile available on mobile, centered the hiker above the mobile sheet, and introduced a compact landscape layout.",
      "Added a logout action that clears local expedition data and returns to the sign-in screen.",
    ],
  },
  {
    version: "0.2.0",
    date: "July 2026",
    title: "Mapped focus routes",
    changes: [
      "Added Mt. Ulap, Mt. Pulag, and Mt. Pinatubo route snapshots.",
      "Migrated the interactive map to MapLibre and OpenFreeMap.",
      "Added checkpoint breaks and longer focus-duration presets.",
    ],
  },
  {
    version: "0.1.0",
    date: "Initial release",
    title: "The first ascent",
    changes: [
      "Introduced the virtual Philippine mountain focus dashboard.",
      "Added local timer recovery, progression XP, and a route fallback.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="info-page">
      <header className="info-header">
          <Link href="/hike" className="info-brand">
          ▲ Summitodoro
        </Link>
        <nav aria-label="Site navigation">
          <Link href="/hike">Expedition</Link>
          <Link href="/about">About</Link>
        </nav>
      </header>

      <section className="info-hero compact">
        <span className="section-kicker">Product updates</span>
        <h1>Changelog</h1>
        <p>Follow the trail of improvements to Summitodoro.</p>
      </section>

      <section className="release-list" aria-label="Release history">
        {releases.map((release) => (
          <article key={release.version} className="release-entry">
            <div>
              <span>{release.version}</span>
              <small>{release.date}</small>
            </div>
            <div>
              <h2>{release.title}</h2>
              <ul>
                {release.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
