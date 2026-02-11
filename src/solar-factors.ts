import { Month } from "./seasonal-multipliers";

// Factor to convert System Size (kW) to Daily Yield (kWh)
// Avg in Australia/US is approx 4.0 kWh per 1kW of panels per day.
export const DAILY_SOLAR_YIELD_FACTOR = 4.0;
// Inverse seasonality for Solar (Summer = High, Winter = Low)
export const SOLAR_SEASONAL_FACTORS: Record<Month, number> = {
  1: 1.3,
  2: 1.2,
  3: 1.1, // Summer/Autumn
  4: 0.9,
  5: 0.7,
  6: 0.6, // Winter (Low generation)
  7: 0.6,
  8: 0.8,
  9: 1.0, // Winter/Spring
  10: 1.1,
  11: 1.2,
  12: 1.3, // Summer
};
