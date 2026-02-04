import { secret } from "encore.dev/config";
import got from "got";
import {
  NormalizedPlan,
  NormalizedRate,
  RawPlan,
  RawPlanWithDetails,
} from "../simulation.type";
import pLimit from "p-limit";

const planApiUrl = secret("PLAN_API_URL");

export interface GetPlansInput {
  postcode: string;
  rawPlans: RawPlan[];
}

export interface GetPlansResponse {
  data: {
    plans: RawPlan[];
  };
}

const options = {
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-v": "3",
    "x-min-v": "1",
  },
  searchParams: {
    "page-size": 100,
  },
  timeout: {
    send: 3_500,
  },
  retry: {
    limit: 2,
    errorCodes: ["ETIMEDOUT"],
  },
};

const brands = ["energyaustralia", "1st-energy", "globird"];

export const getPlans = async () => {
  // Limit to 5 concurrent requests at a time
  const limit = pLimit(5);

  const tasks = brands.map((brand) => {
    return limit(async () => {
      try {
        const response = (await got
          .get(`${planApiUrl()}/${brand}/cds-au/v1/energy/plans`, options)
          .json()) as GetPlansResponse;
        return response.data.plans as RawPlan[];
      } catch (err) {
        if (err instanceof Error) {
          console.error(`Failed to load brand ${brand}: ${err.message}`);
        }
        return [];
      }
    });
  });

  const results = await Promise.all(tasks);
  // Filter out failed result
  const allPlans = results.filter((result) => result.length > 0);
  return allPlans.flat(); // Merge plan data from brands for easier looping
};

export const fetchAndNormalizePlans = async (input: GetPlansInput) => {
  const candidates = input.rawPlans.filter(
    (plan) =>
      plan.geography.includedPostcodes.includes(input.postcode) &&
      plan.fuelType === "ELECTRICITY",
  );

  const limit = pLimit(10);

  const tasks = candidates.map(async (candidate) => {
    return limit(async () => {
      try {
        const brand = candidate.brand;
        const res = (await got
          .get(
            `${planApiUrl()}/${brand}/cds-au/v1/energy/plans/${candidate.planId}`,
            options,
          )
          .json()) as { data: unknown };
        const planWithDetails = res.data as RawPlanWithDetails;
        const normalizedPlan = normalizePlan(planWithDetails);
        return normalizedPlan;
      } catch (err) {
        if (err instanceof Error) {
          console.error(`Failed to fetch plan: ${err.message}`);
        }
        return null;
      }
    });
  });

  const results = await Promise.all(tasks);
  const normalizedPlans = results.filter((result) => result !== null);
  return normalizedPlans;
};

export const normalizePlan = (input: RawPlanWithDetails): NormalizedPlan => {
  const contract = input.electricityContract;

  const normalizedPlan = {
    planId: input.planId,
    brandName: input.brandName,
    displayName: input.displayName,
    tariffPeriods: contract.tariffPeriod.map((period) => {
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
    }),
    fees: contract.fees?.map((fee) => {
      if (fee.term === "FIXED") {
        return { ...fee, amount: parseFloat(fee.amount) };
      }
      return { ...fee, rate: parseFloat(fee.rate) };
    }),
    discounts: contract.discounts,
    eligibilityConstraints: input.electricityContract.eligibility.map(
      (constraint) => constraint.information,
    ),
  };
  return normalizedPlan;
};
