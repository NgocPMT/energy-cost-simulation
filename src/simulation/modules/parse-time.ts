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
  return dt.hour * 60 + dt.minute;
};
