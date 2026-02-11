# Cost Simulation Service

This service simulates electricity plan costs using a user's average monthly electricity usage and a consumption profile. It returns the cheapest plan recommendations (top 3) with annual cost and a monthly breakdown.

**Key behavior:** the API expands the average monthly usage into simulated time intervals, ingests available plans for the given postcode, normalizes tariffs, and calculates costs per interval to produce an annual cost and monthly breakdown.

## Repository tree (relevant files)

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
  solar-factors.ts
  simulation/
    encore.service.ts
    simulation.api.ts
    simulation.service.ts
    simulation.type.ts
    modules/
      calculate.ts
      cost-daily-supply.ts
      cost-demand.ts
      cost-usage.ts
      normalize.ts
      parse-time.ts
      plan-ingestion.ts
      utils.ts
tests/
  fixtures
  integrated
  unit
.env
.gitignore
bun.lock
node_modules/
```

Files of particular interest:

- API entry: [src/simulation/simulation.api.ts](src/simulation/simulation.api.ts#L1)
- Core service: [src/simulation/simulation.service.ts](src/simulation/simulation.service.ts#L1)
- Cost calculation: [src/simulation/modules/calculate.ts](src/simulation/modules/calculate.ts#L1)
- Plan ingestion & normalization: [src/simulation/modules/plan-ingestion.ts](src/simulation/modules/plan-ingestion.ts#L1) and [src/simulation/modules/normalize.ts](src/simulation/modules/normalize.ts#L1)

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

While `encore run` is active, view the local dev dashboard at `http://localhost:9400/`.

If you want to run tests or node scripts directly, you can run TypeScript/compiled code or run the test suite below.

### Testing

Run the test suite:

```bash
encore test
```

Unit tests live under `tests/unit` and integration tests under `tests/integrated`.

## API Endpoints

All endpoints are defined with Encore's API helpers. The main public endpoint for this project is:

### POST /simulate-plan-cost

Defined in [src/simulation/simulation.api.ts](src/simulation/simulation.api.ts#L1).

Simulates electricity plan costs from `averageMonthlyUsage`, `profileType`, and `postcode`. Returns up to the 3 cheapest available plans with per-plan simulation results.

Request example

```json
{
  "averageMonthlyUsage": 500,
  "profileType": "HOME_EVENING",
  "postcode": "3000"
}
```

Request fields

- `averageMonthlyUsage` (number): average monthly usage in kWh
- `profileType` (string): one of `HOME_EVENING`, `HOME_ALL_DAY`, `SOLAR_HOUSEHOLD`, `EV_HOUSEHOLD` (see [src/simulation/simulation.api.ts](src/simulation/simulation.api.ts#L1))
- `postcode` (string): postcode to filter plans by geography

Response shape

An array of plan results (sorted ascending by total cost). Each item contains plan metadata and a `simulationResult` object produced by `calculateCost` in [src/simulation/modules/calculate.ts](src/simulation/modules/calculate.ts#L1).

Example response (abridged):

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
        { "month": 1, "usage": 500.0, "cost": 103.45 },
        { "month": 2, "usage": 480.0, "cost": 98.12 }
        // ... remaining months
      ]
    }
  }
]
```

Field details

- `planId`: plan identifier from the ingested plan data
- `displayName`: human readable plan name
- `brandName`: provider brand
- `simulationResult.totalCost`: total annual cost in AUD (rounded to 2 dp)
- `simulationResult.totalKwh`: total annual kWh across simulated intervals
- `simulationResult.monthlyBreakdown`: array of monthly objects with `month` (1-12), `usage` (kWh), and `cost` (AUD)

Where the work happens

- The API expands `averageMonthlyUsage` into simulated intervals via `normalize` ([src/simulation/modules/normalize.ts](src/simulation/modules/normalize.ts#L1)).
- Plans are obtained and normalized in `plan-ingestion` ([src/simulation/modules/plan-ingestion.ts](src/simulation/modules/plan-ingestion.ts#L1)).
- Costs are computed in `calculate` ([src/simulation/modules/calculate.ts](src/simulation/modules/calculate.ts#L1)).

## Development notes

- To add new profile types, update `simulation.api.ts` and `normalize.ts` to control how usage expands into hourly/daily intervals.
- If you change plan ingestion, add fixtures under `tests/fixtures/plan-fixtures.ts` and update unit tests in `tests/unit`.

## Deployment

Push to Encore for staging (existing Encore setup required):

```bash
git add -A .
git commit -m "Deploy"
git push encore
```

Visit the Encore Cloud dashboard at https://app.encore.dev to monitor deployments.

---

File: [README.md](README.md)
