import { describe, expect, expectTypeOf } from "vitest";
import { normalizePlan } from "../../src/simulation/modules/plan-ingestion";
import test from "../fixtures/plan-fixtures";

describe("Normalize raw plan to canonical format", () => {
  test("Successfully normalization", ({ rawPlan }) => {
    const normalizedPlan = normalizePlan(rawPlan);

    const expectedUnitPrice: number = parseFloat(
      rawPlan.electricityContract.tariffPeriod[0].timeOfUseRates[0].rates[0]
        .unitPrice,
    );
    const normalizedUnitPrice =
      normalizedPlan.tariffPeriods[0].rates[0].unitPrice;

    expectTypeOf(normalizedUnitPrice).toBeNumber();
    expect(normalizedUnitPrice).toBe(expectedUnitPrice);
  });
});
