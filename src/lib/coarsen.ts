/**
 * Reduce a coordinate to roughly 1.1 km of precision.
 *
 * Used before any coordinate is sent to our server for a nearby-facility
 * lookup. Two decimal places is enough to find the right hospitals while being
 * too coarse to identify a household, and it makes the server-side cache far
 * more effective because everyone in the same square shares one lookup.
 *
 * Kept in its own module so the browser and the server agree on the grid
 * without the client pulling in server-only code.
 */
export function coarsenForLookup(value: number): number {
  return Math.round(value * 100) / 100;
}
