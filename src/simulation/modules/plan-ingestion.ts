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
    "page-size": 25,
  },
  timeout: {
    send: 3_500,
  },
  retry: {
    limit: 2,
    errorCodes: ["ETIMEDOUT"],
  },
};

const brands = [
  "1st-energy",
  "actewagl",
  "active-utilities",
  "agl",
  "alinta",
  "altogether",
  "amber",
  "ampol",
  "arc-energy",
  "arcline",
  "arcstream",
  "aseno",
  "aurora",
  "besy",
  "blue-nrg",
  "brighte",
  "cleanco",
  "cleanpeak",
  "coles",
  "commander",
  "cooperative",
  "covau",
  "cpe-mascot",
  "diamond",
  "discover",
  "dodo",
  "ea-connect",
  "energy-locals",
  "energy-locals-urban",
  "energyaustralia",
  "engie",
  "erc-energy",
  "ergon",
  "evergy",
  "flipped",
  "flow-power",
  "future-x",
  "sunswitch",
  "gee-energy",
  "globird",
  "glow-power",
  "humenergy",
  "igeno",
  "io-energy",
  "kogan",
  "locality-planning",
  "localvolts",
  "lumo",
  "macarthur",
  "macquarie",
  "metered-energy",
  "microgrid",
  "momentum",
  "myob",
  "nectr",
  "next-business",
  "origin",
  "ovo-energy",
  "ovo-energy-ctm",
  "pacific-blue",
  "perpetual",
  "powerhub",
  "powershop",
  "powow",
  "raa",
  "radian",
  "real-utilities",
  "red-energy",
  "savant",
  "seene",
  "shell-energy",
  "silver-asset",
  "smart-energy",
  "solstice",
  "stanwell",
  "sumo-power",
  "tango",
  "telstra-energy",
  "tesla",
  "veolia",
  "winconnect",
  "yes-energy",
  "zen-energy",
  "circular",
  "electricity-in-a-box",
  "flow-systems",
  "people-energy",
  "powerdirect",
  "reamped",
  "sanctuary",
  "smartestenergy",
  "sumo-gas",
  "indigo",
  "sonnen",
  "erm-power",
  "mojo",
  "onby-energyaustralia",
  "qenergy",
  "tas-gas",
  "simply-energy",
  "Bright Spark",
];

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
        const brand = candidate.brand.trim();
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
          console.error(
            `[CRITICAL FAILURE] Plan ID: ${candidate.planId} | Brand: ${candidate.brand}`,
          );

          console.error(`Error Message: ${err.message}`);

          console.error(`Stack Trace:`, err.stack);
        }
        return null;
      }
    });
  });

  const results = await Promise.all(tasks);
  const normalizedPlans = results.filter((result) => result !== null);
  return normalizedPlans;
};
