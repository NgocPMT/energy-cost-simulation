import PROFILES from "../../profiles";
import SEASONAL_MULTIPLIERS, { Month } from "../../seasonal-multipliers";
import { DateTime } from "luxon";

export interface NormalizeMode2Input {
  averageMonthlyUsage: number; // kWh
  profileType:
    | "HOME_EVENING"
    | "HOME_ALL_DAY"
    | "SOLAR_HOUSEHOLD"
    | "EV_HOUSEHOLD";
  postcode: string;
}

export interface SimulatedInterval {
  start: string;
  end: string;
  kwh: number;
}

export const normalizeMode2 = (input: NormalizeMode2Input) => {
  const intervals: SimulatedInterval[] = [];
  const profile = PROFILES[input.profileType];
  // Use to simulate the next 365 days
  let currentDate = DateTime.now().startOf("day");

  const profileSum = profile.reduce((sum, val) => sum + val, 0);
  const averageDailyUsage = input.averageMonthlyUsage / 30.4; // Average days in a month

  for (let day = 0; day < 365; day++) {
    const month = currentDate.get("month") as Month;
    // Recalculate daily usage with seasonal factor
    const seasonalDailyUsage =
      averageDailyUsage * SEASONAL_MULTIPLIERS[month] || 1.0;

    for (let hour = 0; hour < 24; hour++) {
      const hourWeight = profile[hour];
      const intervalKwhHour = (hourWeight / profileSum) * seasonalDailyUsage;
      const intervalKwh5Min = intervalKwhHour / 12; // Split hourly kWh to 12 x 5-min intervals

      for (let minute = 0; minute < 60; minute += 5) {
        intervals.push({
          start: currentDate.set({ hour, minute }).toISO(),
          end: currentDate.set({ hour, minute: minute + 5 }).toISO(),
          kwh: intervalKwh5Min,
        });
      }
    }
    currentDate = currentDate.plus({ days: 1 }); // Next day
  }
  return intervals;
};
