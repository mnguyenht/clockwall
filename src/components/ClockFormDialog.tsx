import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DateTime } from "luxon";
import type { Clock } from "../types";
import { getTimezoneLabel, timezoneOptions } from "../data/timezones";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

type ClockFormValues = {
  timezone: string;
  secondaryName: string;
  workHoursEnabled: boolean;
  workHoursStart: string;
  workHoursEnd: string;
  workHoursBasis: "clock" | "primary";
};

type ClockFormDialogProps = {
  open: boolean;
  clock?: Clock | null;
  onOpenChange: (open: boolean) => void;
  onSave: (values: ClockFormValues, clockId?: string) => void;
};

function getInitialValues(clock?: Clock | null): ClockFormValues {
  return {
    timezone: clock?.timezone ?? "",
    secondaryName: clock?.secondaryName ?? "",
    workHoursEnabled: clock?.workHours?.enabled ?? false,
    workHoursStart: clock?.workHours?.start ?? "09:00",
    workHoursEnd: clock?.workHours?.end ?? "17:00",
    workHoursBasis: clock?.workHours?.basis ?? "clock",
  };
}

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

function isValidTimezone(timezone: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function normalizeTimezoneSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+-]/g, "");
}

function getOffsetAliases(dateTime: DateTime) {
  const offsetMinutes = dateTime.offset;
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  const compactOffset = `${sign}${hours}`;
  const paddedOffset = `${sign}${String(hours).padStart(2, "0")}`;
  const fullOffset = `${paddedOffset}:${String(minutes).padStart(2, "0")}`;

  return [
    `gmt${compactOffset}`,
    `gmt${paddedOffset}`,
    `gmt${fullOffset}`,
    `utc${compactOffset}`,
    `utc${paddedOffset}`,
    `utc${fullOffset}`,
  ];
}

function getTimezoneSearchText(option: (typeof timezoneOptions)[number], now: DateTime) {
  const optionTime = now.setZone(option.timezone);
  const shortName = optionTime.offsetNameShort ?? "";
  const offsetAliases = getOffsetAliases(optionTime);

  return `${option.label} ${option.timezone} ${option.keywords} ${shortName} ${offsetAliases.join(" ")}`.toLowerCase();
}

export function ClockFormDialog({ open, clock, onOpenChange, onSave }: ClockFormDialogProps) {
  const [values, setValues] = useState<ClockFormValues>(() => getInitialValues(clock));
  const [timezoneSearch, setTimezoneSearch] = useState(clock ? getTimezoneLabel(getInitialValues(clock).timezone) : "");
  const [timezoneFocused, setTimezoneFocused] = useState(false);
  const now = DateTime.local();

  useEffect(() => {
    if (open) {
      const nextValues = getInitialValues(clock);
      setValues(nextValues);
      setTimezoneSearch(clock ? getTimezoneLabel(nextValues.timezone) : "");
      setTimezoneFocused(false);
    }
  }, [clock, open]);

  const filteredTimezones = useMemo(() => {
    const query = timezoneSearch.trim().toLowerCase();
    const normalizedQuery = normalizeTimezoneSearch(query);
    if (!query) {
      return timezoneOptions.slice(0, 12);
    }

    return timezoneOptions
      .filter((option) => {
        const haystack = getTimezoneSearchText(option, now);
        return haystack.includes(query) || normalizeTimezoneSearch(haystack).includes(normalizedQuery);
      })
      .slice(0, 12);
  }, [timezoneSearch]);

  const canSave =
    isValidTimezone(values.timezone) &&
    (!values.workHoursEnabled || (Boolean(values.workHoursStart) && Boolean(values.workHoursEnd)));

  function updateValue<Key extends keyof ClockFormValues>(key: Key, value: ClockFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function selectTimezone(timezone: string, label: string) {
    setValues((current) => ({
      ...current,
      timezone,
    }));
    setTimezoneSearch(label);
    setTimezoneFocused(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    onSave(
      {
        ...values,
        timezone: values.timezone.trim(),
        secondaryName: values.secondaryName.trim(),
      },
      clock?.id,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="clock-form-dialog" aria-describedby="clock-form-description">
        <form className="clock-form" onSubmit={handleSubmit} autoComplete="off">
          <div>
            <DialogTitle className="settings-title">{clock ? "Edit Clock" : "Add Clock"}</DialogTitle>
            <DialogDescription id="clock-form-description" className="settings-description">
              Configure a timezone clock.
            </DialogDescription>
          </div>

          <div className="form-field timezone-field">
            <Label htmlFor="timezone-search">Timezone</Label>
            <input
              id="timezone-search"
              className="text-input"
              value={timezoneSearch}
              onChange={(event) => {
                setTimezoneSearch(event.target.value);
                updateValue("timezone", "");
                setTimezoneFocused(true);
              }}
              onFocus={() => setTimezoneFocused(true)}
              onBlur={() => window.setTimeout(() => setTimezoneFocused(false), 120)}
              placeholder="Search city or timezone"
              name="timezone-search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            {timezoneFocused ? (
              <div className="timezone-results" role="listbox" aria-label="Timezone suggestions">
                {filteredTimezones.map((option) => (
                  <button
                    className={`timezone-option ${values.timezone === option.timezone ? "timezone-option--active" : ""}`}
                    key={option.timezone}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectTimezone(option.timezone, option.label)}
                  >
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.timezone}</small>
                    </span>
                    <span>{now.setZone(option.timezone).toFormat("HH:mm")}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="form-field">
            <Label htmlFor="secondary-name">Secondary name</Label>
            <input
              id="secondary-name"
              className="text-input"
              value={values.secondaryName}
              onChange={(event) => updateValue("secondaryName", event.target.value)}
              placeholder="Team, person, client"
              name="secondary-name"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          <div className="availability-editor">
            <div className="settings-row settings-row--compact">
              <div className="settings-row__copy">
                <Label htmlFor="work-hours-enabled">Available timeslot</Label>
                <p>Show when this timezone is inside a useful contact window.</p>
              </div>
              <Switch
                id="work-hours-enabled"
                checked={values.workHoursEnabled}
                onCheckedChange={(checked) => updateValue("workHoursEnabled", checked)}
                aria-label="Enable available timeslot"
              />
            </div>

            {values.workHoursEnabled ? (
              <>
                <div className="settings-row settings-row--compact">
                  <div className="settings-row__copy">
                    <Label htmlFor="work-hours-basis">Based on main timezone</Label>
                    <p>Off means these hours belong to this clock.</p>
                  </div>
                  <Switch
                    id="work-hours-basis"
                    checked={values.workHoursBasis === "primary"}
                    onCheckedChange={(checked) => updateValue("workHoursBasis", checked ? "primary" : "clock")}
                    aria-label="Base availability on main timezone"
                  />
                </div>

                <div className="time-range-fields">
                  <TimeStepperField
                    label="Start"
                    value={values.workHoursStart}
                    onChange={(value) => updateValue("workHoursStart", value)}
                  />
                  <TimeStepperField
                    label="End"
                    value={values.workHoursEnd}
                    onChange={(value) => updateValue("workHoursEnd", value)}
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {clock ? "Save" : "Add Clock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type TimeStepperFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TimeStepperField({ label, value, onChange }: TimeStepperFieldProps) {
  const [hour = "09", minute = "00"] = value.split(":");
  const [hourDraft, setHourDraft] = useState(hour);
  const [minuteDraft, setMinuteDraft] = useState(minute);

  useEffect(() => {
    setHourDraft(hour);
    setMinuteDraft(minute);
  }, [hour, minute]);

  function shift(deltaMinutes: number) {
    onChange(minutesToTime(timeToMinutes(value) + deltaMinutes));
  }

  function updateDraft(part: "hour" | "minute", nextValue: string) {
    const cleanValue = nextValue.replace(/\D/g, "").slice(0, 2);
    if (part === "hour") {
      setHourDraft(cleanValue);
      return;
    }

    setMinuteDraft(cleanValue);
  }

  function commitPart(part: "hour" | "minute") {
    const nextHour = part === "hour" ? clampTimePart(hourDraft, 23) : clampTimePart(hour, 23);
    const nextMinute = part === "minute" ? clampTimePart(minuteDraft, 59) : clampTimePart(minute, 59);
    onChange(`${nextHour}:${nextMinute}`);
  }

  return (
    <div className="time-stepper-field">
      <div className="time-stepper-field__top">
        <span className="ui-label">{label}</span>
        <div className="time-stepper-field__actions">
          <button type="button" className="time-stepper-field__button" onClick={() => shift(-5)} aria-label={`Move ${label} earlier`}>
            <Minus size={13} />
          </button>
          <button type="button" className="time-stepper-field__button" onClick={() => shift(5)} aria-label={`Move ${label} later`}>
            <Plus size={13} />
          </button>
        </div>
      </div>
      <div className="time-stepper">
        <input
          className="time-stepper__input"
          inputMode="numeric"
          aria-label={`${label} hour`}
          value={hourDraft}
          onChange={(event) => updateDraft("hour", event.target.value)}
          onBlur={() => commitPart("hour")}
          maxLength={2}
          name={`${label.toLowerCase()}-hour`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <span>:</span>
        <input
          className="time-stepper__input"
          inputMode="numeric"
          aria-label={`${label} minute`}
          value={minuteDraft}
          onChange={(event) => updateDraft("minute", event.target.value)}
          onBlur={() => commitPart("minute")}
          maxLength={2}
          name={`${label.toLowerCase()}-minute`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
