import { describe, it, expect } from "vitest";
import {
  parseHourMinuteToMinutes,
  parseISOStringToMinutes,
} from "../../src/simulation/modules/parse-time";

describe("Parse string with hh:mm format to minutes", () => {
  it("String with no minutes", () => {
    const timeStr = "10:00";
    const minutes = parseHourMinuteToMinutes(timeStr);

    expect(minutes).toBe(10 * 60);
  });
  it("String with minutes", () => {
    const timeStr = "10:36";
    const minutes = parseHourMinuteToMinutes(timeStr);

    expect(minutes).toBe(10 * 60 + 36);
  });
});

describe("Parse string with ISO format to minutes", () => {
  it("String with no minutes", () => {
    const isoString = "2026-02-04T14:00:00Z";
    const result = parseISOStringToMinutes(isoString);

    expect(result.minuteOfDay).toBe(14 * 60);
  });
  it("String with minutes", () => {
    const isoString = "2026-02-04T14:30:00Z";
    const result = parseISOStringToMinutes(isoString);

    expect(result.minuteOfDay).toBe(14 * 60 + 30);
  });
  it("String with offset", () => {
    const isoString = "2026-02-04T14:30:00+07:00";
    const minutes = parseISOStringToMinutes(isoString);

    expect(minutes).toBe(14 * 60 + 30);
  });
});
