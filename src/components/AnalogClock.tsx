import { DateTime } from "luxon";

import { useRef } from 'react';

const minorHourMarks = [1, 2, 4, 5, 7, 8, 10, 11];

type AnalogClockProps = {
  dateTime: DateTime;
  displaySeconds: boolean;
  period: "AM" | "PM";
  availabilityArcs?: Array<{
    startAngle: number;
    sizeAngle: number;
    variant: "active" | "outline";
  }>;
};

const AVAILABILITY_CENTER = 77;
const AVAILABILITY_RADIUS = 62;

function point(angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [
    AVAILABILITY_CENTER + Math.cos(radians) * AVAILABILITY_RADIUS,
    AVAILABILITY_CENTER + Math.sin(radians) * AVAILABILITY_RADIUS,
  ] as const;
}

function availabilityArcPath(startAngle: number, sizeAngle: number) {
  const [startX, startY] = point(startAngle);
  const [endX, endY] = point(startAngle + sizeAngle);
  const largeArc = sizeAngle > 180 ? 1 : 0;
  return `M ${startX} ${startY} A ${AVAILABILITY_RADIUS} ${AVAILABILITY_RADIUS} 0 ${largeArc} 1 ${endX} ${endY}`;
}

function useContinuousAngle(target: number) {
  const last = useRef(target);
  const lastAngle = ((last.current % 360) + 360) % 360;
  const delta = ((target - lastAngle + 540) % 360) - 180;
  // Writing a ref during render, on purpose: the hands must wind forward through
  // 359 -> 360 instead of snapping back to 0. Safe under replayed or discarded
  // renders because it is idempotent -- re-running with the same target computes
  // a delta of 0, so a double render cannot advance the hand twice.
  last.current += delta;
  return last.current;
}

export function AnalogClock({
  dateTime, displaySeconds, period, availabilityArcs = [],
}: AnalogClockProps) {
  const hour = dateTime.hour % 12;
  const minute = dateTime.minute;
  const second = dateTime.second;
  const hourRotation = useContinuousAngle(hour * 30 + minute * 0.5);
  const minuteRotation = useContinuousAngle(minute * 6 + second * 0.1);
  const secondRotation = second * 6;
  return (
    <div className={`analog-clock analog-clock--${period.toLowerCase()}`} aria-hidden='true'>
      {availabilityArcs.length > 0 ? (
        <svg className="analog-clock__availability" viewBox="0 0 154 154">
          {availabilityArcs.map((arc, index) => {
            const band = arc.variant === "active" ? 9 : 2.5;
            const capAngle = (band / 2 / AVAILABILITY_RADIUS) * (180 / Math.PI);
            const firstArc = index === 0;
            const lastArc = index === availabilityArcs.length - 1;
            const startAngle = arc.startAngle + (firstArc ? capAngle : 0);
            const sizeAngle = Math.max(
              0,
              arc.sizeAngle - (firstArc ? capAngle : 0) - (lastArc ? capAngle : 0),
            );
            const className = `analog-clock__availability-sector analog-clock__availability-sector--${arc.variant}`;
            const key = `${arc.startAngle}-${arc.sizeAngle}-${index}`;

            if (arc.sizeAngle >= 359.9) {
              return (
                <circle
                  className={`${className} analog-clock__availability-full`}
                  cx={AVAILABILITY_CENTER}
                  cy={AVAILABILITY_CENTER}
                  r={AVAILABILITY_RADIUS}
                  key={key}
                />
              );
            }

            return (
              <path
                className={className}
                d={availabilityArcPath(startAngle, sizeAngle)}
                key={key}
              />
            );
          })}
        </svg>
      ) : null}
      <span className="analog-clock__mark analog-clock__mark--12" />
      <span className="analog-clock__mark analog-clock__mark--3" />
      <span className="analog-clock__mark analog-clock__mark--6" />
      <span className="analog-clock__mark analog-clock__mark--9" />
      {minorHourMarks.map((mark) => (
        <span
          className="analog-clock__mark analog-clock__mark--minor"
          key={mark}
          style={{ transform: `translate(-50%, -50%) rotate(${mark * 30}deg) translateY(-56px)` }}
        />
      ))}
      <span
        className="analog-clock__hand analog-clock__hand--hour"
        style={{ transform: `translateX(-50%) rotate(${hourRotation}deg)` }}
      />
      <span
        className="analog-clock__hand analog-clock__hand--minute"
        style={{ transform: `translateX(-50%) rotate(${minuteRotation}deg)` }}
      />
      {displaySeconds ? (
        <span
          className="analog-clock__hand analog-clock__hand--second"
          style={{ transform: `translateX(-50%) rotate(${secondRotation}deg)` }}
        />
      ) : null}
      <span className="analog-clock__pin" />
    </div>
  );
}
