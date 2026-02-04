import { DateTime } from "luxon";

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
  const day = days[dt.weekday - 1];

  return { day, minuteOfDay, dt };
};
