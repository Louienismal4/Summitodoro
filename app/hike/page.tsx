import { HikeExperience } from "@/components/hike/hike-experience";
import { mountains } from "@/data/mountains";

export default function DefaultHikePage() {
  return <HikeExperience key={mountains[0].slug} mountain={mountains[0]} />;
}
