import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

type TimeRangeFieldProps = {
  startLabel?: string;
  endLabel?: string;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  idPrefix: string;
};

type RangeEnd = "start" | "end";
type TimePart = "hour" | "minute";

function timeToMinutes(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function minutesToTime(minutes: number) {
  const dayMinutes = 24 * 60;
  const totalMinutes = ((minutes % dayMinutes) + dayMinutes) % dayMinutes;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function clampTimePart(value: string, max: number) {
  const numericValue = value.replace(/\D/g, "");
  if (value === "") {
    return "00";
  }

  return String(Math.max(0, Math.min(max, Number(numericValue || 0)))).padStart(2, "0");
}

export function TimeRangeField({
  startLabel = "Start",
  endLabel = "End",
  start,
  end,
  onChange,
  idPrefix,
}: TimeRangeFieldProps) {
  const [startHour = "09", startMinute = "00"] = start.split(":");
  const [endHour = "17", endMinute = "00"] = end.split(":");
  const [drafts, setDrafts] = useState({ startHour, startMinute, endHour, endMinute });
  const [lastFocused, setLastFocused] = useState<RangeEnd>("start");

  useEffect(() => {
    setDrafts({ startHour, startMinute, endHour, endMinute });
  }, [startHour, startMinute, endHour, endMinute]);

  function shift(deltaMinutes: number) {
    const hourKey = `${lastFocused}Hour` as const;
    const minuteKey = `${lastFocused}Minute` as const;
    const activeValue = `${clampTimePart(drafts[hourKey], 23)}:${clampTimePart(drafts[minuteKey], 59)}`;
    const shiftedValue = minutesToTime(timeToMinutes(activeValue) + deltaMinutes);

    if (lastFocused === "end") {
      onChange(start, shiftedValue);
      return;
    }

    onChange(shiftedValue, end);
  }

  function updateDraft(rangeEnd: RangeEnd, part: TimePart, nextValue: string) {
    const cleanValue = nextValue.replace(/\D/g, "").slice(0, 2);
    setDrafts((current) => ({
      ...current,
      [`${rangeEnd}${part === "hour" ? "Hour" : "Minute"}`]: cleanValue,
    }));
  }

  function commitPart(rangeEnd: RangeEnd, part: TimePart) {
    const hourKey = `${rangeEnd}Hour` as const;
    const minuteKey = `${rangeEnd}Minute` as const;
    const hour = clampTimePart(part === "hour" ? drafts[hourKey] : rangeEnd === "start" ? startHour : endHour, 23);
    const minute = clampTimePart(
      part === "minute" ? drafts[minuteKey] : rangeEnd === "start" ? startMinute : endMinute,
      59,
    );
    const nextValue = `${hour}:${minute}`;

    if (rangeEnd === "start") {
      onChange(nextValue, end);
      return;
    }

    onChange(start, nextValue);
  }

  function renderTime(rangeEnd: RangeEnd, label: string) {
    const hourKey = `${rangeEnd}Hour` as const;
    const minuteKey = `${rangeEnd}Minute` as const;

    return (
      <div className="time-range-field__time">
        <span className="time-range-field__label">{label}</span>
        <div className="time-range-field__digits">
          <input
            id={`${idPrefix}-${rangeEnd}-hour`}
            className="time-range-field__input"
            inputMode="numeric"
            aria-label={`${label} hour`}
            value={drafts[hourKey]}
            onChange={(event) => updateDraft(rangeEnd, "hour", event.target.value)}
            onFocus={() => setLastFocused(rangeEnd)}
            onBlur={() => commitPart(rangeEnd, "hour")}
            maxLength={2}
            name={`${idPrefix}-${rangeEnd}-hour`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <span>:</span>
          <input
            id={`${idPrefix}-${rangeEnd}-minute`}
            className="time-range-field__input"
            inputMode="numeric"
            aria-label={`${label} minute`}
            value={drafts[minuteKey]}
            onChange={(event) => updateDraft(rangeEnd, "minute", event.target.value)}
            onFocus={() => setLastFocused(rangeEnd)}
            onBlur={() => commitPart(rangeEnd, "minute")}
            maxLength={2}
            name={`${idPrefix}-${rangeEnd}-minute`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
      </div>
    );
  }

  const activeLabel = lastFocused === "start" ? startLabel : endLabel;

  return (
    <div className="time-range-field">
      {renderTime("start", startLabel)}
      <span className="time-range-field__separator" aria-hidden="true">–</span>
      {renderTime("end", endLabel)}
      <div className="time-range-field__actions">
        <button
          type="button"
          className="time-range-field__button"
          onClick={() => shift(-5)}
          aria-label={`Move ${activeLabel} earlier`}
          title={`Move ${activeLabel} earlier`}
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          className="time-range-field__button"
          onClick={() => shift(5)}
          aria-label={`Move ${activeLabel} later`}
          title={`Move ${activeLabel} later`}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
