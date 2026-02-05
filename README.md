# Cost Simulation Service

This project simulates electricity plan costs based on user average monthly electricity usage. It provides the simulated annual cost and monthly breakdown for the top 3 cheapest plans available in the user's postcode area.

## Project Structure

```
encore.app
infra-config.json
package.json
README.md
tsconfig.json
encore.gen
src/
	profiles.ts
	seasonal-multipliers.ts
	simulation/
		encore.service.ts
		simulation.api.ts
		simulation.service.ts
		simulation.type.ts
		modules/
			calculate.ts
			normalize.ts
			parse-time.ts
			plan-ingestion.ts
tests/
	fixtures/
		plan-fixtures.ts
	integrated/
		calculate.test.ts
	unit/
		normalize.test.ts
		parse-time.test.ts
```

## Setup Guide

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later)
- [Encore CLI](https://encore.dev/docs/ts/install)
- [Bun](https://bun.com/) (version 1.3.5 or later)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd cost-simulate
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

### Running Locally

1. Start the Encore development server:

   ```bash
   encore run
   ```

2. While `encore run` is running, open [http://localhost:9400/](http://localhost:9400/) to view Encore's local developer dashboard.

### Testing

Run the test suite:

```bash
encore test
```

## API Endpoints Documentation

### POST /simulate-plan-cost

Simulates electricity plan costs based on average monthly usage and returns the top 3 cheapest plans with annual cost and monthly breakdown.

#### Request Body

```json
{
  "averageMonthlyUsage": 500,
  "profileType": "HOME_EVENING",
  "postcode": "3000"
}
```

- `averageMonthlyUsage` (number): Average monthly electricity usage in kWh
- `profileType` (string): One of:
  - `"HOME_EVENING"`: Home usage with higher consumption in evenings
  - `"HOME_ALL_DAY"`: Home usage spread throughout the day
  - `"SOLAR_HOUSEHOLD"`: Household with solar panels
  - `"EV_HOUSEHOLD"`: Household with electric vehicle
- `postcode` (string): Australian postcode for plan availability

#### Response

Returns an array of up to 3 plans sorted by total annual cost (lowest first).

```json
[
  {
    "planId": "plan-123",
    "displayName": "Super Saver Plan",
    "brandName": "Energy Provider Inc",
    "simulationResult": {
      "totalCost": 1234.56,
      "totalKwh": 6000.0,
      "monthlyBreakdown": [
        {
          "month": 1,
          "usage": 500.0,
          "cost": 103.45
        },
        {
          "month": 2,
          "usage": 480.0,
          "cost": 98.12
        }
        // ... 10 more months
      ]
    }
  }
  // ... up to 2 more plans
]
```

- `planId` (string): Unique identifier for the plan
- `displayName` (string): Human-readable plan name
- `brandName` (string): Energy provider brand name
- `simulationResult.totalCost` (number): Total annual cost in AUD (rounded to 2 decimals)
- `simulationResult.totalKwh` (number): Total annual usage in kWh (rounded to 2 decimals)
- `simulationResult.monthlyBreakdown` (array): Monthly cost and usage breakdown
  - `month` (number): Month number (1-12)
  - `usage` (number): Monthly usage in kWh (rounded to 2 decimals)
  - `cost` (number): Monthly cost in AUD (rounded to 2 decimals)
