import { NormalizedPlan } from "../simulation.type";
import { SimulatedInterval } from "./normalize";

export interface CalculatePlanInput {
  plan: NormalizedPlan;
  intervals: SimulatedInterval[];
}

export const calculatePlan = () => {};
