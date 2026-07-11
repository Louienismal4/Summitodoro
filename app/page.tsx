import { HikeExperience } from "@/components/hike/hike-experience";
import { mountains } from "@/data/mountains";

export default function DashboardPage() {
  return <HikeExperience key={mountains[0].slug} mountain={mountains[0]} />;
}
