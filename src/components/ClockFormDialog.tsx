import { Minus, Plus } from "lucide-react";
import { DateTime } from "luxon";
import { useEffect, useState, type FormEvent } from "react";
import type { Clock, ClockNameMode } from "../types";
import { getOffsetCode, getTimezoneLabel, isSupportedTimezone } from "../data/timezones";
import { TimezonePicker } from "./TimezonePicker";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

type ClockFormValues = {
  timezone: string;
  secondaryName: string;
  nameMode: ClockNameMode;
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
    nameMode: clock?.nameMode ?? "location",
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

export function ClockFormDialog({ open, clock, onOpenChange, onSave }: ClockFormDialogProps) {
  const [values, setValues] = useState<ClockFormValues>(() => getInitialValues(clock));
  const hasTimezone = Boolean(values.timezone);
  const locationPreview = hasTimezone ? getTimezoneLabel(values.timezone) : "Location";
  const codePreview = hasTimezone ? getOffsetCode(DateTime.local().setZone(values.timezone)) : "Code";
  const nameModeLabels: Record<ClockNameMode, string> = {
    location: locationPreview,
    "location-code": hasTimezone ? locationPreview + " " + codePreview : "Location + code",
    code: codePreview,
  };

  useEffect(() => {
    if (open) {
      const nextValues = getInitialValues(clock);
      setValues(nextValues);
    }
  }, [clock, open]);

  const canSave =
    isSupportedTimezone(values.timezone) &&
    (!values.workHoursEnabled || (Boolean(values.workHoursStart) && Boolean(values.workHoursEnd)));

  function updateValue<Key extends keyof ClockFormValues>(key: Key, value: ClockFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
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
            <TimezonePicker
              id="timezone-search"
              value={values.timezone}
              onChange={(timezone) => updateValue("timezone", timezone)}
            />
          </div>

          <div className="form-field">
            <Label>Name style</Label>
            <div className="name-mode-group" role="radiogroup" aria-label="Name style">
              {(["location", "location-code", "code"] as const).map((nameMode) => (
                <button
                  key={nameMode}
                  type="button"
                  role="radio"
                  aria-checked={values.nameMode === nameMode}
                  className={"name-mode-option" + (values.nameMode === nameMode ? " name-mode-option--active" : "")}
                  onClick={() => updateValue("nameMode", nameMode)}
                >
                  {nameModeLabels[nameMode]}
                </button>
              ))}
            </div>
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

export function TimeStepperField({ label, value, onChange }: TimeStepperFieldProps) {
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
