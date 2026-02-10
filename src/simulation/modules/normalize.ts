import PROFILES from "../../profiles";
import SEASONAL_MULTIPLIERS, { Month } from "../../seasonal-multipliers";
import { DateTime } from "luxon";
import {
  NormalizedDemandChargePeriod,
  NormalizedPlan,
  NormalizedRate,
  RawDemandChargePeriod,
  RawPlanWithDetails,
  RawSingleRatePeriod,
  RawTOUPeriod,
} from "../simulation.type";

export interface NormalizeMode2Input {
  averageMonthlyUsage: number; // kWh
  profileType:
    | "HOME_EVENING"
    | "HOME_ALL_DAY"
    | "SOLAR_HOUSEHOLD"
    | "EV_HOUSEHOLD";
  postcode: string;
}

export interface SimulatedInterval {
  start: string;
  end: string;
  kwh: number;
}

export const normalizeMode2 = (
  input: NormalizeMode2Input,
): SimulatedInterval[] => {
  const intervals: SimulatedInterval[] = [];
  const profile = PROFILES[input.profileType];
  // Use to simulate the next 365 days
  let currentDate = DateTime.now().startOf("day");

  const profileSum = profile.reduce((sum, val) => sum + val, 0);
  const averageDailyUsage = input.averageMonthlyUsage / 30.4; // Average days in a month

  for (let day = 0; day < 365; day++) {
    const month = currentDate.get("month") as Month;
    // Recalculate daily usage with seasonal factor
    const seasonalDailyUsage =
      averageDailyUsage * SEASONAL_MULTIPLIERS[month] || 1.0;

    for (let hour = 0; hour < 24; hour++) {
      const hourWeight = profile[hour];
      const intervalKwhHour = (hourWeight / profileSum) * seasonalDailyUsage;
      const intervalKwh5Min = intervalKwhHour / 12; // Split hourly kWh to 12 x 5-min intervals

      for (let minute = 0; minute < 60; minute += 5) {
        intervals.push({
          start: currentDate.set({ hour, minute }).toISO(),
          end: currentDate.set({ hour, minute: minute + 5 }).toISO(),
          kwh: intervalKwh5Min,
        });
      }
    }
    currentDate = currentDate.plus({ days: 1 }); // Next day
  }
  return intervals;
};

export const normalizePlan = (input: RawPlanWithDetails): NormalizedPlan => {
  const contract = input.electricityContract;
  const rawDemandChargePeriods: RawDemandChargePeriod[] = [];
  const rawTariffPeriods: Array<RawTOUPeriod | RawSingleRatePeriod> = [];
  contract.tariffPeriod.forEach((period) => {
    if (period.rateBlockUType === "demandCharges") {
      rawDemandChargePeriods.push(period);
    } else {
      rawTariffPeriods.push(period);
    }
  });

  const normalizedPlan = {
    planId: input.planId,
    brandName: input.brandName,
    displayName: input.displayName,
    tariffPeriods: rawTariffPeriods
      .map((period) => {
        if (period.rateBlockUType === "singleRate") {
          return {
            startDate: period.startDate,
            endDate: period.endDate,
            dailySupplyCharge: parseFloat(period.dailySupplyCharge),
            rates: period.singleRate.rates.map(
              (rate) =>
                ({
                  type: "PEAK",
                  volumeLimit: rate.volume || undefined,
                  unitPrice: parseFloat(rate.unitPrice),
                  timeWindows: [
                    {
                      days: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
                      startTime: "00:00",
                      endTime: "24:00",
                    },
                  ],
                }) satisfies NormalizedRate,
            ),
          };
        }
        return {
          startDate: period.startDate,
          endDate: period.endDate,
          dailySupplyCharge: parseFloat(period.dailySupplyCharge),
          rates: period.timeOfUseRates.flatMap((tou) => {
            return tou.rates.map((rate) => {
              return {
                type: tou.type,
                volumeLimit: rate.volume || undefined,
                unitPrice: parseFloat(rate.unitPrice),
                timeWindows: tou.timeOfUse.map((window) => {
                  return {
                    days: window.days,
                    startTime: window.startTime,
                    endTime: window.endTime,
                  };
                }),
              } satisfies NormalizedRate;
            });
          }),
        };
      })
      .filter((period) => !!period),
    fees: contract.fees?.map((fee) => {
      if (fee.term === "FIXED") {
        return { ...fee, amount: parseFloat(fee.amount) };
      }
      return { ...fee, rate: parseFloat(fee.rate) };
    }),
    discounts: contract.discounts,
    eligibilityConstraints: input.electricityContract.eligibility?.map(
      (constraint) => constraint.information,
    ),
    demandCharges: rawDemandChargePeriods.map((period) => {
      return {
        startDate: period.startDate,
        endDate: period.endDate,
        demandCharges: period.demandCharges.map((period) => {
          return {
            days: period.days,
            amount: parseFloat(period.amount),
            startTime: period.startTime,
            endTime: period.endTime,
            measurementPeriod: period.measurementPeriod,
          };
        }),
      } satisfies NormalizedDemandChargePeriod;
    }),
  };
  return normalizedPlan;
};

export const getDemandCharges = () => {};
