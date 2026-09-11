import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DateTime } from "luxon";

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
  getOffsetCode,
  isSupportedTimezone,
  searchTimezones,
  timezoneOptions,
} = await import("../src/data/timezones.ts");
const { countryNames, zoneCountries } = await import("../src/data/zoneCountries.generated.ts");
const now = DateTime.local();

assert.ok(zoneCountries.length >= 400 && zoneCountries.length <= 440);

for (const query of ["GMT-5", "gmt -5", "UTC-5", "-5", "-05:00"]) {
  const results = searchTimezones(query, now);
  assert.ok(results.length > 0);
  assert.ok(results.every((row) => now.setZone(row.timezone).offset === -300));
}
for (const query of ["GMT+0", "UTC+0"]) {
  const results = searchTimezones(query, now);
  assert.ok(results.length > 0);
  assert.ok(results.every((row) => now.setZone(row.timezone).offset === 0));
}
assert.ok(searchTimezones("GMT+9", now).some((row) => row.timezone === "Asia/Tokyo"));
assert.ok(!timezoneOptions.some((row) => /^UTC[+-]/.test(row.timezone)));
assert.ok(searchTimezones("Vietnam", now).some((row) => row.timezone === "Asia/Ho_Chi_Minh"));
assert.ok(searchTimezones("Norway", now).some((row) => row.timezone === "Europe/Oslo"));
assert.equal(searchTimezones("Norway", now)[0]?.timezone, "Europe/Oslo");
assert.equal(searchTimezones("Sweden", now)[0]?.timezone, "Europe/Stockholm");
assert.equal(searchTimezones("Netherlands", now)[0]?.timezone, "Europe/Amsterdam");
assert.equal(searchTimezones("Denmark", now)[0]?.timezone, "Europe/Copenhagen");
assert.ok(searchTimezones("Cameroon", now).some((row) => row.timezone === "Africa/Lagos"));
assert.ok(searchTimezones("Nepal", now).some((row) => row.timezone === "Asia/Kathmandu"));
assert.equal(searchTimezones("uk", now)[0]?.timezone, "Europe/London");
assert.equal(searchTimezones("britain", now)[0]?.timezone, "Europe/London");
assert.equal(searchTimezones("holland", now)[0]?.timezone, "Europe/Amsterdam");
assert.equal(searchTimezones("uae", now)[0]?.timezone, "Asia/Dubai");
assert.equal(searchTimezones("south korea", now)[0]?.timezone, "Asia/Seoul");
assert.ok(searchTimezones("Calcutta", now).some((row) => row.timezone === "Asia/Kolkata"));
assert.ok(!timezoneOptions.some((row) => row.timezone === "Asia/Rangoon"));
assert.ok(!timezoneOptions.some((row) => row.timezone === "America/Montreal"));
assert.ok(!timezoneOptions.some((row) => row.timezone === "Asia/Calcutta"));
assert.equal(searchTimezones("Rangoon", now)[0]?.timezone, "Asia/Yangon");
assert.equal(searchTimezones("Montreal", now)[0]?.timezone, "America/Toronto");
for (const timezone of [
  "Europe/Oslo",
  "Europe/Stockholm",
  "Europe/Copenhagen",
  "Europe/Amsterdam",
]) {
  assert.ok(timezoneOptions.some((row) => row.timezone === timezone), `${timezone} was not emitted`);
}
assert.equal(searchTimezones("London", now)[0]?.timezone, "Europe/London");

const at23 = searchTimezones("23", now);
const at11pm = searchTimezones("11 pm", now);
const at7am = searchTimezones("7am", now);
assert.ok(at23.length > 0);
assert.ok(at23.every((row) => now.setZone(row.timezone).hour === 23));
assert.deepEqual(
  new Set(at11pm.map((row) => row.timezone)),
  new Set(at23.map((row) => row.timezone)),
);
assert.ok(at7am.every((row) => now.setZone(row.timezone).hour === 7));
assert.equal(isSupportedTimezone("UTC+5"), true);
assert.equal(isSupportedTimezone("Nope/Nope"), false);
assert.equal(getOffsetCode(DateTime.now().setZone("UTC+5")), "GMT+5");
assert.equal(getOffsetCode(DateTime.now().setZone("Asia/Kathmandu")), "GMT+5:45");
assert.ok(searchTimezones("", now).some((row) => row.timezone === "UTC"));

const missingCountries = Object.entries(countryNames)
  .filter(([, name]) => searchTimezones(name, now).length === 0)
  .map(([code, name]) => `${code}: ${name}`);
assert.deepEqual(missingCountries, [], `Countries missing from search:\n${missingCountries.join("\n")}`);

console.log("Timezone smoke checks passed.");
