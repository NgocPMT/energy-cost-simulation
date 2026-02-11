export interface RawIntervalRead {
  date: string;
  interval_read: {
    aggregate_value: number;
    read_interval_length: number;
    interval_reads: number[];
  };
}

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
    discounts?: RawDiscount[];
    eligibility?: {
      type: string;
      information: string;
      [key: string]: any;
    }[];
    tariffPeriod: RawTariffPeriod[];
    [key: string]: any;
  };
}

export type RawTariffPeriod =
  | RawSingleRatePeriod
  | RawTOUPeriod
  | RawDemandChargePeriod;

export interface RawSingleRatePeriod {
  rateBlockUType: "timeOfUseRates";
  startDate: string;
  endDate: string;
  dailySupplyCharge: string;
  dailySupplyChargeType: string;
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
export interface RawTOUPeriod {
  rateBlockUType: "singleRate";
  startDate: string;
  endDate: string;
  dailySupplyCharge: string;
  dailySupplyChargeType: string;
  singleRate: {
    rates: {
      volume?: number;
      unitPrice: string;
      [key: string]: any;
    }[];
  };
  [key: string]: any;
}
export interface RawDemandChargePeriod {
  rateBlockUType: "demandCharges";
  startDate: string;
  endDate: string;
  demandCharges: RawDemandCharge[];
}
export interface RawDemandCharge {
  days: string[];
  amount: string;
  endTime: string;
  startTime: string;
  measurementPeriod: string;
  [key: string]: any;
}

export interface RawDiscount {
  type: "GUARANTEED" | "CONDITIONAL";
  category?: string;
  description: string;
  displayName: string;
  methodUType: string;
  percentOfBill: {
    rate: string;
  };
  [key: string]: any;
}

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
  discounts?: NormalizedDiscount[];
  eligibilityConstraints?: string[];
  demandCharges?: NormalizedDemandChargePeriod[];
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

export type NormalizedDiscount = {
  type: "GUARANTEED" | "CONDITIONAL";
  category?: string;
  description: string;
  displayName: string;
  rate: number;
};

export interface NormalizedDemandChargePeriod {
  startDate: string;
  endDate: string;
  demandCharges: NormalizedDemandCharge[];
}

export interface NormalizedDemandCharge {
  days: string[];
  amount: number;
  startTime: string; // "15:00"
  endTime: string; // "21:00"
  measurementPeriod: string;
}
