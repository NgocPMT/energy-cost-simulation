import { describe, expect, it } from "vitest";
import test from "../fixtures/plan-fixtures";
import { calculateCost } from "../../src/simulation/modules/calculate";
import { SimulatedInterval } from "../../src/simulation/modules/normalize";

describe("Simulate cost in a year of a plan based on user interval reads", () => {
  test("Successful calculation", ({ intervals, normalizedPlan }) => {
    const result = calculateCost({
      plan: normalizedPlan,
      intervals: intervals as SimulatedInterval[],
    });

    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.totalKwh).toBeGreaterThan(0);

    // The cost should be roughly (Usage * ~0.26) + (Days * 0.96)
    const avgPricePerKwh = result.totalCost / result.totalKwh;
    expect(avgPricePerKwh).toBeGreaterThan(0.2);
    expect(avgPricePerKwh).toBeLessThan(0.5);
  });
});
