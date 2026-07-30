import { describe, expect, it } from "vitest";
import {
  LIFECYCLE_STATES,
  canMove,
  isLifecycleState,
  nextStates,
  type LifecycleState,
} from "@/lib/members/lifecycle";
import { LifecycleState as PrismaLifecycleState } from "@/generated/prisma/enums";

describe("the lifecycle states", () => {
  it("match the database exactly", () => {
    expect([...LIFECYCLE_STATES].sort()).toEqual(
      Object.values(PrismaLifecycleState).sort(),
    );
  });

  it("are the five the blueprint names", () => {
    expect(LIFECYCLE_STATES).toEqual([
      "LEAD",
      "STARTER",
      "CLIENT",
      "DORMANT",
      "CHURN",
    ]);
  });
});

describe("isLifecycleState", () => {
  it.each([
    ["a real state", "CLIENT", true],
    ["the wrong case", "client", false],
    ["nonsense", "ACTIVE", false],
    ["nothing", null, false],
    ["a number", 2, false],
  ])("%s", (_label, value, expected) => {
    expect(isLifecycleState(value)).toBe(expected);
  });
});

describe("the moves the business actually makes", () => {
  it("takes a Lead to Starter — the Starter Pack purchase", () => {
    expect(canMove("LEAD", "STARTER")).toBe(true);
  });

  it("takes a Starter to Client — the first credit recharge", () => {
    expect(canMove("STARTER", "CLIENT")).toBe(true);
  });

  it("takes a Client to Dormant when they stop coming", () => {
    expect(canMove("CLIENT", "DORMANT")).toBe(true);
  });

  it("brings a Dormant member back to Client", () => {
    expect(canMove("DORMANT", "CLIENT")).toBe(true);
  });

  it("lets somebody who churned start again", () => {
    expect(canMove("CHURN", "LEAD")).toBe(true);
  });
});

describe("the moves it refuses", () => {
  it("will not skip a Lead straight to Dormant — they were never active", () => {
    expect(canMove("LEAD", "DORMANT")).toBe(false);
  });

  it("will not skip a Lead straight to Client, bypassing the Starter Pack", () => {
    expect(canMove("LEAD", "CLIENT")).toBe(false);
  });

  it("will not move a Starter to Dormant", () => {
    expect(canMove("STARTER", "DORMANT")).toBe(false);
  });

  it("refuses a move to the state somebody is already in", () => {
    for (const state of LIFECYCLE_STATES) {
      expect(canMove(state, state), `${state} → ${state}`).toBe(false);
    }
  });
});

describe("somebody with no state yet", () => {
  it("can be placed in any state, because they are being found for the first time", () => {
    expect(nextStates(null)).toEqual(LIFECYCLE_STATES);
  });
});

describe("the table as a whole", () => {
  it("offers only real states, whatever it is asked", () => {
    for (const state of [...LIFECYCLE_STATES, null]) {
      for (const next of nextStates(state as LifecycleState | null)) {
        expect(LIFECYCLE_STATES).toContain(next);
      }
    }
  });

  it("never offers a move back to the same state", () => {
    for (const state of LIFECYCLE_STATES) {
      expect(nextStates(state)).not.toContain(state);
    }
  });

  it("leaves no state a dead end", () => {
    for (const state of LIFECYCLE_STATES) {
      expect(nextStates(state).length, `${state} has nowhere to go`).toBeGreaterThan(0);
    }
  });

  it("keeps every state reachable from somewhere", () => {
    for (const target of LIFECYCLE_STATES) {
      const reachable = LIFECYCLE_STATES.some(
        (from) => from !== target && canMove(from, target),
      );
      expect(reachable, `nothing can reach ${target}`).toBe(true);
    }
  });
});
