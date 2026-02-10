import { NormalizedPlan } from "../simulation.type";
import { SimulatedInterval } from "./normalize";
import { parseISOStringToMinutes, roundTo2DecimalPlaces } from "./utils";
import { getDailySupplyCharge } from "./cost-daily-supply";
import { getUsageRate } from "./cost-usage";
import { calculateMonthlyDemandCost, trackDemandPeak } from "./cost-demand";

export interface CalculatePlanInput {
  plan: NormalizedPlan;
  intervals: SimulatedInterval[];
}

export const calculateCost = ({ plan, intervals }: CalculatePlanInput) => {
  let totalCost = 0;
  let totalKwh = 0;

  // For handling new day and month
  let currentDayStr = "";
  let currentMonthStr = "";

  // For handling multiple usage rate blocks in a same time period
  let dailyUsage = 0;

  // For monthly cost summarizes
  let monthlyCost = 0;
  let monthlyUsage = 0;
  let monthlyBreakdown = [];

  // For tracking demand spikes
  let monthlyDemandTracker = new Map<string, number>();

  for (const interval of intervals) {
    const { start, kwh } = interval;
    const { minuteOfDay, dt, weekDay } = parseISOStringToMinutes(start);
    const currentDate = dt.toFormat("MM-dd");
    const dateStr = dt.toISODate();
    const monthStr = dt.toFormat("yyyy-MM");

    // Run every new day
    if (dateStr !== currentDayStr) {
      // Calculate daily supply charge
      const dailySupplyCharge = getDailySupplyCharge({
        tariffPeriods: plan.tariffPeriods,
        currentDate,
      });
      totalCost += dailySupplyCharge;
      monthlyCost += dailySupplyCharge;

      // Reset for new day
      currentDayStr = dateStr;
      dailyUsage = 0;
    }

    // Run every new month (This will not run at the final month)
    if (monthStr !== currentMonthStr) {
      if (currentMonthStr !== "") {
        // If not the first iteration
        // Calculate demand cost in a month
        const demandCost = calculateMonthlyDemandCost(
          monthlyDemandTracker,
          currentMonthStr,
        );
        totalCost += demandCost;

        // Summarize monthly costs
        monthlyBreakdown.push({
          monthStr,
          usage: roundTo2DecimalPlaces(monthlyUsage),
          cost: roundTo2DecimalPlaces(monthlyCost + demandCost),
          demandCost: roundTo2DecimalPlaces(demandCost),
        });
      }

      // Reset for new month
      currentMonthStr = monthStr;
      monthlyDemandTracker.clear();
      monthlyUsage = 0;
      monthlyCost = 0;
    }

    // Calculate usage cost for this interval
    const rate = getUsageRate({
      tariffPeriods: plan.tariffPeriods,
      currentDate,
      currentWeekDay: weekDay,
      currentDailyUsage: dailyUsage,
      currentMinute: minuteOfDay,
    });

    const usageCost = kwh * rate.unitPrice;

    totalCost += usageCost;
    totalKwh += kwh;

    dailyUsage += kwh;

    monthlyCost += usageCost;
    monthlyUsage += kwh;

    // Track usage spike
    trackDemandPeak({
      plan,
      tracker: monthlyDemandTracker,
      kwh,
      durationMinutes: 5,
      currentDate: dt.toFormat("MM-dd"),
      currentWeekDay: weekDay,
      currentMinute: minuteOfDay,
    });
  }

  // Handle final month
  const finalDemandCost = calculateMonthlyDemandCost(
    monthlyDemandTracker,
    currentMonthStr,
  );
  totalCost += finalDemandCost;

  // Summarize cost for the final month
  monthlyBreakdown.push({
    month: currentMonthStr,
    usage: roundTo2DecimalPlaces(monthlyUsage),
    cost: roundTo2DecimalPlaces(monthlyCost + finalDemandCost),
    demandCost: roundTo2DecimalPlaces(finalDemandCost),
  });

  return {
    totalCost: roundTo2DecimalPlaces(totalCost), // Annual cost
    totalKwh: roundTo2DecimalPlaces(totalKwh), // Annual usage
    monthlyBreakdown,
  };
};
