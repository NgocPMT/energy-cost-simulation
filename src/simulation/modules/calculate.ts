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
  let currentMonth = 0;
  let dailyUsage = 0;
  let monthlyCost = 0;
  let monthlyUsage = 0;
  let dailySupplyCharge = 0;
  let dayCount = 0;
  let monthlyBreakdown = [];

  for (const interval of intervals) {
    const { start, kwh } = interval;
    const { minuteOfDay, dt, day } = parseISOStringToMinutes(start);
    const dateStr = dt.toISODate();
    const currentDate = dt.toFormat("MM-dd");
    const month = dt.month;

    if (dateStr !== currentDayStr) {
      dailySupplyCharge = getDailySupplyCharge({
        tariffPeriods: plan.tariffPeriods,
        currentDate,
      });
      totalCost += dailySupplyCharge;

      currentDayStr = dateStr;
      dailyUsage = 0;
      dayCount++;
    }

    if (month !== currentMonth) {
      if (currentMonth !== 0) {
        monthlyBreakdown.push({
          month,
          usage: Math.round(monthlyUsage * 100) / 100,
          cost: Math.round(monthlyCost * 100) / 100,
        });
      }

      currentMonth = month;
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
  }

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
  const tariffPeriod = findTariffPeriod({ tariffPeriods, currentDate });

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
  const tariffPeriod = findTariffPeriod({ tariffPeriods, currentDate });

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

export interface FindTariffPeriodInput {
  tariffPeriods: NormalizedTariffPeriod[];
  currentDate: string;
}

export const findTariffPeriod = ({
  tariffPeriods,
  currentDate,
}: FindTariffPeriodInput) => {
  const tariffPeriod = tariffPeriods.find((tariffPeriod) => {
    const start = tariffPeriod.startDate;
    const end = tariffPeriod.endDate;

    // Handle plan span 2 years edge case
    if (start < end) {
      return currentDate >= start && currentDate <= end;
    } else {
      return currentDate >= start || currentDate <= end;
    }
  });
  return tariffPeriod;
};
