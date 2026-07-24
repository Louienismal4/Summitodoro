import { redirect } from "next/navigation";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const source = await searchParams;
  const destination = new URLSearchParams();

  for (const key of ["entry", "project", "transition"] as const) {
    const value = source[key];
    if (typeof value === "string") destination.set(key, value);
  }

  const query = destination.toString();
  redirect(query ? `/hike?${query}` : "/hike");
}
