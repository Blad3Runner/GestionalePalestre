/**
 * Where a member stands with the business, and how they move.
 *
 * Step 4 **records** these transitions; it does not trigger them. Lead → Starter follows
 * a Starter Pack purchase and Starter → Client the first credit recharge, both of which
 * arrive in Step 7. Dormant needs consumption to measure, which arrives in Step 6.
 */

export const LIFECYCLE_STATES = [
  "LEAD",
  "STARTER",
  "CLIENT",
  "DORMANT",
  "CHURN",
] as const;

export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export function isLifecycleState(value: unknown): value is LifecycleState {
  return (
    typeof value === "string" &&
    (LIFECYCLE_STATES as readonly string[]).includes(value)
  );
}

/**
 * Which moves are allowed from each state.
 *
 * Deliberately permissive about going backwards — a Dormant member who returns becomes a
 * Client again, and a member recorded in the wrong state must be correctable. What it
 * refuses is nonsense: skipping from Lead straight to Dormant, or leaving CHURN by any
 * route other than starting again.
 */
const ALLOWED: Record<LifecycleState, readonly LifecycleState[]> = {
  LEAD: ["STARTER", "CHURN"],
  STARTER: ["CLIENT", "LEAD", "CHURN"],
  CLIENT: ["DORMANT", "STARTER", "CHURN"],
  DORMANT: ["CLIENT", "CHURN"],
  CHURN: ["LEAD", "CLIENT"],
};

export function nextStates(from: LifecycleState | null): readonly LifecycleState[] {
  // Somebody with no state yet starts wherever they are found.
  return from === null ? LIFECYCLE_STATES : ALLOWED[from];
}

export function canMove(
  from: LifecycleState | null,
  to: LifecycleState,
): boolean {
  if (from === to) {
    return false;
  }
  return nextStates(from).includes(to);
}
