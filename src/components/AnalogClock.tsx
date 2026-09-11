import { DateTime } from "luxon";

import { useRef } from 'react';

const minorHourMarks = [1, 2, 4, 5, 7, 8, 10, 11];

type AnalogClockProps = {
  dateTime: DateTime;
  displaySeconds: boolean;
  offsetMinutes: number;
  settling: boolean;
  period: "AM" | "PM";
  availabilityArcs?: Array<{
    startAngle: number;
    sizeAngle: number;
    variant: "active" | "outline";
  }>;
};

const AVAILABILITY_CENTER = 77;
const AVAILABILITY_RADIUS = 62;
// The filled sector is drawn with a 4-unit round-joined stroke of its own colour to
// round the corners, and the stroke straddles the path, so the path band is 4 units
// narrower than the 9 units the sector actually covers.
const AVAILABILITY_BAND = 5;

function ringSectorPath(startAngle: number, sizeAngle: number) {
  const inner = AVAILABILITY_RADIUS - AVAILABILITY_BAND / 2;
  const outer = AVAILABILITY_RADIUS + AVAILABILITY_BAND / 2;
  // One SVG arc command cannot express a whole turn, so stop a hair short of it.
  const size = Math.min(sizeAngle, 359.9);
  const endAngle = startAngle + size;
  const largeArc = size > 180 ? 1 : 0;
  const point = (angle: number, radius: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return [
      AVAILABILITY_CENTER + Math.cos(radians) * radius,
      AVAILABILITY_CENTER + Math.sin(radians) * radius,
    ] as const;
  };

  const [outerStartX, outerStartY] = point(startAngle, outer);
  const [outerEndX, outerEndY] = point(endAngle, outer);
  const [innerEndX, innerEndY] = point(endAngle, inner);
  const [innerStartX, innerStartY] = point(startAngle, inner);

  return [
    `M ${outerStartX} ${outerStartY}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}`,
    `L ${innerEndX} ${innerEndY}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${innerStartX} ${innerStartY}`,
    "Z",
  ].join(" ");
}

function useContinuousAngle(target: number) {
  const last = useRef(target);
  const lastAngle = ((last.current % 360) + 360) % 360;
  const delta = ((target - lastAngle + 540) % 360) - 180;
  last.current += delta;
  return last.current;
}

export function AnalogClock({
  dateTime, displaySeconds, period, offsetMinutes, settling, availabilityArcs = [],
}: AnalogClockProps) {
  const hour = dateTime.hour % 12;
  const minute = dateTime.minute;
  const second = dateTime.second;
  const hourRotation = useContinuousAngle(hour * 30 + minute * 0.5);
  const minuteRotation = useContinuousAngle(minute * 6 + second * 0.1);
  const secondRotation = second * 6;
  return (
    <div className={`analog-clock analog-clock--${period.toLowerCase()} ${settling ? 'analog-clock--settling' : ''}`} aria-hidden='true'>
      {availabilityArcs.length > 0 ? (
        <svg className="analog-clock__availability" viewBox="0 0 154 154">
          {availabilityArcs.map((arc, index) => (
            <path
              className={`analog-clock__availability-sector analog-clock__availability-sector--${arc.variant}`}
              d={ringSectorPath(arc.startAngle, arc.sizeAngle)}
              key={`${arc.startAngle}-${arc.sizeAngle}-${index}`}
            />
          ))}
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
      {displaySeconds && offsetMinutes === 0 ? (
        <span
          className="analog-clock__hand analog-clock__hand--second"
          style={{ transform: `translateX(-50%) rotate(${secondRotation}deg)` }}
        />
      ) : null}
      <span className="analog-clock__pin" />
    </div>
  );
}
