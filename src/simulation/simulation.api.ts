import { api } from "encore.dev/api";
import SimulationService from "./simulation.service";

interface SimulatePlanCostRequest {
  averageMonthlyUsage: number; // kWh
  profileType:
    | "HOME_EVENING"
    | "HOME_ALL_DAY"
    | "SOLAR_HOUSEHOLD"
    | "EV_HOUSEHOLD";
  postcode: string;
}

export const simulatePlanCost = api(
  { expose: true, method: "POST", path: "/simulate-plan-cost" },
  async (req: SimulatePlanCostRequest) => {
    return await SimulationService.simulatePlanCost(req);
  },
);
