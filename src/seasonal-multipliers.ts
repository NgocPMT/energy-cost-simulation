export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const SEASONAL_MULTIPLIERS: Record<Month, number> = {
  1: 1.13, // Jan (Summer peak)
  2: 0.96,
  3: 0.96,
  4: 0.87, // Autumn shoulder (Low usage)
  5: 0.87,
  6: 1.04, // Winter start
  7: 1.13, // Winter peak
  8: 1.04,
  9: 0.87, // Spring shoulder (Low usage)
  10: 0.96,
  11: 1.04,
  12: 1.13, // Dec (Summer peak)
};

export default SEASONAL_MULTIPLIERS;
