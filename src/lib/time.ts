import { DateTime } from "luxon";
import type { Clock, ClockNameMode } from "../types";

// CST is ambiguous; prefer US Central (-360) over China Standard (+480).
// IST is ambiguous; prefer India (+330) over Ireland (+60) and Israel (+120).
const TIMEZONE_ABBREVIATION_OFFSETS: Readonly<Record<string, number>> = {
  UTC: 0,
  GMT: 0,
  Z: 0,
  WET: 0,
  WEST: 60,
  BST: 60,
  IST: 330,
  CET: 60,
  CEST: 120,
  EET: 120,
  EEST: 180,
  MSK: 180,
  WAT: 60,
  SAST: 120,
  EAT: 180,
  GST: 240,
  PKT: 300,
  NPT: 345,
  ICT: 420,
  WIB: 420,
  HKT: 480,
  SGT: 480,
  AWST: 480,
  JST: 540,
  KST: 540,
  ACST: 570,
  AEST: 600,
  AEDT: 660,
  NZST: 720,
  NZDT: 780,
  EST: -300,
  EDT: -240,
  CST: -360,
  CDT: -300,
  MST: -420,
  MDT: -360,
  PST: -480,
  PDT: -420,
  AKST: -540,
  AKDT: -480,
  HST: -600,
  AST: -240,
  ADT: -180,
  NST: -210,
  BRT: -180,
  ART: -180,
  CLT: -240,
  COT: -300,
  PET: -300,
  VET: -240,
};

const zoneOffsetsByYear = new Map<string, Set<number>>();

export function resolveTimezoneQuery(query: string): { offset: number; label: string } | null {
  const normalized = query.trim().toUpperCase();
  const abbreviationOffset = TIMEZONE_ABBREVIATION_OFFSETS[normalized];
  if (abbreviationOffset !== undefined) {
    return { offset: abbreviationOffset, label: normalized };
  }

  const match = normalized.match(/^(?:UTC|GMT)?([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  if (hours > 23 || minutes > 59) {
    return null;
  }

  const offset = hours * 60 + minutes;
  const signedOffset = match[1] === "-" ? -offset : offset;
  const minuteLabel = minutes > 0 ? `:${String(minutes).padStart(2, "0")}` : "";
  return {
    offset: signedOffset,
    label: `UTC${match[1]}${hours}${minuteLabel}`,
  };
}

export function parseTimezoneQuery(query: string): number | null {
  return resolveTimezoneQuery(query)?.offset ?? null;
}

export function getZoneOffsets(timezone: string, now: Date): Set<number> {
  const year = DateTime.fromJSDate(now).year;
  const cacheKey = `${timezone}:${year}`;
  const cached = zoneOffsetsByYear.get(cacheKey);
  if (cached) {
    return cached;
  }

  const samples = [
    DateTime.fromObject({ year, month: 1, day: 15 }, { zone: timezone }),
    DateTime.fromObject({ year, month: 7, day: 15 }, { zone: timezone }),
    DateTime.fromJSDate(now).setZone(timezone),
  ];
  const offsets = samples.every((sample) => sample.isValid)
    ? new Set(samples.map((sample) => sample.offset))
    : new Set<number>();

  zoneOffsetsByYear.set(cacheKey, offsets);
  return offsets;
}

export function getClockDateTime(now: Date, timezone: string) {
  return DateTime.fromJSDate(now).setZone(timezone);
}

export function getTimezoneCode(dateTime: DateTime) {
  return dateTime.offsetNameShort ?? dateTime.toFormat("ZZZZ");
}

export function getClockPrimaryName(clock: Clock, dateTime: DateTime, timezoneCodeOverride?: string) {
  const code = timezoneCodeOverride ?? getTimezoneCode(dateTime);
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
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60;
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

function isAwakeMinute(minuteOfDay: number, awake: { start: string; end: string }) {
  const start = timeToMinutes(awake.start);
  const end = timeToMinutes(awake.end);
  return start <= end ? minuteOfDay >= start && minuteOfDay < end : minuteOfDay >= start || minuteOfDay < end;
}

// A 12-hour dial draws an arc across the 12 o'clock mark as one continuous
// sector, so the only splits that mean anything are the awake/sleep edges.
function nextAwakeBoundary(dateTime: DateTime, awake: { start: string; end: string }) {
  const startOfDay = dateTime.startOf("day");
  const boundaries = [
    dateTimeWithTime(startOfDay, awake.start),
    dateTimeWithTime(startOfDay, awake.end),
    dateTimeWithTime(startOfDay.plus({ days: 1 }), awake.start),
    dateTimeWithTime(startOfDay.plus({ days: 1 }), awake.end),
  ].sort((left, right) => left.toMillis() - right.toMillis());

  return boundaries.find((boundary) => boundary > dateTime) ?? dateTimeWithTime(startOfDay.plus({ days: 2 }), awake.start);
}

export function getAvailabilityArcs(
  clockDateTime: DateTime,
  primaryDateTime: DateTime,
  workHours: Clock["workHours"],
  awake: { start: string; end: string },
) {
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
    const boundary = nextAwakeBoundary(cursor, awake);
    const segmentEnd = boundary < endOnClock ? boundary : endOnClock;
    const durationMinutes = segmentEnd.diff(cursor, "minutes").minutes;

    if (durationMinutes > 0) {
      const midpoint = cursor.plus({ minutes: durationMinutes / 2 });
      const midpointMinute = midpoint.hour * 60 + midpoint.minute;

      arcs.push({
        startAngle: clockFaceAngle(cursor),
        sizeAngle: Math.min(360, durationMinutes * 0.5),
        variant: isAwakeMinute(midpointMinute, awake) ? "active" : "outline",
      });
    }

    cursor = segmentEnd;
    guard += 1;
  }

  return arcs;
}
