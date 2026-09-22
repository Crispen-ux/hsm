export interface DayHours {
  open: string;
  close: string;
}

export type WeeklyHours = readonly [
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
];

export const BUSINESS_TIME_ZONE = "Africa/Johannesburg";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMinutes(time: string): number | null {
  const match = TIME_PATTERN.exec(time);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function localClock(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const day = WEEKDAYS.findIndex((name) => name === weekday);

  return { day, minutes: hour * 60 + minute };
}

export function isOpenNow(hours: WeeklyHours, now: Date): boolean {
  const { day, minutes } = localClock(now);
  const today = hours[day];
  if (!today) {
    return false;
  }
  const open = toMinutes(today.open);
  const close = toMinutes(today.close);
  if (open === null || close === null) {
    return false;
  }
  return minutes >= open && minutes < close;
}

export function describeHours(hours: WeeklyHours): string {
  const segments: string[] = [];
  let start = 0;

  while (start < 7) {
    const current = hours[start] ?? null;
    let end = start;
    while (end + 1 < 7) {
      const next = hours[end + 1] ?? null;
      const same = current === null ? next === null : next !== null && next.open === current.open && next.close === current.close;
      if (!same) {
        break;
      }
      end += 1;
    }
    const range = start === end ? WEEKDAYS[start] : `${WEEKDAYS[start]} to ${WEEKDAYS[end]}`;
    segments.push(current ? `${range} ${current.open} to ${current.close}` : `${range} closed`);
    start = end + 1;
  }

  return segments.join(", ");
}
