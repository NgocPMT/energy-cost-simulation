export interface RawPlan {
  type: "MARKET" | "STANDING";
  brand: string;
  planId: string;
  fuelType: string;
  brandName: string;
  geography: {
    distributors: string[];
    includedPostcodes: string[];
  };
  displayName: string;
  effectiveFrom: string;
  effectiveTo?: string;
  lastUpdated: string;
  customerType: string;
}

export interface RawPlanWithDetails extends RawPlan {
  electricityContract: {
    fees?: RawFee[];
    terms: string;
    isFixed: boolean;
    discounts: {
      type: string;
      description: string;
      displayName: string;
      methodUType: string;
      percentOfBill?: {
        rate: string;
      };
      [key: string]: any;
    }[];
    eligibility: {
      type: string;
      information: string;
      [key: string]: any;
    }[];
    tariffPeriod: RawTariffPeriod[];
    [key: string]: any;
  };
}

export type RawTariffPeriod =
  | {
      startDate: string;
      endDate: string;
      dailySupplyCharge: string;
      dailySupplyChargeType: string;
      rateBlockUType: "timeOfUseRates";
      timeOfUseRates: {
        type: "PEAK" | "OFF_PEAK" | "SHOULDER";
        rates: {
          volume?: number;
          unitPrice: string;
          [key: string]: any;
        }[];
        timeOfUse: {
          days: string[];
          endTime: string;
          startTime: string;
        }[];
        [key: string]: any;
      }[];
      [key: string]: any;
    }
  | {
      startDate: string;
      endDate: string;
      dailySupplyCharge: string;
      dailySupplyChargeType: string;
      rateBlockUType: "singleRate";
      singleRate: {
        rates: {
          volume?: number;
          unitPrice: string;
          [key: string]: any;
        }[];
      };
      [key: string]: any;
    };

export type RawFee =
  | {
      term: "FIXED";
      type: string;
      amount: string;
      description: string;
    }
  | {
      term: "PERCENT_OF_BILL";
      type: string;
      rate: string;
      description: string;
    };

export interface NormalizedPlan {
  planId: string;
  displayName: string;
  brandName: string;
  tariffPeriods: NormalizedTariffPeriod[]; // The main electricity rates
  fees?: Fee[];
  discounts: NormalizedDiscount[];
  eligibilityConstraints: string[];
}

export interface NormalizedTariffPeriod {
  startDate: string; // "07-01"
  endDate: string; // "06-30"
  dailySupplyCharge: number;
  rates: NormalizedRate[];
}

export interface NormalizedRate {
  type: "PEAK" | "OFF_PEAK" | "SHOULDER";
  timeWindows: TimeWindow[];
  unitPrice: number;
  volumeLimit?: number;
}

export interface TimeWindow {
  days: string[]; // ["MON", "TUE", ...]
  startTime: string; // "00:00"
  endTime: string; // "23:59"
}

export type Fee =
  | {
      term: "FIXED";
      type: string;
      amount: number;
      description: string;
    }
  | {
      term: "PERCENT_OF_BILL";
      type: string;
      rate: number;
      description: string;
    };

export interface NormalizedDiscount {
  type: string;
  description: string;
  displayName: string;
  amount?: number;
  rate?: number;
}
