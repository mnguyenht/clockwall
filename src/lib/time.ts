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
  TRT: 180,
  WAT: 60,
  CAT: 120,
  SAST: 120,
  EAT: 180,
  MUT: 240,
  SCT: 240,
  RET: 240,
  GST: 240,
  PKT: 300,
  IRST: 210,
  IRDT: 270,
  AFT: 270,
  NPT: 345,
  BTT: 360,
  MMT: 390,
  ICT: 420,
  WIB: 420,
  MYT: 480,
  HKT: 480,
  SGT: 480,
  BNT: 480,
  PHT: 480,
  AWST: 480,
  JST: 540,
  KST: 540,
  TLT: 540,
  IDT: 180,
  AZT: 240,
  AMT: 240,
  GET: 240,
  UZT: 300,
  TMT: 300,
  TJT: 300,
  KGT: 360,
  MVT: 300,
  ACST: 570,
  ACDT: 630,
  AEST: 600,
  AEDT: 660,
  LHST: 630,
  LHDT: 660,
  NZST: 720,
  NZDT: 780,
  CHAST: 765,
  CHADT: 825,
  FJT: 720,
  PGT: 600,
  SBT: 660,
  VUT: 660,
  NCT: 660,
  SST: 780,
  TOT: 780,
  CKT: -600,
  TAHT: -600,
  MART: -570,
  GAMT: -540,
  PWT: 540,
  NRT: 720,
  NUT: -660,
  TVT: 720,
  TKT: 780,
  CHUT: 600,
  KOST: 660,
  PONT: 660,
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
  NDT: -150,
  BRT: -180,
  BRST: -120,
  ART: -180,
  CLT: -240,
  CLST: -180,
  COT: -300,
  PET: -300,
  ECT: -300,
  BOT: -240,
  VET: -240,
  GYT: -240,
  SRT: -180,
  PYT: -240,
  PYST: -180,
  UYT: -180,
  GALT: -360,
};

// "Eastern" and "Central" are ambiguous across the US, Europe, and Australia;
// the US reading is the deliberate choice, consistent with CST above.
const TIMEZONE_ALIAS_ZONES: Readonly<Record<string, string>> = {
  PT: "America/Los_Angeles",
  PACIFIC: "America/Los_Angeles",
  ET: "America/New_York",
  EASTERN: "America/New_York",
  CT: "America/Chicago",
  CENTRAL: "America/Chicago",
  MT: "America/Denver",
  MOUNTAIN: "America/Denver",
  AKT: "America/Anchorage",
  ALASKA: "America/Anchorage",
  HAWAII: "Pacific/Honolulu",
};

// CLDR long names are used as keys because they are DST-aware. A missing entry
// deliberately falls back to the GMT/UTC offset instead of guessing a code.
// Real-world collisions (including IST, CST, AMT, and BST) are intentional.
const TIMEZONE_LONG_NAME_CODES: Readonly<Record<string, string>> = {
  "Coordinated Universal Time": "UTC",

  // Europe — the winter names say "Standard" but the conventional code drops it
  "Central European Standard Time": "CET",
  "Central European Summer Time": "CEST",
  "Eastern European Standard Time": "EET",
  "Eastern European Summer Time": "EEST",
  "Western European Standard Time": "WET",
  "Western European Summer Time": "WEST",
  "British Summer Time": "BST",
  "Irish Standard Time": "IST",
  "Moscow Standard Time": "MSK",
  "Turkey Time": "TRT",

  // Asia
  "India Standard Time": "IST",
  "Pakistan Standard Time": "PKT",
  "Iran Standard Time": "IRST",
  "Iran Daylight Time": "IRDT",
  "Afghanistan Time": "AFT",
  "Nepal Time": "NPT",
  "Bhutan Time": "BTT",
  "Bangladesh Standard Time": "BST",
  "Myanmar Time": "MMT",
  "Indochina Time": "ICT",
  "Malaysia Time": "MYT",
  "Singapore Standard Time": "SGT",
  "Brunei Darussalam Time": "BNT",
  "Hong Kong Standard Time": "HKT",
  "China Standard Time": "CST",
  "Taipei Standard Time": "CST",
  "Japan Standard Time": "JST",
  "Korean Standard Time": "KST",
  "Philippine Standard Time": "PHT",
  "Timor-Leste Time": "TLT",
  "Gulf Standard Time": "GST",
  "Arabian Standard Time": "AST",
  "Israel Standard Time": "IST",
  "Israel Daylight Time": "IDT",
  "Azerbaijan Standard Time": "AZT",
  "Armenia Standard Time": "AMT",
  "Georgia Standard Time": "GET",
  "Uzbekistan Standard Time": "UZT",
  "Turkmenistan Standard Time": "TMT",
  "Tajikistan Time": "TJT",
  "Kyrgyzstan Time": "KGT",
  "Maldives Time": "MVT",

  // Africa
  "West Africa Standard Time": "WAT",
  "Central Africa Time": "CAT",
  "East Africa Time": "EAT",
  "South Africa Standard Time": "SAST",
  "Mauritius Standard Time": "MUT",
  "Seychelles Time": "SCT",
  "Réunion Time": "RET",

  // Oceania
  "Australian Eastern Standard Time": "AEST",
  "Australian Eastern Daylight Time": "AEDT",
  "Australian Central Standard Time": "ACST",
  "Australian Central Daylight Time": "ACDT",
  "Australian Western Standard Time": "AWST",
  "Lord Howe Standard Time": "LHST",
  "Lord Howe Daylight Time": "LHDT",
  "New Zealand Standard Time": "NZST",
  "New Zealand Daylight Time": "NZDT",
  "Chatham Standard Time": "CHAST",
  "Chatham Daylight Time": "CHADT",
  "Fiji Standard Time": "FJT",
  "Papua New Guinea Time": "PGT",
  "Solomon Islands Time": "SBT",
  "Vanuatu Standard Time": "VUT",
  "New Caledonia Standard Time": "NCT",
  "Samoa Standard Time": "SST",
  "Tonga Standard Time": "TOT",
  "Cook Islands Standard Time": "CKT",
  "Tahiti Time": "TAHT",
  "Marquesas Time": "MART",
  "Gambier Time": "GAMT",
  "Palau Time": "PWT",
  "Nauru Time": "NRT",
  "Niue Time": "NUT",
  "Tuvalu Time": "TVT",
  "Tokelau Time": "TKT",
  "Chuuk Time": "CHUT",
  "Kosrae Time": "KOST",
  "Pohnpei Time": "PONT",

  // Americas outside the CLDR short set
  "Brasilia Standard Time": "BRT",
  "Brasilia Summer Time": "BRST",
  "Argentina Standard Time": "ART",
  "Chile Standard Time": "CLT",
  "Chile Summer Time": "CLST",
  "Colombia Standard Time": "COT",
  "Peru Standard Time": "PET",
  "Ecuador Time": "ECT",
  "Bolivia Time": "BOT",
  "Venezuela Time": "VET",
  "Guyana Time": "GYT",
  "Suriname Time": "SRT",
  "Paraguay Standard Time": "PYT",
  "Paraguay Summer Time": "PYST",
  "Uruguay Standard Time": "UYT",
  "Amazon Standard Time": "AMT",
  "Galapagos Time": "GALT",
  "Atlantic Standard Time": "AST",
  "Atlantic Daylight Time": "ADT",
  "Newfoundland Standard Time": "NST",
  "Newfoundland Daylight Time": "NDT",
  "Cuba Standard Time": "CST",
  "Cuba Daylight Time": "CDT",
};

const zoneOffsetsByYear = new Map<string, Set<number>>();
const zoneCodesByYear = new Map<string, Set<string>>();

export function resolveTimezoneQuery(query: string, now?: Date): { offset: number; label: string; focusMinutes: number } | null {
  // Strip whitespace everywhere, not just the ends: "est +4" is the natural way to type
  // a code and an offset, and the picker's own offset parser has always accepted it.
  const normalized = query.toUpperCase().replace(/\s+/g, "");
  // The hour digits and a dangling colon are optional so that half-typed offsets keep
  // working: "EST+" and "EST+1:" resolve as EST rather than collapsing to null, which
  // would blank the wall between one keystroke and the next.
  const match = normalized.match(/^([A-Z]+)?(?:([+-])(\d{1,2})?(?::?(\d{2}))?)?:?$/);
  if (!match || (!match[1] && !match[2])) {
    return null;
  }

  let baseName = match[1] ?? "UTC";
  let baseOffset = TIMEZONE_ABBREVIATION_OFFSETS[baseName];
  const aliasZone = TIMEZONE_ALIAS_ZONES[baseName];
  if (baseOffset === undefined && aliasZone) {
    const aliasDateTime = now
      ? getClockDateTime(now, aliasZone)
      : DateTime.fromObject({ year: 2020, month: 1, day: 15 }, { zone: aliasZone });
    baseName = getTimezoneCode(aliasDateTime);
    baseOffset = TIMEZONE_ABBREVIATION_OFFSETS[baseName];
  }
  if (baseOffset === undefined) {
    return null;
  }

  const hours = Number(match[3] ?? "0");
  const minutes = Number(match[4] ?? "0");
  if (hours > 23 || minutes > 59) {
    return null;
  }

  const offset = hours * 60 + minutes;
  const signedOffset = match[2] === "-" ? -offset : offset;
  return {
    offset: baseOffset,
    label: baseName,
    focusMinutes: signedOffset,
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

export function getZoneCodes(timezone: string, now: Date): Set<string> {
  const year = DateTime.fromJSDate(now).year;
  const cacheKey = `${timezone}:${year}`;
  const cached = zoneCodesByYear.get(cacheKey);
  if (cached) {
    return cached;
  }

  const samples = [
    DateTime.fromObject({ year, month: 1, day: 15 }, { zone: timezone }),
    DateTime.fromObject({ year, month: 7, day: 15 }, { zone: timezone }),
    DateTime.fromJSDate(now).setZone(timezone),
  ];
  const codes = samples.every((sample) => sample.isValid)
    ? new Set(samples.map((sample) => getTimezoneCode(sample)))
    : new Set<string>();

  zoneCodesByYear.set(cacheKey, codes);
  return codes;
}

export function getClockDateTime(now: Date, timezone: string) {
  return DateTime.fromJSDate(now).setZone(timezone);
}

export function getRelativeTimezoneDeltas(
  timezones: string[],
  now: Date,
  resolvedOffset: number,
  anchorCandidates: string[] = timezones,
  anchorLabel?: string,
): number[] {
  // Anchor on a zone that actually USES the searched code, not merely one whose year
  // includes that offset. In September "EST" must anchor to New York living at -240 on
  // EDT, so the deltas match the clocks on screen. Matching by offset instead would let
  // London answer a "UTC" search purely because it drops to +0 every winter, and every
  // label would come out an hour off while London sits on BST.
  const anchorTimezone = anchorLabel
    ? anchorCandidates.find(
        (timezone) =>
          getZoneCodes(timezone, now).has(anchorLabel) &&
          getZoneOffsets(timezone, now).has(resolvedOffset),
      )
    : undefined;
  // Nothing on offer uses the code, so there is no live reading to borrow and the
  // literal offset is the honest fallback.
  const anchorOffset = anchorTimezone
    ? getClockDateTime(now, anchorTimezone).offset
    : resolvedOffset;

  return timezones.map((timezone) => getClockDateTime(now, timezone).offset - anchorOffset);
}

export function formatRelativeTimezoneCode(label: string, deltaMinutes: number): string {
  const match = label.match(/^([A-Za-z]+)(?:([+-])(\d{1,2})(?::?(\d{2}))?)?$/);
  const existingOffset = match?.[2]
    ? (match[2] === "-" ? -1 : 1) * (Number(match[3]) * 60 + Number(match[4] ?? "0"))
    : 0;
  const combinedDeltaMinutes = existingOffset + deltaMinutes;
  const baseName = match?.[1] ?? label;

  if (combinedDeltaMinutes === 0) {
    return baseName;
  }

  const absoluteMinutes = Math.abs(combinedDeltaMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  return `${baseName}${combinedDeltaMinutes > 0 ? "+" : "-"}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

export function getTimezoneCode(dateTime: DateTime) {
  const offsetNameShort = dateTime.offsetNameShort ?? dateTime.toFormat("ZZZZ");
  if (!/^(GMT|UTC)[+-]/.test(offsetNameShort)) {
    return offsetNameShort;
  }

  const offsetNameLong = dateTime.offsetNameLong ?? dateTime.toFormat("ZZZZ");
  return TIMEZONE_LONG_NAME_CODES[offsetNameLong] ?? offsetNameShort;
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

export function clockMatchesSearch(
  clock: Clock,
  now: Date,
  query: string,
  resolvedTimezoneQuery: { offset: number; label: string; focusMinutes: number } | null,
) {
  const dateTime = getClockDateTime(now, clock.timezone);
  const haystack = [
    clock.locationName,
    clock.secondaryName,
    clock.timezone,
    getTimezoneCode(dateTime),
    dateTime.offsetNameLong,
    getClockPrimaryName(clock, dateTime),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // A deliberate code lookup must not be widened by an accidental substring match.
  const textMatches = resolvedTimezoneQuery === null
    ? haystack.includes(query)
    : new RegExp(`(?:^|[^a-z0-9])${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(haystack);

  if (textMatches) {
    return true;
  }

  return resolvedTimezoneQuery !== null &&
    getZoneOffsets(clock.timezone, now).has(resolvedTimezoneQuery.offset + resolvedTimezoneQuery.focusMinutes);
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
