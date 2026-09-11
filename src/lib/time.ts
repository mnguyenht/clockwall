import { DateTime } from "luxon";
import type { Clock, ClockNameMode } from "../types";

export function getClockDateTime(now: Date, timezone: string) {
  return DateTime.fromJSDate(now).setZone(timezone);
}

export function getTimezoneCode(dateTime: DateTime) {
  return dateTime.offsetNameShort ?? dateTime.toFormat("ZZZZ");
}

export function getClockPrimaryName(clock: Clock, dateTime: DateTime) {
  const code = getTimezoneCode(dateTime);
  const modes: Record<ClockNameMode, string> = {
    location: clock.locationName,
    "location-code": `${clock.locationName} ${code}`,
    code,
  };

  return modes[clock.nameMode];
}

export function getDayStatus(dateTime: DateTime) {
  const today = DateTime.now().setZone(dateTime.zoneName ?? "local").startOf("day");
  const clockDay = dateTime.startOf("day");
  const delta = Math.round(clockDay.diff(today, "days").days);

  if (delta === -1) {
    return "Yday";
  }

  if (delta === 1) {
    return "Tmrw";
  }

  return dateTime.toFormat("ccc, LLL d");
}

function timeToMinutes(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function isValidTimeValue(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

export function getAvailabilityDurationMinutes(workHours: Clock["workHours"]) {
  if (!workHours?.enabled || !isValidTimeValue(workHours.start) || !isValidTimeValue(workHours.end)) {
    return 0;
  }

  const start = timeToMinutes(workHours.start);
  const end = timeToMinutes(workHours.end);

  if (start === end) {
    return 24 * 60;
  }

  return end > start ? end - start : 24 * 60 - start + end;
}

export function getAvailabilityStatus(dateTime: DateTime, workHours: Clock["workHours"]) {
  if (!workHours?.enabled || !isValidTimeValue(workHours.start) || !isValidTimeValue(workHours.end)) {
    return null;
  }

  const start = timeToMinutes(workHours.start);
  const end = timeToMinutes(workHours.end);
  const current = dateTime.hour * 60 + dateTime.minute;

  if (start === end) {
    return {
      available: true,
      label: "Full day",
      detail: `${workHours.start}-${workHours.end}`,
    };
  }

  const isOvernight = start > end;
  const available = isOvernight ? current >= start || current < end : current >= start && current < end;

  return {
    available,
    label: available ? `Available until ${workHours.end}` : `Available at ${workHours.start}`,
    detail: `${workHours.start}-${workHours.end}`,
  };
}

function dateTimeWithTime(dateTime: DateTime, value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return dateTime.set({ hour: Number(hour), minute: Number(minute), second: 0, millisecond: 0 });
}

function clockFaceAngle(dateTime: DateTime) {
  const minutes = (dateTime.hour % 12) * 60 + dateTime.minute;
  return minutes * 0.5;
}

function isAwakeMinute(minuteOfDay: number) {
  return minuteOfDay >= 6 * 60 && minuteOfDay < 22 * 60;
}

// A 12-hour dial draws an arc across the 12 o'clock mark as one continuous
// sector, so the only splits that mean anything are the awake/sleep edges.
function nextAwakeBoundary(dateTime: DateTime) {
  const startOfDay = dateTime.startOf("day");
  const boundaries = [
    startOfDay.plus({ hours: 6 }),
    startOfDay.plus({ hours: 22 }),
    startOfDay.plus({ days: 1, hours: 6 }),
  ];

  return boundaries.find((boundary) => boundary > dateTime) ?? startOfDay.plus({ days: 1, hours: 6 });
}

export function getAvailabilityArcs(clockDateTime: DateTime, primaryDateTime: DateTime, workHours: Clock["workHours"]) {
  if (!workHours?.enabled || !isValidTimeValue(workHours.start) || !isValidTimeValue(workHours.end)) {
    return [];
  }

  const durationTotal = getAvailabilityDurationMinutes(workHours);
  if (durationTotal > 720) {
    return [];
  }

  const sourceDateTime = workHours.basis === "primary" ? primaryDateTime : clockDateTime;
  const startSource = dateTimeWithTime(sourceDateTime, workHours.start);
  let endSource = dateTimeWithTime(sourceDateTime, workHours.end);

  if (timeToMinutes(workHours.end) <= timeToMinutes(workHours.start)) {
    endSource = endSource.plus({ days: 1 });
  }

  const startOnClock = startSource.setZone(clockDateTime.zoneName ?? clockDateTime.zone.name);
  const endOnClock = endSource.setZone(clockDateTime.zoneName ?? clockDateTime.zone.name);
  const arcs: Array<{ startAngle: number; sizeAngle: number; variant: "active" | "outline" }> = [];
  let cursor = startOnClock;
  let guard = 0;

  while (cursor < endOnClock && guard < 6) {
    const boundary = nextAwakeBoundary(cursor);
    const segmentEnd = boundary < endOnClock ? boundary : endOnClock;
    const durationMinutes = segmentEnd.diff(cursor, "minutes").minutes;

    if (durationMinutes > 0) {
      const midpoint = cursor.plus({ minutes: durationMinutes / 2 });
      const midpointMinute = midpoint.hour * 60 + midpoint.minute;

      arcs.push({
        startAngle: clockFaceAngle(cursor),
        sizeAngle: Math.min(360, durationMinutes * 0.5),
        variant: isAwakeMinute(midpointMinute) ? "active" : "outline",
      });
    }

    cursor = segmentEnd;
    guard += 1;
  }

  return arcs;
}
