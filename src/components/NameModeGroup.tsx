import { m, useReducedMotion } from "framer-motion";
import { DateTime } from "luxon";
import type { ClockNameMode } from "../types";
import { getOffsetCode, getTimezoneLabel } from "../data/timezones";

type NameModeGroupProps = {
  value: ClockNameMode;
  onChange: (value: ClockNameMode) => void;
  previewTimezone?: string;
};

const nameModes = ["location", "location-code", "code"] as const;

export function NameModeGroup({ value, onChange, previewTimezone }: NameModeGroupProps) {
  const shouldReduceMotion = useReducedMotion();
  const activeIndex = nameModes.indexOf(value);
  const hasTimezone = Boolean(previewTimezone);
  const locationPreview = previewTimezone ? getTimezoneLabel(previewTimezone) : "Location";
  const codePreview = previewTimezone ? getOffsetCode(DateTime.local().setZone(previewTimezone)) : "Code";
  const labels: Record<ClockNameMode, string> = {
    location: locationPreview,
    "location-code": hasTimezone ? `${locationPreview} ${codePreview}` : "Location + code",
    code: codePreview,
  };
  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 30 };

  return (
    <div className="name-mode-group" role="radiogroup" aria-label="Name style">
      <m.span
        className="name-mode-group__pill"
        animate={{ x: `calc(${activeIndex * 100}% + ${activeIndex * 6}px)` }}
        transition={
          shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }
        }
        aria-hidden="true"
      />
      {nameModes.map((nameMode) => {
        const selected = value === nameMode;

        return (
          <m.button
            key={nameMode}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`name-mode-option${selected ? " name-mode-option--active" : ""}`}
            onClick={() => onChange(nameMode)}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
            transition={transition}
          >
            <span>{labels[nameMode]}</span>
          </m.button>
        );
      })}
    </div>
  );
}
