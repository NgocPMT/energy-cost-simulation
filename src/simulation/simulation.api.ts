import { api } from "encore.dev/api";
import SimulationService from "./simulation.service";
import { RawIntervalRead } from "./simulation.type";

export interface ProfileSimulationRequest {
  averageMonthlyUsage: number;
  profileType:
    | "HOME_EVENING"
    | "HOME_ALL_DAY"
    | "SOLAR_HOUSEHOLD"
    | "EV_HOUSEHOLD";
  postcode: string;
}

export const simulatePlanCostProfile = api(
  { expose: true, method: "POST", path: "/simulate-plan-cost-profile" },
  async (req: ProfileSimulationRequest) => {
    return await SimulationService.simulatePlanCostProfile(req);
  },
);

export const simulatePlanCostInterval = api(
  { expose: true, method: "POST", path: "/simulate-plan-cost-interval" },
  async (req: RawIntervalRead & { postcode: string }) => {
    return await SimulationService.simulatePlanCostInterval(req);
  },
);
