import { HikeExperience } from "@/components/hike/hike-experience";
import { mountains } from "@/data/mountains";

export default function DashboardPage() {
  return <HikeExperience mountain={mountains[0]} />;
}
