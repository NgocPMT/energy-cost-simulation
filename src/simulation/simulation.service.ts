import { calculateCost } from "./modules/calculate";
import { normalizeInterval, normalizeProfile } from "./modules/normalize";
import { fetchAndNormalizePlans, getPlans } from "./modules/plan-ingestion";
import { RawIntervalRead } from "./simulation.type";

type SimulatePlanCostInput = RawIntervalRead & { postcode: string };

interface SimulatePlanCostProfileInput {
  averageMonthlyUsage: number; // kWh
  profileType:
    | "HOME_EVENING"
    | "HOME_ALL_DAY"
    | "SOLAR_HOUSEHOLD"
    | "EV_HOUSEHOLD";
  postcode: string;
}

const SimulationService = {
  simulatePlanCostInterval: async ({
    date,
    interval_read,
    postcode,
  }: SimulatePlanCostInput) => {
    const intervals = normalizeInterval({ date, interval_read });
    const rawPlans = await getPlans();
    const plans = await fetchAndNormalizePlans({ rawPlans, postcode });
    const results = plans.map((plan) => {
      return {
        planId: plan.planId,
        displayName: plan.displayName,
        brandName: plan.brandName,
        simulationResult: calculateCost({ plan, intervals }),
      };
    });
    return results
      .sort(
        (r1, r2) =>
          r1.simulationResult.totalCost - r2.simulationResult.totalCost,
      )
      .slice(0, 3);
  },
  simulatePlanCostProfile: async ({
    averageMonthlyUsage,
    profileType,
    postcode,
  }: SimulatePlanCostProfileInput) => {
    const intervals = normalizeProfile({
      averageMonthlyUsage,
      profileType,
      postcode,
    });
    const rawPlans = await getPlans();
    const plans = await fetchAndNormalizePlans({ rawPlans, postcode });
    const results = plans.map((plan) => {
      return {
        planId: plan.planId,
        displayName: plan.displayName,
        brandName: plan.brandName,
        simulationResult: calculateCost({ plan, intervals }),
      };
    });
    return results
      .sort(
        (r1, r2) =>
          r1.simulationResult.totalCost - r2.simulationResult.totalCost,
      )
      .slice(0, 3);
  },
};

export default SimulationService;
