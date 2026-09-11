import { DateTime } from "luxon";
import type { ClockNameMode } from "../types";
import { getOffsetCode, getTimezoneLabel } from "../data/timezones";

type NameModeGroupProps = {
  value: ClockNameMode;
  onChange: (value: ClockNameMode) => void;
  previewTimezone?: string;
  roomy?: boolean;
};

const nameModes = ["location", "location-code", "code"] as const;

export function NameModeGroup({ value, onChange, previewTimezone, roomy = false }: NameModeGroupProps) {
  const hasTimezone = Boolean(previewTimezone);
  const locationPreview = previewTimezone ? getTimezoneLabel(previewTimezone) : "Location";
  const codePreview = previewTimezone ? getOffsetCode(DateTime.local().setZone(previewTimezone)) : "Code";
  const labels: Record<ClockNameMode, string> = {
    location: locationPreview,
    "location-code": hasTimezone ? `${locationPreview} ${codePreview}` : "Location + Code",
    code: codePreview,
  };
  return (
    <div className={`name-mode-group${roomy ? " name-mode-group--roomy" : ""}`} role="radiogroup" aria-label="Name style">
      {nameModes.map((nameMode) => {
        const selected = value === nameMode;

        return (
          <button
            key={nameMode}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`name-mode-option${selected ? " name-mode-option--active" : ""}`}
            onClick={() => onChange(nameMode)}
          >
            <span>{labels[nameMode]}</span>
          </button>
        );
      })}
    </div>
  );
}
