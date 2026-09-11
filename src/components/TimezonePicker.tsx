import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import {
  getOffsetCode,
  getTimezoneLabel,
  searchTimezones,
  type TimezoneOption,
} from "../data/timezones";

type TimezonePickerProps = {
  id: string;
  value: string;
  onChange: (timezone: string) => void;
  placeholder?: string;
  className?: string;
};

export function TimezonePicker({
  id,
  value,
  onChange,
  placeholder = "Search city, country, GMT+7, or 23:00",
  className,
}: TimezonePickerProps) {
  const [search, setSearch] = useState(value ? getTimezoneLabel(value) : "");
  const [focused, setFocused] = useState(false);
  const internalValue = useRef<string | null>(null);
  const now = DateTime.local();
  const results = focused ? searchTimezones(search, now, 12) : [];

  useEffect(() => {
    if (internalValue.current === value) {
      internalValue.current = null;
      return;
    }
    setSearch(value ? getTimezoneLabel(value) : "");
  }, [value]);

  function select(option: TimezoneOption) {
    internalValue.current = option.timezone;
    setSearch(option.label);
    onChange(option.timezone);
    setFocused(false);
  }

  return (
    <div className={className}>
      <input
        id={id}
        className="text-input"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          internalValue.current = "";
          onChange("");
          setFocused(true);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder={placeholder}
        name={id}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
      />
      {focused ? (
        <div className="timezone-results" role="listbox" aria-label="Timezone suggestions">
          {results.length ? (
            results.map((option) => {
              const zoned = now.setZone(option.timezone);
              const offset = getOffsetCode(zoned);
              const subtext = option.isOffset
                ? offset
                : `${offset}${option.countryLabel ? ` · ${option.countryLabel}` : ""}`;
              return (
                <button
                  className={`timezone-option ${value === option.timezone ? "timezone-option--active" : ""}`}
                  key={option.timezone}
                  type="button"
                  title={option.timezone}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(option)}
                >
                  <span>
                    <strong>{option.label}</strong>
                    <small>{subtext}</small>
                  </span>
                  <span>{zoned.toFormat("HH:mm")}</span>
                </button>
              );
            })
          ) : (
            <p className="timezone-empty">No matching timezone</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
