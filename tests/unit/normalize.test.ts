import { describe, it, expect } from "vitest";
import {
  normalizeMode2,
  NormalizeMode2Input,
} from "../../src/simulation/normalize";

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
