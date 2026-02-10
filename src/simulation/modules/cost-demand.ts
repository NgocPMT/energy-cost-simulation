import { DateTime } from "luxon";
import { findPeriod, parseHourMinuteToMinutes } from "./utils";
import { NormalizedPlan } from "../simulation.type";

interface TrackDemandPeakInput {
  plan: NormalizedPlan;
  tracker: Map<string, number>;
  kwh: number;
  durationMinutes: number;
  currentDate: string;
  currentWeekDay: string;
  currentMinute: number;
}

export const trackDemandPeak = ({
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
