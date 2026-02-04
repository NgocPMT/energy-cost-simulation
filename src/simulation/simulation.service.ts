import { calculateCost } from "./modules/calculate";
import { normalizeMode2 } from "./modules/normalize";
import { fetchAndNormalizePlans, getPlans } from "./modules/plan-ingestion";

interface SimulatePlanCostInput {
  averageMonthlyUsage: number; // kWh
  profileType:
    | "HOME_EVENING"
    | "HOME_ALL_DAY"
    | "SOLAR_HOUSEHOLD"
    | "EV_HOUSEHOLD";
  postcode: string;
}

const SimulationService = {
  simulatePlanCost: async ({
    averageMonthlyUsage,
    profileType,
    postcode,
  }: SimulatePlanCostInput) => {
    const intervals = normalizeMode2({
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
