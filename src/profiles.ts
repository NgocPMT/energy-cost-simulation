const PROFILES = {
  // 1. "Home Evenings" (The 9-5 Worker)
  // Low usage during the day, sharp peak when they return home.
  HOME_EVENING: [
    0.2,
    0.2,
    0.2,
    0.2,
    0.2,
    0.3, // 00-05: Sleep
    0.8,
    1.2,
    0.8, // 06-08: Morning Routine
    0.2,
    0.2,
    0.2,
    0.2,
    0.2,
    0.2, // 09-14: House Empty
    0.3,
    0.8, // 15-16: Kids home?
    1.8,
    2.0,
    2.0,
    1.8, // 17-20: PEAK (Cooking/TV/AC)
    1.0,
    0.6,
    0.4, // 21-23: Wind down
  ],

  // 2. "Home All Day" (Retiree / WFH / Family)
  // Moderate, consistent usage throughout the day. Softer evening peak.
  HOME_ALL_DAY: [
    0.3,
    0.3,
    0.3,
    0.3,
    0.3,
    0.4, // 00-05: Sleep
    0.8,
    1.0,
    1.1, // 06-08: Breakfast
    1.2,
    1.2,
    1.2,
    1.2,
    1.2,
    1.2, // 09-14: Active house (PC, AC, Laundry)
    1.2,
    1.3, // 15-16: Afternoon
    1.5,
    1.6,
    1.5,
    1.4, // 17-20: Evening Dinner (Softer peak)
    1.0,
    0.7,
    0.5, // 21-23: Wind down
  ],

  // 3. "Solar Household" (The Duck Curve)
  // High usage morning/night, but almost ZERO grid usage at noon.
  // *Note: This models "Grid Import", not total consumption.*
  SOLAR_HOUSEHOLD: [
    0.3,
    0.3,
    0.3,
    0.3,
    0.3,
    0.4, // 00-05: Sleep (Grid used)
    0.8,
    0.8,
    0.5, // 06-08: Morning (Sun starts rising)
    0.1,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0, // 09-14: Midday (Solar covers everything)
    0.1,
    0.4, // 15-16: Sun fading
    1.8,
    2.0,
    2.0,
    1.8, // 17-20: PEAK (Sun gone, Grid used)
    1.0,
    0.6,
    0.4, // 21-23: Wind down
  ],

  // 4. "EV Household" (The Night Charger)
  // Looks like "Home Evenings", but with a massive block overnight.
  EV_HOUSEHOLD: [
    2.5,
    2.5,
    2.5,
    2.5,
    0.5,
    0.3, // 00-04: EV CHARGING (Huge spike)
    0.8,
    1.2,
    0.8, // 06-08: Morning
    0.2,
    0.2,
    0.2,
    0.2,
    0.2,
    0.2, // 09-14: Empty
    0.3,
    0.8, // 15-16: Afternoon
    1.8,
    2.0,
    2.0,
    1.8, // 17-20: Evening Peak
    1.0,
    1.0,
    2.5, // 21-23: Plug in EV late at night
  ],
};

export default PROFILES;
