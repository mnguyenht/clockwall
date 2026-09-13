import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.(?:[cm]?[jt]sx?|json|node)$/i.test(specifier)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  clockMatchesSearch,
  formatRelativeTimezoneCode,
  getClockPrimaryName,
  getRelativeTimezoneDeltas,
  getTimezoneCode,
  resolveTimezoneQuery,
} = await import("../src/lib/time.ts");
const { anchorTimezoneIds, searchTimezones } = await import("../src/data/timezones.ts");
const { DateTime } = await import("luxon");

const now = new Date("2026-09-12T12:00:00Z");

function makeClock(timezone) {
  return {
    id: timezone,
    timezone,
    locationName: timezone.split("/").at(-1).replaceAll("_", " "),
    secondaryName: "",
    nameMode: "location",
  };
}

for (const timezone of [
  "Europe/Paris",
  "Europe/Lisbon",
  "Europe/Athens",
  "Australia/Sydney",
  "Europe/Budapest",
  "Europe/Bucharest",
  "Africa/Lagos",
  "Europe/Berlin",
  "Europe/Madrid",
  "Australia/Brisbane",
]) {
  assert.equal(clockMatchesSearch(makeClock(timezone), now, "est", resolveTimezoneQuery("est", now)), false, `${timezone} matched est`);
}

assert.equal(clockMatchesSearch(makeClock("America/New_York"), now, "est", resolveTimezoneQuery("est", now)), true);
assert.equal(clockMatchesSearch(makeClock("Europe/Istanbul"), now, "ist", resolveTimezoneQuery("ist", now)), true);
assert.equal(clockMatchesSearch(makeClock("Asia/Kolkata"), now, "ist", resolveTimezoneQuery("ist", now)), true);
assert.equal(clockMatchesSearch(makeClock("Europe/Paris"), now, "cet", resolveTimezoneQuery("cet", now)), true);
assert.equal(clockMatchesSearch(makeClock("Asia/Tokyo"), now, "tokyo", resolveTimezoneQuery("tokyo", now)), true);
assert.equal(clockMatchesSearch(makeClock("Europe/London"), now, "ondon", resolveTimezoneQuery("ondon", now)), true);
assert.equal(clockMatchesSearch(makeClock("Asia/Bangkok"), now, "utc+7", resolveTimezoneQuery("utc+7", now)), true);

assert.equal(formatRelativeTimezoneCode("EST", 0), "EST");
assert.equal(formatRelativeTimezoneCode("EST", 300), "EST+5");
assert.equal(formatRelativeTimezoneCode("EST", -180), "EST-3");
assert.equal(formatRelativeTimezoneCode("EST", 330), "EST+5:30");
assert.equal(formatRelativeTimezoneCode("EST+4", 60), "EST+5");
assert.equal(formatRelativeTimezoneCode("EST+4", -300), "EST-1");
assert.equal(formatRelativeTimezoneCode("EST+4", -240), "EST");
assert.equal(formatRelativeTimezoneCode("UTC+7", 60), "UTC+8");

assert.deepEqual(resolveTimezoneQuery("est", now), { offset: -300, label: "EST", focusMinutes: 0 });
assert.deepEqual(resolveTimezoneQuery("est+4", now), { offset: -300, label: "EST", focusMinutes: 240 });
assert.deepEqual(resolveTimezoneQuery("est-3", now), { offset: -300, label: "EST", focusMinutes: -180 });
assert.deepEqual(resolveTimezoneQuery("est+1:30", now), { offset: -300, label: "EST", focusMinutes: 90 });
assert.deepEqual(resolveTimezoneQuery("utc+7", now), { offset: 0, label: "UTC", focusMinutes: 420 });
assert.deepEqual(resolveTimezoneQuery("+7", now), { offset: 0, label: "UTC", focusMinutes: 420 });
assert.equal(resolveTimezoneQuery("tokyo", now), null);
assert.equal(resolveTimezoneQuery("est+99", now), null);

assert.deepEqual(resolveTimezoneQuery("pt", now), resolveTimezoneQuery("pdt", now));
assert.deepEqual(resolveTimezoneQuery("et", now), resolveTimezoneQuery("edt", now));
assert.deepEqual(resolveTimezoneQuery("ct", now), resolveTimezoneQuery("cdt", now));
assert.deepEqual(resolveTimezoneQuery("mt", now), resolveTimezoneQuery("mdt", now));
assert.deepEqual(resolveTimezoneQuery("pacific", now), resolveTimezoneQuery("pt", now));
assert.deepEqual(resolveTimezoneQuery("akt", now), resolveTimezoneQuery("akdt", now));
assert.deepEqual(resolveTimezoneQuery("hawaii", now), resolveTimezoneQuery("hst", now));
assert.deepEqual(resolveTimezoneQuery("pt"), resolveTimezoneQuery("pst"));

// Whitespace between the code and its offset is natural to type and must resolve.
assert.deepEqual(resolveTimezoneQuery("est +4", now), resolveTimezoneQuery("est+4", now));
assert.deepEqual(resolveTimezoneQuery(" est - 3 ", now), resolveTimezoneQuery("est-3", now));
assert.equal(resolveTimezoneQuery("new york", now), null);

const lensTimezones = ["Europe/London", "Asia/Bangkok", "Asia/Tokyo", "America/New_York"];
const est = resolveTimezoneQuery("est", now);
assert.ok(est);
assert.deepEqual(
  getRelativeTimezoneDeltas(lensTimezones, now, est.offset, undefined, est.label),
  [300, 660, 780, 0],
);

const searchNow = DateTime.fromJSDate(now);
function assertRelativeCodeRoundTrip(baseQuery, renderedCode) {
  const resolvedBaseQuery = resolveTimezoneQuery(baseQuery, now);
  assert.ok(resolvedBaseQuery);
  const baseResults = searchTimezones(baseQuery, searchNow, 12);
  const baseDeltas = getRelativeTimezoneDeltas(
    baseResults.map((option) => option.timezone),
    now,
    resolvedBaseQuery.offset,
    anchorTimezoneIds,
    resolvedBaseQuery.label,
  );
  const sourceIndex = baseDeltas.findIndex(
    (delta) => formatRelativeTimezoneCode(resolvedBaseQuery.label, delta) === renderedCode,
  );
  assert.notEqual(sourceIndex, -1, `${baseQuery} did not render ${renderedCode}`);

  const focusedResults = searchTimezones(renderedCode, searchNow, 12);
  assert.equal(focusedResults[0]?.timezone, baseResults[sourceIndex].timezone);
  const focusedQuery = resolveTimezoneQuery(renderedCode, now);
  assert.ok(focusedQuery);
  const focusedDeltas = getRelativeTimezoneDeltas(
    focusedResults.map((option) => option.timezone),
    now,
    focusedQuery.offset,
    anchorTimezoneIds,
    focusedQuery.label,
  );
  assert.equal(formatRelativeTimezoneCode(focusedQuery.label, focusedDeltas[0]), renderedCode);
}

assertRelativeCodeRoundTrip("est", "EST+4");
assertRelativeCodeRoundTrip("est", "EST-3");
assertRelativeCodeRoundTrip("est", "EST+1:30");
assertRelativeCodeRoundTrip("jst", "JST+2");
assertRelativeCodeRoundTrip("pt", "PDT+2");
assert.ok(searchTimezones("+7", searchNow, 12).length > 0);
assert.equal(searchTimezones("cst", searchNow, 3)[0]?.timezone, "America/Chicago");
assert.equal(searchTimezones("pt", searchNow, 3)[0]?.timezone, "America/Los_Angeles");

const estResults = searchTimezones("est", searchNow, 8);
assert.match(getTimezoneCode(searchNow.setZone(estResults[0].timezone)), /^E[DS]T$/);
for (const timezone of [
  "Europe/Tallinn",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Africa/Cairo",
  "Europe/Istanbul",
  "Europe/Madrid",
]) {
  assert.equal(estResults.some((option) => option.timezone === timezone), false, `${timezone} appeared in est results`);
}

assert.equal(searchTimezones("jst", searchNow, 8)[0]?.timezone, "Asia/Tokyo");
assert.equal(searchTimezones("tokyo", searchNow, 8)[0]?.timezone, "Asia/Tokyo");
assert.equal(searchTimezones("estonia", searchNow, 8)[0]?.timezone, "Europe/Tallinn");

const estDeltas = getRelativeTimezoneDeltas(
  estResults.map((option) => option.timezone),
  now,
  est.offset,
  anchorTimezoneIds,
  est.label,
);
for (let index = 1; index < estDeltas.length; index += 1) {
  assert.ok(Math.abs(estDeltas[index - 1]) <= Math.abs(estDeltas[index]));
}

const expandedEstResults = searchTimezones("est", searchNow, 12);
const expandedEstDeltas = getRelativeTimezoneDeltas(
  expandedEstResults.map((option) => option.timezone),
  now,
  est.offset,
  anchorTimezoneIds,
  est.label,
);
assert.equal(expandedEstDeltas.filter((delta) => delta === 0).length, 3);
assert.equal(new Set(expandedEstDeltas.filter((delta) => delta !== 0)).size, expandedEstDeltas.length - 3);
for (const timezone of [
  "Europe/Tallinn",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Africa/Cairo",
  "Europe/Istanbul",
  "Europe/Madrid",
]) {
  assert.equal(expandedEstResults.some((option) => option.timezone === timezone), false, `${timezone} appeared in expanded est results`);
}

const cet = resolveTimezoneQuery("cet", now);
assert.ok(cet);
const cetResults = searchTimezones("cet", searchNow, 12);
const cetDeltas = getRelativeTimezoneDeltas(
  cetResults.map((option) => option.timezone),
  now,
  cet.offset,
  anchorTimezoneIds,
  cet.label,
);
assert.ok(cetDeltas.some((delta) => delta !== 0));

const chicagoNow = DateTime.fromJSDate(now).setZone("America/Chicago");
const pinnedChicago = { ...makeClock("America/Chicago"), nameMode: "location-code", timezoneCode: "CST" };
assert.equal(getClockPrimaryName(pinnedChicago, chicagoNow), "Chicago CST");
assert.equal(getClockPrimaryName({ ...pinnedChicago, nameMode: "code" }, chicagoNow), "CST");
assert.equal(getClockPrimaryName(pinnedChicago, chicagoNow, "EST-1"), "Chicago EST-1");
assert.equal(getClockPrimaryName({ ...makeClock("America/Chicago"), nameMode: "location-code" }, chicagoNow), "Chicago CDT");

console.log("Search smoke checks passed.");
