import { NormalizedTariffPeriod } from "../simulation.type";
import { findPeriod, parseHourMinuteToMinutes } from "./utils";

export interface GetUsageRateInput {
  tariffPeriods: NormalizedTariffPeriod[];
  currentWeekDay: string;
  currentDate: string;
  currentMinute: number;
  currentDailyUsage: number;
}

export const getUsageRate = ({
  tariffPeriods,
  currentDate,
  currentWeekDay,
  currentMinute,
  currentDailyUsage,
}: GetUsageRateInput) => {
  const tariffPeriod = findPeriod({ periods: tariffPeriods, currentDate });

  if (!tariffPeriod) {
    throw Error(
      "Failed to get usage charge: There is no tariff period matched in the current plan",
    );
  }

  const rates = tariffPeriod.rates;

  const matchedRates = rates.filter((rate) => {
    return rate.timeWindows.some((window) => {
      const start = parseHourMinuteToMinutes(window.startTime);
      let end = parseHourMinuteToMinutes(window.endTime);

      if (window.endTime === "00:00") end = 1440;

      const isDayMatch = window.days.includes(currentWeekDay);

      let isTimeMatch = false;

      if (start < end) {
        isTimeMatch = currentMinute >= start && currentMinute < end;
      } else {
        isTimeMatch = currentMinute >= start || currentMinute < end;
      }

      return isDayMatch && isTimeMatch;
    });
  });

  // Sort: Rate with limit first
  matchedRates.sort((w1, w2) => {
    const limit1 = w1.volumeLimit ?? Number.MAX_VALUE;
    const limit2 = w2.volumeLimit ?? Number.MAX_VALUE;
    return limit1 - limit2;
  });

  for (const rate of matchedRates) {
    // Fallback for no limit or exceed previous volume limit
    if (rate.volumeLimit === undefined) {
      return rate;
    }
    // Return rate if within the current limit, else proceed to the next rate
    if (currentDailyUsage < rate.volumeLimit) {
      return rate;
    }
  }

  if (matchedRates.length === 0) {
    const time = `${Math.floor(currentMinute / 60)}:${currentMinute % 60}`;
    throw new Error(
      `CRITICAL DATA GAP: Plan has no rates defined for ${currentWeekDay} at approx ${time} (Day: ${currentDate})`,
    );
  }

  throw new Error(
    `VOLUME LIMIT EXCEEDED: User usage (${currentDailyUsage}kWh) exceeded all defined limits for ${currentWeekDay} and no fallback (unlimited) rate exists.`,
  );
};
