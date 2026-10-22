export interface Location {
  id: string;
  name: string;
  short: string;
  city: string;
  color: string;
  hasBuiltInStudies?: boolean; // if true, shows the hardcoded Anthony studies
}

export const LOCATIONS: Location[] = [
  {
    id: "tf-knoxville",
    name: "Triple F Knoxville",
    short: "KNX",
    city: "Knoxville, TN",
    color: "#0f4f6a",
    hasBuiltInStudies: true,
  },
  {
    id: "tf-blount-county",
    name: "Triple F Blount County",
    short: "BLT",
    city: "Blount County, TN",
    color: "#047857",
    hasBuiltInStudies: false,
  },
];

export const DEFAULT_LOCATION = LOCATIONS[0];

/** Keep only real location ids, in order, without repeats. */
export function cleanLocationIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const real = new Set(LOCATIONS.map((l) => l.id));
  return [...new Set(ids.map(String))].filter((id) => real.has(id));
}
