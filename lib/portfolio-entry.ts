export const PORTFOLIO_PROJECT_ID = "summitodoro";
export const PORTFOLIO_TRANSITION_TYPE = "mountain-zoom";

export type PortfolioEntry = {
  projectId: typeof PORTFOLIO_PROJECT_ID;
  transitionType: typeof PORTFOLIO_TRANSITION_TYPE;
};

export function parsePortfolioEntry(search: string): PortfolioEntry | null {
  const params = new URLSearchParams(search);

  if (
    params.get("entry") !== "portfolio" ||
    params.get("project") !== PORTFOLIO_PROJECT_ID ||
    params.get("transition") !== PORTFOLIO_TRANSITION_TYPE
  ) {
    return null;
  }

  return {
    projectId: PORTFOLIO_PROJECT_ID,
    transitionType: PORTFOLIO_TRANSITION_TYPE,
  };
}

export function getUrlWithoutPortfolioEntry({
  pathname,
  search,
  hash,
}: Pick<Location, "pathname" | "search" | "hash">): string {
  const params = new URLSearchParams(search);
  params.delete("entry");
  params.delete("project");
  params.delete("transition");

  const remainingSearch = params.toString();
  return `${pathname}${remainingSearch ? `?${remainingSearch}` : ""}${hash}`;
}
