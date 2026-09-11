import { useEffect, useState, type FormEvent } from "react";
import type { Clock, ClockNameMode } from "../types";
import { isSupportedTimezone } from "../data/timezones";
import { NameModeGroup } from "./NameModeGroup";
import { TimeRangeField } from "./TimeRangeField";
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
  defaultNameMode: ClockNameMode;
  onOpenChange: (open: boolean) => void;
  onSave: (values: ClockFormValues, clockId?: string) => void;
};

function getInitialValues(clock: Clock | null | undefined, defaultNameMode: ClockNameMode): ClockFormValues {
  return {
    timezone: clock?.timezone ?? "",
    secondaryName: clock?.secondaryName ?? "",
    nameMode: clock?.nameMode ?? defaultNameMode,
    workHoursEnabled: clock?.workHours?.enabled ?? false,
    workHoursStart: clock?.workHours?.start ?? "09:00",
    workHoursEnd: clock?.workHours?.end ?? "17:00",
    workHoursBasis: clock?.workHours?.basis ?? "clock",
  };
}

export function ClockFormDialog({ open, clock, defaultNameMode, onOpenChange, onSave }: ClockFormDialogProps) {
  const [values, setValues] = useState<ClockFormValues>(() => getInitialValues(clock, defaultNameMode));

  useEffect(() => {
    if (open) {
      const nextValues = getInitialValues(clock, defaultNameMode);
      setValues(nextValues);
    }
  }, [clock, defaultNameMode, open]);

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
            <NameModeGroup
              value={values.nameMode}
              onChange={(nameMode) => updateValue("nameMode", nameMode)}
              previewTimezone={values.timezone || undefined}
            />
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

                <TimeRangeField
                  start={values.workHoursStart}
                  end={values.workHoursEnd}
                  onChange={(start, end) => {
                    setValues((current) => ({ ...current, workHoursStart: start, workHoursEnd: end }));
                  }}
                  idPrefix="work-hours"
                />
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
