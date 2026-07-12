import type { TrailCheckpoint, TrailSource } from "@/types/trail";

export type MountainDifficulty = "easy" | "moderate" | "hard";

export type Mountain = {
  id: string;
  slug: string;
  name: string;
  region: string;
  province: string;
  elevationMasl: number;
  imagePath: string;
  tagline: string;
  description: string;
  difficulty: MountainDifficulty;
  defaultDurationMinutes: number;
  trailName: string;
  trailAssetUrl: string;
  trailVersion: number;
  checkpoints: TrailCheckpoint[];
  source: TrailSource;
  mapCenter: [number, number];
};
