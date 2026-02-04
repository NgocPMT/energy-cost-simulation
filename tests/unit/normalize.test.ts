import { describe, it, expect, expectTypeOf } from "vitest";
import {
  normalizeMode2,
  NormalizeMode2Input,
  normalizePlan,
} from "../../src/simulation/modules/normalize";
import test from "../fixtures/plan-fixtures";

describe("Normalize average monthly usage to 5-min interval reads", () => {
  it("Normalize successfully", () => {
    const INTERVAL_COUNTS_BY_YEAR = 105_120;
    const MONTHLY_USAGE = 450;
    const input: NormalizeMode2Input = {
      averageMonthlyUsage: MONTHLY_USAGE,
      profileType: "HOME_EVENING",
      postcode: "2000",
    };

    const intervals = normalizeMode2(input);
    const totalKwh = intervals.reduce((sum, interval) => sum + interval.kwh, 0);
    const expectedBaseTotalKwh = MONTHLY_USAGE * 12; // Not include seasonal factor
    // Allow +-20% margin because of seasonal factor
    const lowerBound = expectedBaseTotalKwh * 0.8;
    const upperBound = expectedBaseTotalKwh * 1.2;

    expect(intervals.length).toBe(INTERVAL_COUNTS_BY_YEAR);
    expect(totalKwh).toBeGreaterThan(lowerBound);
    expect(totalKwh).toBeLessThan(upperBound);
  });
});

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
