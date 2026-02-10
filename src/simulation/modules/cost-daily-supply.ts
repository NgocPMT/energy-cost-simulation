import { NormalizedTariffPeriod } from "../simulation.type";
import { findPeriod } from "./utils";

export interface GetDailySupplyChargeInput {
  tariffPeriods: NormalizedTariffPeriod[];
  currentDate: string;
}

export const getDailySupplyCharge = ({
  tariffPeriods,
  currentDate,
}: GetDailySupplyChargeInput) => {
  const tariffPeriod = findPeriod({ periods: tariffPeriods, currentDate });

  if (!tariffPeriod) {
    throw new Error(
      "Error getting supply charge: There is no daily supply charge matched in the current plan",
    );
  }

  return tariffPeriod.dailySupplyCharge;
};
