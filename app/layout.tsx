import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "driver.js/dist/driver.css";
import "./globals.css";

import { PortfolioEntryTransition } from "@/components/transitions/portfolio-entry-transition";

export const metadata: Metadata = {
  title: { default: "Summitodoro", template: "%s · Summitodoro" },
  description: "Climb a virtual Philippine mountain trail while you focus.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const p=new URLSearchParams(location.search);if(p.get("entry")==="portfolio"&&p.get("project")==="summitodoro"&&p.get("transition")==="mountain-zoom"){document.documentElement.dataset.portfolioEntry="mountain-zoom";const l=document.createElement("link");l.rel="preload";l.as="image";l.href="/transitions/summitodoro-cover.webp";l.type="image/webp";document.head.append(l)}}catch{}`,
          }}
        />
      </head>
      <body>
        <PortfolioEntryTransition />
        {children}
      </body>
    </html>
  );
}
