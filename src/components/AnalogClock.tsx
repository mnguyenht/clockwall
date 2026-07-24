import { DateTime } from "luxon";

const minorHourMarks = [1, 2, 4, 5, 7, 8, 10, 11];

type AnalogClockProps = {
  dateTime: DateTime;
  displaySeconds: boolean;
  period: "AM" | "PM";
  availabilityArcs?: Array<{
    startAngle: number;
    sizeAngle: number;
    variant: "active" | "outline" | "full";
  }>;
};

export function AnalogClock({ dateTime, displaySeconds, period, availabilityArcs = [] }: AnalogClockProps) {
  const hour = dateTime.hour % 12;
  const minute = dateTime.minute;
  const second = dateTime.second;
  const hourRotation = hour * 30 + minute * 0.5;
  const minuteRotation = minute * 6 + second * 0.1;
  const secondRotation = second * 6;
  const availabilityRadius = 62;
  const availabilityBandWidth = 9;
  const availabilityCapAngle = (availabilityBandWidth / 2 / availabilityRadius) * (180 / Math.PI);

  function pointOnAvailabilityBand(angle: number, radius: number) {
    const radians = ((angle - 90) * Math.PI) / 180;
    return {
      x: 77 + Math.cos(radians) * radius,
      y: 77 + Math.sin(radians) * radius,
    };
  }

  return (
    <div className={`analog-clock analog-clock--${period.toLowerCase()}`} aria-hidden="true">
      {availabilityArcs.length > 0 ? (
        <svg className="analog-clock__availability" viewBox="0 0 154 154">
          {availabilityArcs.map((arc, index) => {
            const adjustedStartAngle = arc.startAngle + availabilityCapAngle;
            const adjustedSizeAngle = Math.max(0, arc.sizeAngle - availabilityCapAngle * 2);
            const availabilityLength = Math.min(100, Math.max(0, adjustedSizeAngle / 3.6));
            const outerRadius = availabilityRadius + availabilityBandWidth / 2;
            const innerRadius = availabilityRadius - availabilityBandWidth / 2;
            const startOuter = pointOnAvailabilityBand(arc.startAngle, outerRadius);
            const startInner = pointOnAvailabilityBand(arc.startAngle, innerRadius);
            const endOuter = pointOnAvailabilityBand(arc.startAngle + arc.sizeAngle, outerRadius);
            const endInner = pointOnAvailabilityBand(arc.startAngle + arc.sizeAngle, innerRadius);

            if (arc.variant === "full") {
              return (
                <circle
                  className="analog-clock__availability-full"
                  cx="77"
                  cy="77"
                  key={`full-${index}`}
                  r={outerRadius}
                />
              );
            }

            if (arc.variant === "outline") {
              return (
                <g
                  className="analog-clock__availability-outline"
                  key={`${arc.startAngle}-${arc.sizeAngle}-${index}`}
                >
                  <circle
                    cx="77"
                    cy="77"
                    r={outerRadius}
                    pathLength={100}
                    strokeDasharray={`${availabilityLength} ${100 - availabilityLength}`}
                    transform={`rotate(${arc.startAngle - 90} 77 77)`}
                  />
                  <circle
                    cx="77"
                    cy="77"
                    r={innerRadius}
                    pathLength={100}
                    strokeDasharray={`${availabilityLength} ${100 - availabilityLength}`}
                    transform={`rotate(${arc.startAngle - 90} 77 77)`}
                  />
                  <line x1={startInner.x} y1={startInner.y} x2={startOuter.x} y2={startOuter.y} />
                  <line x1={endInner.x} y1={endInner.y} x2={endOuter.x} y2={endOuter.y} />
                </g>
              );
            }

            return (
              <circle
                className={`analog-clock__availability-segment analog-clock__availability-segment--${arc.variant}`}
                cx="77"
                cy="77"
                key={`${arc.startAngle}-${arc.sizeAngle}-${index}`}
                r={availabilityRadius}
                pathLength={100}
                strokeDasharray={`${availabilityLength} ${100 - availabilityLength}`}
                transform={`rotate(${adjustedStartAngle - 90} 77 77)`}
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
