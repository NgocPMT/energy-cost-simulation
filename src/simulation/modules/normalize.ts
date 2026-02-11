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
import {
  DAILY_SOLAR_YIELD_FACTOR,
  SOLAR_SEASONAL_FACTORS,
} from "../../solar-factors";

export interface NormalizeMode2Input {
  averageMonthlyUsage: number; // kWh
  profileType: keyof typeof PROFILES;
  postcode: string;
  solarSystemSizeKw?: number;
}

export interface SimulatedInterval {
  start: string;
  end: string;
  kwh: number; // Grid import
  exportKwh: number; // Solar export
}

export const normalizeMode2 = (
  input: NormalizeMode2Input,
): SimulatedInterval[] => {
  const intervals: SimulatedInterval[] = [];

  const consumptionProfile = PROFILES[input.profileType];
  const solarProfile = PROFILES.SOLAR_GENERATION;

  const consumptionSum = consumptionProfile.reduce((sum, val) => sum + val, 0);
  const solarSum = solarProfile.reduce((sum, val) => sum + val, 0);

  const averageDailyConsumption = input.averageMonthlyUsage / 30.4;

  // Calculate Base Solar Generation (if system size exists)
  const averageDailySolarGen = input.solarSystemSizeKw
    ? input.solarSystemSizeKw * DAILY_SOLAR_YIELD_FACTOR
    : 0;

  let currentDate = DateTime.now().startOf("day");

  for (let day = 0; day < 365; day++) {
    const month = currentDate.get("month") as Month;

    // Apply Seasonality
    const dailyConsumption =
      averageDailyConsumption * (SEASONAL_MULTIPLIERS[month] || 1.0);
    const dailySolarGen =
      averageDailySolarGen * (SOLAR_SEASONAL_FACTORS[month] || 1.0);

    for (let hour = 0; hour < 24; hour++) {
      // Calculate Gross Consumption for this hour
      const consumptionWeight = consumptionProfile[hour];
      const grossConsumptionHour =
        (consumptionWeight / consumptionSum) * dailyConsumption;

      // Calculate Gross Solar Generation for this hour
      const solarWeight = solarProfile[hour];
      const grossSolarHour =
        solarSum > 0 ? (solarWeight / solarSum) * dailySolarGen : 0;

      // If Solar > Load: We Export. If Load > Solar: We Import.
      const netValue = grossConsumptionHour - grossSolarHour;

      let importHour = 0;
      let exportHour = 0;

      if (netValue > 0) {
        importHour = netValue; // Needed from grid
      } else {
        exportHour = Math.abs(netValue); // Excess to grid
      }

      // Distribute to 5-minute intervals
      const import5Min = importHour / 12;
      const export5Min = exportHour / 12;

      for (let minute = 0; minute < 60; minute += 5) {
        intervals.push({
          start: currentDate.set({ hour, minute }).toISO(),
          end: currentDate.set({ hour, minute: minute + 5 }).toISO(),
          kwh: import5Min,
          exportKwh: export5Min,
        });
      }
    }
    currentDate = currentDate.plus({ days: 1 });
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
