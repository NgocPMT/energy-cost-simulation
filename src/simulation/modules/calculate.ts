import { DateTime } from "luxon";
import { NormalizedPlan, NormalizedTariffPeriod } from "../simulation.type";
import { SimulatedInterval } from "./normalize";
import {
  parseHourMinuteToMinutes,
  parseISOStringToMinutes,
} from "./parse-time";

export interface CalculatePlanInput {
  plan: NormalizedPlan;
  intervals: SimulatedInterval[];
}

export const calculateCost = ({ plan, intervals }: CalculatePlanInput) => {
  //todo include solar FiT
  let totalCost = 0;
  let totalKwh = 0;

  let currentDayStr = "";
  let currentMonthStr = "";
  let dailyUsage = 0;
  let monthlyCost = 0;
  let monthlyUsage = 0;
  let dailySupplyCharge = 0;
  let dayCount = 0;
  let monthlyBreakdown = [];
  let monthlyDemandTracker = new Map<string, number>();

  for (const interval of intervals) {
    const { start, kwh } = interval;
    const { minuteOfDay, dt, day } = parseISOStringToMinutes(start);
    const currentDate = dt.toFormat("MM-dd");
    const dateStr = dt.toISODate();
    const monthStr = dt.toFormat("yyyy-MM");

    if (dateStr !== currentDayStr) {
      dailySupplyCharge = getDailySupplyCharge({
        tariffPeriods: plan.tariffPeriods,
        currentDate,
      });
      totalCost += dailySupplyCharge;
      monthlyCost += dailySupplyCharge;

      currentDayStr = dateStr;
      dailyUsage = 0;
      dayCount++;
    }

    if (monthStr !== currentMonthStr) {
      if (currentMonthStr !== "") {
        const demandCost = calculateMonthlyDemandCost(
          monthlyDemandTracker,
          currentMonthStr,
        );
        totalCost += demandCost;
        monthlyBreakdown.push({
          monthStr,
          usage: Math.round(monthlyUsage * 100) / 100,
          cost: Math.round((monthlyCost + demandCost) * 100) / 100,
          demandCost: Math.round(demandCost * 100) / 100,
        });
      }

      // Reset for new month
      currentMonthStr = monthStr;
      monthlyDemandTracker.clear();
      monthlyUsage = 0;
      monthlyCost = 0;
    }

    const rate = getUsageRate({
      tariffPeriods: plan.tariffPeriods,
      currentDate,
      currentWeekDay: day,
      currentDailyUsage: dailyUsage,
      currentMinute: minuteOfDay,
    });

    const usageCost = kwh * rate.unitPrice;

    totalCost += usageCost;
    totalKwh += kwh;
    dailyUsage += kwh;
    monthlyCost += usageCost;
    monthlyUsage += kwh;
    trackDemandPeak({
      plan,
      tracker: monthlyDemandTracker,
      kwh,
      durationMinutes: 5,
      currentDate: dt.toFormat("MM-dd"),
      currentWeekDay: day,
      currentMinute: minuteOfDay,
    });
  }

  // Handle final month (loop ends before the last month)
  const finalDemandCost = calculateMonthlyDemandCost(
    monthlyDemandTracker,
    currentMonthStr,
  );
  totalCost += finalDemandCost;

  monthlyBreakdown.push({
    month: currentMonthStr,
    usage: Math.round(monthlyUsage * 100) / 100,
    cost: Math.round((monthlyCost + finalDemandCost) * 100) / 100,
    demandCost: Math.round(finalDemandCost * 100) / 100,
  });

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    totalKwh: Math.round(totalKwh * 100) / 100,
    monthlyBreakdown,
  };
};

export interface GetDailySupplyChargeInput {
  tariffPeriods: NormalizedTariffPeriod[];
  currentDate: string;
}

export const getDailySupplyCharge = ({
  tariffPeriods,
  currentDate,
}: GetDailySupplyChargeInput) => {
  const tariffPeriod = findPeriod({ periods: tariffPeriods, currentDate });

  if (!tariffPeriod) {
    throw new Error(
      "Error getting supply charge: There is no daily supply charge matched in the current plan",
    );
  }

  return tariffPeriod.dailySupplyCharge;
};

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
interface TrackDemandPeakInput {
  plan: NormalizedPlan;
  tracker: Map<string, number>;
  kwh: number;
  durationMinutes: number;
  currentDate: string;
  currentWeekDay: string;
  currentMinute: number;
}

const trackDemandPeak = ({
  plan,
  tracker,
  kwh,
  durationMinutes,
  currentDate,
  currentWeekDay,
  currentMinute,
}: TrackDemandPeakInput) => {
  if (!plan.demandCharges) return;

  // A. Find the active Demand Period (Season)
  const activePeriod = findPeriod({ periods: plan.demandCharges, currentDate });
  if (!activePeriod) return;

  // B. Check if this specific minute falls in a Demand Window
  const activeRate = activePeriod.demandCharges.find((charge) => {
    const start = parseHourMinuteToMinutes(charge.startTime);
    let end = parseHourMinuteToMinutes(charge.endTime);
    if (charge.endTime === "00:00") end = 1440;

    const isDay = charge.days.includes(currentWeekDay);
    const isTime =
      start < end
        ? currentMinute >= start && currentMinute < end
        : currentMinute >= start || currentMinute < end;

    return isDay && isTime;
  });

  if (activeRate) {
    // C. Convert to kW (Power)
    const kw = kwh * (60 / durationMinutes);

    // D. Update the Tracker if this is a new High Score for this rate
    // We use the rate's amount as a unique key, or generate a unique ID if available
    const key = `${activeRate.amount}-${activeRate.startTime}`;
    const currentMax = tracker.get(key) || 0;

    if (kw > currentMax) {
      tracker.set(key, kw);
    }
  }
};

export const calculateMonthlyDemandCost = (
  tracker: Map<string, number>,
  monthStr: string,
) => {
  let cost = 0;
  const daysInMonth = DateTime.fromFormat(monthStr, "yyyy-MM").daysInMonth;

  if (!daysInMonth) {
    throw new Error(
      "Failed to calculate monthly demand cost: The month provided is invalid",
    );
  }

  // Iterate over all the peaks we tracked
  tracker.forEach((maxKw, key) => {
    // Extract the price from the key (or better, store full rate object in Map)
    // Simplified: Assuming key is "0.3618-15:00" -> price is 0.3618
    const price = parseFloat(key.split("-")[0]);

    // Formula: MaxKW * Price * Days
    cost += maxKw * price * daysInMonth;
  });

  return cost;
};

interface PeriodWithDates {
  startDate: string;
  endDate: string;
}

export interface FindPeriodInput<T extends PeriodWithDates> {
  periods: T[];
  currentDate: string;
}

export const findPeriod = <T extends PeriodWithDates>({
  periods,
  currentDate,
}: FindPeriodInput<T>): T | undefined => {
  const period = periods.find((period) => {
    const start = period.startDate;
    const end = period.endDate;

    // Handle plan span 2 years edge case
    if (start < end) {
      return currentDate >= start && currentDate <= end;
    } else {
      return currentDate >= start || currentDate <= end;
    }
  });
  return period;
};
