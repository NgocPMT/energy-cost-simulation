import { secret } from "encore.dev/config";
import got from "got";
import { RawPlan, RawPlanWithDetails } from "../simulation.type";
import pLimit from "p-limit";
import { normalizePlan } from "./normalize";

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
