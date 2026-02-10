import { describe, it, expect } from "vitest";
import { calculateMonthlyDemandCost } from "../../src/simulation/modules/calculate";

describe("calculateMonthlyDemandCost", () => {
  // 1. STANDARD MONTH (30 Days)
  it("calculates cost correctly for a standard 30-day month (April)", () => {
    const tracker = new Map<string, number>();

    // Key Format: "Price-StartTime" -> Value: MaxKW
    // Price: $0.50/kW/day, Max Peak: 10kW
    tracker.set("0.50-15:00", 10);

    const result = calculateMonthlyDemandCost(tracker, "2026-04");

    // Math: 10kW * $0.50 * 30 days = $150.00
    expect(result).toBeCloseTo(150.0);
  });

  // 2. STANDARD MONTH (31 Days)
  it("calculates cost correctly for a 31-day month (January)", () => {
    const tracker = new Map<string, number>();
    tracker.set("0.50-15:00", 10);

    const result = calculateMonthlyDemandCost(tracker, "2026-01");

    // Math: 10kW * $0.50 * 31 days = $155.00
    expect(result).toBeCloseTo(155.0);
  });

  // 3. LEAP YEAR CHECK (Critical for accuracy)
  it("handles Leap Years correctly (Feb 29 days)", () => {
    const tracker = new Map<string, number>();
    tracker.set("1.00-15:00", 5);

    // 2024 is a Leap Year
    const result = calculateMonthlyDemandCost(tracker, "2024-02");

    // Math: 5kW * $1.00 * 29 days = $145.00
    expect(result).toBeCloseTo(145.0);
  });

  it("handles Non-Leap Years correctly (Feb 28 days)", () => {
    const tracker = new Map<string, number>();
    tracker.set("1.00-15:00", 5);

    // 2025 is NOT a Leap Year
    const result = calculateMonthlyDemandCost(tracker, "2025-02");

    // Math: 5kW * $1.00 * 28 days = $140.00
    expect(result).toBeCloseTo(140.0);
  });

  // 4. MULTIPLE DEMAND WINDOWS
  it("sums up multiple different demand charges correctly", () => {
    const tracker = new Map<string, number>();

    // Rate A: Peak ($0.50), Max 10kW
    tracker.set("0.50-15:00", 10);

    // Rate B: Shoulder ($0.20), Max 5kW
    tracker.set("0.20-10:00", 5);

    const result = calculateMonthlyDemandCost(tracker, "2026-04"); // 30 Days

    // Math A: 10 * 0.50 * 30 = 150
    // Math B:  5 * 0.20 * 30 =  30
    // Total: 180
    expect(result).toBeCloseTo(180.0);
  });

  // 5. EDGE CASE: Empty Tracker
  it("returns 0 cost if no demand peaks occurred", () => {
    const tracker = new Map<string, number>(); // Empty
    const result = calculateMonthlyDemandCost(tracker, "2026-01");
    expect(result).toBe(0);
  });

  // 6. ERROR HANDLING
  it("throws an error for invalid month strings", () => {
    const tracker = new Map<string, number>();
    tracker.set("0.50-15:00", 10);

    // Invalid format
    expect(() =>
      calculateMonthlyDemandCost(tracker, "invalid-date"),
    ).toThrowError("Failed to calculate monthly demand cost");
  });
});
