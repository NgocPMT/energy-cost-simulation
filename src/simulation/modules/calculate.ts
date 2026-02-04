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
  let dailyUsage = 0;
  let dailySupplyCharge = 0;
  let dayCount = 0;

  for (const interval of intervals) {
    const { start, kwh } = interval;
    const { minuteOfDay, dt, day } = parseISOStringToMinutes(start);
    const dateStr = dt.toISODate();
    const currentDate = DateTime.fromISO(dt.toISO()).toFormat("MM-dd");

    if (dateStr !== currentDayStr) {
      currentDayStr = dateStr;
      dailyUsage = 0;
      dailySupplyCharge = getDailySupplyCharge({
        tariffPeriods: plan.tariffPeriods,
        currentDate,
      });
      dayCount++;
    }

    const rate = getUsageRate({
      tariffPeriods: plan.tariffPeriods,
      currentDate,
      currentWeekDay: day,
      currentDailyUsage: dailyUsage,
      currentMinute: minuteOfDay,
    });

    const cost = dailySupplyCharge + kwh * rate.unitPrice;

    totalCost += cost;
    totalKwh += kwh;
    dailyUsage += kwh;
  }
};

export interface GetDailySupplyChargeInput {
  tariffPeriods: NormalizedTariffPeriod[];
  currentDate: string;
}

export const getDailySupplyCharge = ({
  tariffPeriods,
  currentDate,
}: GetDailySupplyChargeInput) => {
  for (const tariffPeriod of tariffPeriods) {
    const start = tariffPeriod.startDate;
    const end = tariffPeriod.endDate;
    if (currentDate > start && currentDate < end) {
      return tariffPeriod.dailySupplyCharge;
    }
  }

  throw new Error(
    "Error getting supply charge: There is no daily supply charge matched in the current plan",
  );
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
  const tariffPeriod = tariffPeriods.find((tariffPeriod) => {
    const start = tariffPeriod.startDate;
    const end = tariffPeriod.endDate;
    if (currentDate > start && currentDate < end) {
      return tariffPeriod.dailySupplyCharge;
    }
  });

  if (!tariffPeriod) {
    throw Error(
      "Failed to get usage charge: There is no tariff period matched in the current plan",
    );
  }

  const rates = tariffPeriod.rates;

  const filteredTimeWindows = rates.filter((rate) => {
    return rate.timeWindows.some((window) => {
      const start = parseHourMinuteToMinutes(window.startTime);
      let end = parseHourMinuteToMinutes(window.endTime);

      if (end === 0) end = 1440;

      const isDayMatch = window.days.includes(currentWeekDay);
      const isTimeMatch = currentMinute >= start && currentMinute < end;

      return isDayMatch && isTimeMatch;
    });
  });

  // Sort: Rate with limit first
  filteredTimeWindows.sort((w1, w2) => {
    const limit1 = w1.volumeLimit ?? Number.MAX_VALUE;
    const limit2 = w2.volumeLimit ?? Number.MAX_VALUE;
    return limit1 - limit2;
  });

  for (const rate of rates) {
    // Fallback for no limit or exceed previous volume limit
    if (rate.volumeLimit === undefined) {
      return rate;
    }
    // Return rate if within the current limit, else proceed to the next rate
    if (currentDailyUsage < rate.volumeLimit) {
      return rate;
    }
  }

  throw Error(
    "Failed to get usage charge: There is no rate matched in the current plan",
  );
};
