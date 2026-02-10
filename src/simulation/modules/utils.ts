import { DateTime } from "luxon";

interface PeriodWithDates {
  startDate: string;
  endDate: string;
}

interface FindPeriodInput<T extends PeriodWithDates> {
  periods: T[];
  currentDate: string;
}

// Find matched period by current date
export const findPeriod = <T extends PeriodWithDates>({
  periods,
  currentDate,
}: FindPeriodInput<T>): T | undefined => {
  const period = periods.find((period) => {
    const start = period.startDate;
    const end = period.endDate;

    // Handle plan span 2 years edge case
    if (start < end) {
      return currentDate >= start && currentDate <= end;
    } else {
      return currentDate >= start || currentDate <= end;
    }
  });
  return period;
};

/* Below are functions for normalizing different time formats to minutes, make it easier to compare time in different formats */

// Convert string with hh:mm time format to minutes
export const parseHourMinuteToMinutes = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

// Parse ISO string to minutes
export const parseISOStringToMinutes = (isoString: string) => {
  //todo handle timezone
  const dt = DateTime.fromISO(isoString);

  if (!dt.isValid) {
    throw new Error(
      `Invalid ISO string provided: ${isoString} (${dt.invalidReason})`,
    );
  }

  const minuteOfDay = dt.hour * 60 + dt.minute;
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const weekDay = days[dt.weekday - 1];

  return { weekDay, minuteOfDay, dt };
};

export const roundTo2DecimalPlaces = (value: number) => {
  return Math.round(value * 100) / 100;
};
