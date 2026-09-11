import { m, useReducedMotion } from "framer-motion";
import { DateTime } from "luxon";
import type { ClockNameMode } from "../types";
import { getOffsetCode, getTimezoneLabel } from "../data/timezones";

type NameModeGroupProps = {
  value: ClockNameMode;
  onChange: (value: ClockNameMode) => void;
  previewTimezone?: string;
  layoutIdSuffix: string;
};

export function NameModeGroup({ value, onChange, previewTimezone, layoutIdSuffix }: NameModeGroupProps) {
  const shouldReduceMotion = useReducedMotion();
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
      {(["location", "location-code", "code"] as const).map((nameMode) => {
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
            {selected ? (
              <m.span
                className="name-mode-option__pill"
                layoutId={`name-mode-pill-${layoutIdSuffix}`}
                transition={transition}
              />
            ) : null}
            <span>{labels[nameMode]}</span>
          </m.button>
        );
      })}
    </div>
  );
}
