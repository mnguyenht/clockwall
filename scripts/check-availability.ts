import assert from "node:assert/strict";
import { DateTime } from "luxon";
import { getAvailabilityArcs, getAvailabilityDurationMinutes } from "../src/lib/time.ts";

import { findAvailabilityOverlaps } from '../src/lib/time.ts';
import type { Clock } from '../src/types.ts';

const dateTime = DateTime.fromISO("2026-03-15T10:00", { zone: "Asia/Tokyo" });
const defaultAwakeHours = { start: "06:00", end: "22:00" };
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
  const arcs = getAvailabilityArcs(dateTime, dateTime, workHours, defaultAwakeHours);
  assert.deepEqual(arcs, expected);
  assert.equal(
    arcs.reduce((total, arc) => total + arc.sizeAngle, 0),
    getAvailabilityDurationMinutes(workHours) * 0.5,
  );
}

const tooLong = { start: "00:00", end: "23:00", basis: "clock" as const, enabled: true };
assert.deepEqual(getAvailabilityArcs(dateTime, dateTime, tooLong, defaultAwakeHours), []);

const configurableAwakeHours = { start: "05:00", end: "23:00" };
assert.deepEqual(
  getAvailabilityArcs(dateTime, dateTime, cases[1].workHours, configurableAwakeHours),
  [{ startAngle: 150, sizeAngle: 240, variant: "active" }],
);

const overlapNow = DateTime.fromISO('2026-03-15T00:00', { zone: 'UTC' }).toJSDate();
const overlapClock = (id: string, start: string, end: string): Clock => ({
  id,
  timezone: 'UTC',
  locationName: id,
  nameMode: 'location',
  workHours: { enabled: true, start, end, basis: 'clock' },
});
assert.deepEqual(findAvailabilityOverlaps([overlapClock('one', '09:00', '17:00')], overlapNow, 'UTC'), []);

const identicalOverlaps = findAvailabilityOverlaps(
  [overlapClock('one', '09:00', '17:00'), overlapClock('two', '09:00', '17:00')],
  overlapNow,
  'UTC',
);
assert.deepEqual(identicalOverlaps, [{ startMinutes: 540, endMinutes: 1020 }]);
assert.deepEqual(
  findAvailabilityOverlaps(
    [overlapClock('one', '09:00', '12:00'), overlapClock('two', '15:00', '17:00')],
    overlapNow,
    'UTC',
  ),
  [],
);
