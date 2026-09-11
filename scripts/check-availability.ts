import assert from "node:assert/strict";
import { DateTime } from "luxon";
import { getAvailabilityArcs, getAvailabilityDurationMinutes } from "../src/lib/time.ts";

const dateTime = DateTime.fromISO("2026-03-15T10:00", { zone: "Asia/Tokyo" });
const cases = [
  {
    workHours: { start: "09:00", end: "17:00", basis: "clock" as const, enabled: true },
    expected: [{ startAngle: 270, sizeAngle: 240, variant: "active" }],
  },
  {
    workHours: { start: "05:00", end: "13:00", basis: "clock" as const, enabled: true },
    expected: [
      { startAngle: 150, sizeAngle: 30, variant: "outline" },
      { startAngle: 180, sizeAngle: 210, variant: "active" },
    ],
  },
  {
    workHours: { start: "22:00", end: "06:00", basis: "clock" as const, enabled: true },
    expected: [{ startAngle: 300, sizeAngle: 240, variant: "outline" }],
  },
] as const;

for (const { workHours, expected } of cases) {
  const arcs = getAvailabilityArcs(dateTime, dateTime, workHours);
  assert.deepEqual(arcs, expected);
  assert.equal(
    arcs.reduce((total, arc) => total + arc.sizeAngle, 0),
    getAvailabilityDurationMinutes(workHours) * 0.5,
  );
}

const tooLong = { start: "00:00", end: "23:00", basis: "clock" as const, enabled: true };
assert.deepEqual(getAvailabilityArcs(dateTime, dateTime, tooLong), []);
