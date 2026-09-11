import { useEffect, useState } from "react";

type TimeRangeFieldProps = {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  idPrefix: string;
};

type RangeEnd = "start" | "end";
type TimePart = "hour" | "minute";

function clampTimePart(value: string, max: number) {
  const numericValue = value.replace(/\D/g, "");
  if (value === "") {
    return "00";
  }

  return String(Math.max(0, Math.min(max, Number(numericValue || 0)))).padStart(2, "0");
}

export function TimeRangeField({
  start,
  end,
  onChange,
  idPrefix,
}: TimeRangeFieldProps) {
  const [startHour = "09", startMinute = "00"] = start.split(":");
  const [endHour = "17", endMinute = "00"] = end.split(":");
  const [drafts, setDrafts] = useState({ startHour, startMinute, endHour, endMinute });

  useEffect(() => {
    setDrafts({ startHour, startMinute, endHour, endMinute });
  }, [startHour, startMinute, endHour, endMinute]);

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
      <div className="time-range-field__digits">
        <input
          id={`${idPrefix}-${rangeEnd}-hour`}
          className="time-range-field__input"
          inputMode="numeric"
          aria-label={`${label} hour`}
          value={drafts[hourKey]}
          onChange={(event) => updateDraft(rangeEnd, "hour", event.target.value)}
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
          onBlur={() => commitPart(rangeEnd, "minute")}
          maxLength={2}
          name={`${idPrefix}-${rangeEnd}-minute`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="time-range-field">
      {renderTime("start", "Awake start")}
      <span className="time-range-field__separator" aria-hidden="true">&ndash;</span>
      {renderTime("end", "Awake end")}
    </div>
  );
}
