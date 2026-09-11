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
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const internalValue = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const now = DateTime.local();
  const results = focused ? searchTimezones(search, now, 12) : [];
  const listId = `${id}-listbox`;

  useEffect(() => {
    if (internalValue.current === value) {
      internalValue.current = null;
      return;
    }
    setSearch(value ? getTimezoneLabel(value) : "");
  }, [value]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    if (focused) {
      setHighlightedIndex(0);
    }
  }, [focused]);

  useEffect(() => {
    setHighlightedIndex((current) => Math.min(current, Math.max(results.length - 1, 0)));
  }, [results.length]);

  useEffect(() => {
    if (!focused || !results[highlightedIndex]) {
      return;
    }

    const highlightedRow = listRef.current?.children[highlightedIndex];
    if (highlightedRow instanceof HTMLElement) {
      highlightedRow.scrollIntoView({ block: "nearest" });
    }
  }, [focused, highlightedIndex, results.length]);

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
        onPointerDown={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!focused) {
              setFocused(true);
              setHighlightedIndex(0);
            } else if (results.length) {
              setHighlightedIndex((current) => (current + 1) % results.length);
            }
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (focused && results.length) {
              setHighlightedIndex((current) => (current - 1 + results.length) % results.length);
            }
          } else if (event.key === "Enter" && focused && results[highlightedIndex]) {
            // Prevent the surrounding form from submitting when choosing a suggestion.
            event.preventDefault();
            select(results[highlightedIndex]);
          } else if (event.key === "Escape") {
            // Radix's Dialog listens for Escape on document in the capture phase, so it always
            // wins and closes the dialog. Just keep local state consistent; don't fight it.
            setFocused(false);
          } else if (event.key === "Tab") {
            setFocused(false);
          }
        }}
        placeholder={placeholder}
        name={id}
        role="combobox"
        aria-expanded={focused}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          focused && results[highlightedIndex] ? `${listId}-${highlightedIndex}` : undefined
        }
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
      />
      {focused ? (
        <div
          ref={listRef}
          id={listId}
          className="timezone-results"
          role="listbox"
          aria-label="Timezone suggestions"
        >
          {results.length ? (
            results.map((option, index) => {
              const zoned = now.setZone(option.timezone);
              const offset = getOffsetCode(zoned);
              const subtext = `${offset}${option.countryLabel ? ` · ${option.countryLabel}` : ""}`;
              return (
                <button
                  id={`${listId}-${index}`}
                  className={`timezone-option ${value === option.timezone ? "timezone-option--active" : ""} ${index === highlightedIndex ? "timezone-option--highlighted" : ""}`}
                  key={option.timezone}
                  type="button"
                  role="option"
                  aria-selected={index === highlightedIndex}
                  title={option.timezone}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
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
