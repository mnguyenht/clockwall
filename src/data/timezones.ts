import { DateTime } from "luxon";
import { countryNames, zoneCountries } from "./zoneCountries.generated";

export type TimezoneOption = {
  timezone: string;
  label: string;
  countries: string[];
  countryLabel: string;
  keywords: string;
  isOffset: boolean;
  popular: boolean;
};

const popularZones = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Stockholm",
  "Europe/Warsaw",
  "Europe/Istanbul",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Asia/Tokyo",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

const popularZoneSet = new Set<string>(popularZones);
const popularOrder = new Map<string, number>(popularZones.map((timezone, index) => [timezone, index]));

const labelOverrides: Record<string, string> = {
  "America/Los_Angeles": "Los Angeles",
  "America/New_York": "New York",
  "America/Sao_Paulo": "Sao Paulo",
  "America/Mexico_City": "Mexico City",
  "Asia/Kolkata": "Mumbai",
  "Asia/Ho_Chi_Minh": "Ho Chi Minh City",
  "Pacific/Auckland": "Auckland",
  "Asia/Hong_Kong": "Hong Kong",
};

const legacyKeywords: Record<string, string> = {
  "America/Los_Angeles": "pacific california pst pdt",
  "America/Denver": "mountain mst mdt",
  "America/Chicago": "central cst cdt",
  "America/New_York": "eastern est edt",
  "America/Toronto": "canada eastern",
  "America/Mexico_City": "mexico central",
  "America/Sao_Paulo": "brazil",
  UTC: "gmt zulu universal",
  "Europe/London": "uk gmt bst",
  "Europe/Paris": "france cet cest",
  "Europe/Berlin": "germany cet cest",
  "Europe/Madrid": "spain cet cest",
  "Europe/Rome": "italy cet cest",
  "Europe/Amsterdam": "netherlands cet cest",
  "Europe/Stockholm": "sweden cet cest",
  "Europe/Warsaw": "poland cet cest",
  "Europe/Istanbul": "turkey trt eet eest",
  "Africa/Cairo": "egypt eet eest",
  "Africa/Johannesburg": "south africa",
  "Asia/Dubai": "uae gulf",
  "Asia/Kolkata": "india delhi ist",
  "Asia/Bangkok": "thailand",
  "Asia/Ho_Chi_Minh": "vietnam hanoi",
  "Asia/Singapore": "sgt",
  "Asia/Hong_Kong": "hkt",
  "Asia/Shanghai": "china beijing cst",
  "Asia/Seoul": "korea kst",
  "Asia/Tokyo": "japan jst",
  "Australia/Perth": "western australia",
  "Australia/Sydney": "australia aest aedt",
  "Pacific/Auckland": "new zealand nzdt nzst",
};

const countryAliases: Record<string, string[]> = {
  US: ["usa", "us", "united states", "america"],
  GB: ["uk", "britain", "great britain", "england", "scotland", "wales"],
  AE: ["uae", "emirates"],
  KR: ["south korea"],
  KP: ["north korea"],
  NL: ["holland"],
  CZ: ["czech republic", "czechia"],
  TR: ["turkey", "turkiye"],
  MM: ["burma"],
  CI: ["ivory coast", "cote divoire"],
  RU: ["russia"],
  VA: ["vatican", "holy see"],
  MK: ["macedonia"],
  SZ: ["swaziland", "eswatini"],
  CD: ["drc", "zaire", "democratic republic of the congo"],
  CG: ["republic of the congo", "brazzaville"],
  IR: ["persia"],
  CV: ["cape verde", "cabo verde"],
  TL: ["east timor"],
  LA: ["laos"],
};

const fixedOffsets = [
  "-12",
  "-11",
  "-10",
  "-9:30",
  "-9",
  "-8",
  "-7",
  "-6",
  "-5",
  "-4",
  "-3:30",
  "-3",
  "-2",
  "-1",
  "0",
  "+1",
  "+2",
  "+3",
  "+3:30",
  "+4",
  "+4:30",
  "+5",
  "+5:30",
  "+5:45",
  "+6",
  "+6:30",
  "+7",
  "+8",
  "+8:45",
  "+9",
  "+9:30",
  "+10",
  "+10:30",
  "+11",
  "+12",
  "+12:45",
  "+13",
  "+14",
] as const;

function getOffsetKeywords(offset: string) {
  if (offset === "0") {
    return "gmt utc zulu z gmt+0 gmt-0 utc+0";
  }

  const sign = offset[0];
  const [hour, minute = "00"] = offset.slice(1).split(":");
  const compact = `${sign}${Number(hour)}${minute === "00" ? "" : `:${minute}`}`;
  const paddedHour = `${sign}${hour.padStart(2, "0")}`;
  const full = `${paddedHour}:${minute}`;
  const numeric = `${paddedHour}${minute}`;
  return [
    `gmt${compact}`,
    `gmt${paddedHour}`,
    `gmt${full}`,
    `gmt${numeric}`,
    `utc${compact}`,
    `utc${paddedHour}`,
    `utc${full}`,
    compact,
    paddedHour,
    full,
  ].join(" ");
}

const ianaOptions: TimezoneOption[] = zoneCountries.map(([timezone, countryCodes, aliases]) => {
  const countries = countryCodes ? countryCodes.split(" ") : [];
  const countryList = countries.map((code) => countryNames[code]).filter((name): name is string => Boolean(name));
  const label = labelOverrides[timezone] ?? timezone.split("/").pop()?.replaceAll("_", " ") ?? timezone;
  const countryLabel = countryList.length
    ? `${countryList[0]}${countryList.length > 1 ? ` +${countryList.length - 1}` : ""}`
    : "";
  const zoneWords = timezone.replaceAll("/", " ").replaceAll("_", " ");
  const aliasWords = countries.flatMap((code) => countryAliases[code] ?? []);

  return {
    timezone,
    label,
    countries,
    countryLabel,
    keywords: [label, zoneWords, ...countryList, aliases, ...aliasWords, legacyKeywords[timezone] ?? ""]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    isOffset: false,
    popular: popularZoneSet.has(timezone),
  };
});

const offsetOptions: TimezoneOption[] = fixedOffsets.map((offset) => ({
  timezone: offset === "0" ? "UTC" : `UTC${offset}`,
  label: offset === "0" ? "UTC" : `GMT${offset}`,
  countries: [],
  countryLabel: "",
  keywords: getOffsetKeywords(offset),
  isOffset: true,
  popular: popularZoneSet.has(offset === "0" ? "UTC" : `UTC${offset}`),
}));

export const timezoneOptions: TimezoneOption[] = [...ianaOptions, ...offsetOptions];

const optionByTimezone = new Map(timezoneOptions.map((option) => [option.timezone, option]));
const labelByOption = new Map(timezoneOptions.map((option) => [option, option.label.toLowerCase()]));
const keywordTokensByOption = new Map(
  timezoneOptions.map((option) => [option, new Set(option.keywords.split(/\s+/))]),
);
const compactKeywordsByOption = new Map(
  timezoneOptions.map((option) => [option, option.keywords.replace(/[^a-z0-9+:-]/g, "")]),
);
const countryNamesByOption = new Map(
  timezoneOptions.map((option) => [
    option,
    option.countries.flatMap((code, index) => {
      const names = [countryNames[code], ...(countryAliases[code] ?? [])]
        .filter((name): name is string => Boolean(name))
        .map((name) => name.toLowerCase());
      return names.map((name) => ({ name, primary: index === 0 }));
    }),
  ]),
);
const validTimezoneIds = new Set(
  timezoneOptions
    .filter((option) => {
      try {
        return DateTime.now().setZone(option.timezone).isValid;
      } catch {
        return false;
      }
    })
    .map((option) => option.timezone),
);

export function getTimezoneLabel(timezone: string) {
  return optionByTimezone.get(timezone)?.label ?? timezone.split("/").pop()?.replaceAll("_", " ") ?? timezone;
}

export function isSupportedTimezone(timezone: string) {
  try {
    return DateTime.now().setZone(timezone).isValid;
  } catch {
    return false;
  }
}

export function getOffsetCode(dateTime: DateTime) {
  const offsetMinutes = dateTime.offset;
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  return `GMT${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

type TimeQuery = {
  hour: number;
  minute?: number;
};

function parseTimeQuery(query: string): TimeQuery | null {
  const match = query.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = match[2] === undefined ? undefined : Number(match[2]);
  const meridiem = match[3];
  if (minute !== undefined && minute > 59) {
    return null;
  }

  if (meridiem) {
    if (hour < 1 || hour > 12) {
      return null;
    }
    hour = hour % 12 + (meridiem === "pm" ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }

  return { hour, minute };
}

export function searchTimezones(query: string, now: DateTime, limit = 12) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return timezoneOptions
      .filter((option) => option.popular)
      .sort(
        (left, right) =>
          (popularOrder.get(left.timezone) ?? Number.MAX_SAFE_INTEGER) -
          (popularOrder.get(right.timezone) ?? Number.MAX_SAFE_INTEGER),
      )
      .slice(0, limit);
  }

  const qCompact = q.replace(/[^a-z0-9+:-]/g, "");
  const timeQuery = parseTimeQuery(q);
  const matches: Array<{ option: TimezoneOption; rank: number }> = [];

  for (const option of timezoneOptions) {
    if (!validTimezoneIds.has(option.timezone)) {
      continue;
    }

    const label = labelByOption.get(option) ?? "";
    const optionCountryNames = countryNamesByOption.get(option) ?? [];
    let rank: number | null = null;

    if (label === q) {
      rank = 0;
    } else if (option.isOffset && keywordTokensByOption.get(option)?.has(qCompact)) {
      rank = 1;
    } else if (label.startsWith(q)) {
      rank = 2;
    } else if (optionCountryNames.some(({ name, primary }) => primary && name.startsWith(q))) {
      rank = 3;
    } else if (optionCountryNames.some(({ name, primary }) => !primary && name.startsWith(q))) {
      rank = 3.5;
    } else if (timeQuery && !option.isOffset) {
      try {
        const zoned = now.setZone(option.timezone);
        if (
          zoned.isValid &&
          zoned.hour === timeQuery.hour &&
          (timeQuery.minute === undefined || zoned.minute === timeQuery.minute)
        ) {
          rank = 4;
        }
      } catch {
        continue;
      }
    }

    if (rank === null && keywordTokensByOption.get(option)?.has(q)) {
      rank = 5;
    }
    if (
      rank === null &&
      (option.keywords.includes(q) ||
        (Boolean(qCompact) && compactKeywordsByOption.get(option)?.includes(qCompact)))
    ) {
      rank = 6;
    }
    if (rank !== null) {
      matches.push({ option, rank });
    }
  }

  const rankedMatches = timeQuery && matches.some(({ rank }) => rank === 4)
    ? matches.filter(({ rank }) => rank <= 4)
    : matches;

  return rankedMatches
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        Number(right.option.popular) - Number(left.option.popular) ||
        left.option.label.localeCompare(right.option.label),
    )
    .slice(0, limit)
    .map(({ option }) => option);
}
