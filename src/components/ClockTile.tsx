import { Clock3, Copy, ListOrdered, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import type { Clock, ThemeMode } from "../types";
import {
  getAvailabilityArcs,
  getAvailabilityDurationMinutes,
  getAvailabilityStatus,
  getClockDateTime,
  getClockPrimaryName,
  getDayStatus,
  getTimezoneCode,
} from "../lib/time";
import { AnalogClock } from "./AnalogClock";
import { Button } from "./ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "./ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

type ClockTileProps = {
  clock: Clock;
  now: Date;
  theme: ThemeMode;
  displaySeconds: boolean;
  primaryTimezone: string;
  awakeHours: { start: string; end: string };
  offsetMinutes: number;
  settling: boolean;
  onEdit: (clock: Clock) => void;
  onDuplicate: (clockId: string) => void;
  onDelete: (clockId: string) => void;
  onTogglePinned: (clockId: string) => void;
  onMoveToPosition: (clockId: string, position: number) => void;
  clockPosition: number;
  clockCount: number;
  selected: boolean;
  onToggleSelected: (clockId: string) => void;
};

export function ClockTile({
  clock,
  now,
  theme,
  displaySeconds,
  primaryTimezone,
  awakeHours,
  offsetMinutes,
  settling,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePinned,
  onMoveToPosition,
  clockPosition,
  clockCount,
  selected,
  onToggleSelected,
}: ClockTileProps) {
  const shiftedNow = new Date(now.getTime() + offsetMinutes * 60000);
  const dateTime = getClockDateTime(shiftedNow, clock.timezone);
  const primaryName = getClockPrimaryName(clock, dateTime);
  const timezoneCode = getTimezoneCode(dateTime);
  const primaryDateTime = getClockDateTime(shiftedNow, primaryTimezone);
  const dayStatus = getDayStatus(dateTime);
  const dayPeriod: "AM" | "PM" = dateTime.hour < 12 ? "AM" : "PM";
  const isDaytime = dateTime.hour >= 6 && dateTime.hour < 18;
  const availabilityDateTime = clock.workHours?.basis === "primary" ? primaryDateTime : dateTime;
  const availability = getAvailabilityStatus(availabilityDateTime, clock.workHours);
  const availabilityArcs = getAvailabilityArcs(dateTime, primaryDateTime, clock.workHours, awakeHours);
  const availabilityDuration = getAvailabilityDurationMinutes(clock.workHours);
  const hasLongAvailability = availabilityDuration > 720;

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (!event.shiftKey) {
      return;
    }

    event.preventDefault();
    onToggleSelected(clock.id);
  }

  const content =
    theme === "dark-digital" ? (
      <article
        className={`clock-tile clock-tile--digital ${selected ? 'clock-tile--selected' : ''} ${settling ? 'clock-tile--settling' : ''}`}
        onClick={handleClick}
      >
        <div className="clock-tile__meta">
          <p className="clock-tile__name">
            {clock.pinned ? <Pin className="pin-mark" size={13} /> : null}
            {primaryName}
          </p>
          <span>{timezoneCode}</span>
        </div>
        <div className="digital-time-block">
          <div className="digital-time-row">
            <time className="digital-time" dateTime={dateTime.toISO() ?? undefined}>
              {dateTime.toFormat(displaySeconds ? "HH:mm:ss" : "HH:mm")}
            </time>
            <span className={`period-badge ${isDaytime ? "period-badge--day" : "period-badge--night"}`}>
              {dayPeriod}
            </span>
          </div>
          {hasLongAvailability ? (
            <span className="availability-state-chip availability-state-chip--digital availability-state-chip--wide">
              Full day
            </span>
          ) : availability?.available ? (
            <span className="availability-state-chip availability-state-chip--digital">Available</span>
          ) : null}
        </div>
        <div className="clock-tile__footer">
          <span>{clock.secondaryName || clock.timezone}</span>
          <div className="clock-status-stack">
            <span>{dayStatus}</span>
          </div>
        </div>
      </article>
    ) : (
      <article
        className={`clock-tile clock-tile--analog ${selected ? 'clock-tile--selected' : ''} ${settling ? 'clock-tile--settling' : ''}`}
        onClick={handleClick}
      >
        {clock.pinned ? <Pin className="clock-pin-corner" size={15} /> : null}
        <AnalogClock
          dateTime={dateTime}
          displaySeconds={displaySeconds}
          period={dayPeriod}
          offsetMinutes={offsetMinutes}
          settling={settling}
          availabilityArcs={availabilityArcs}
        />
        <div className="clock-label">
          <p className="clock-tile__name">
            <span className="clock-name-anchor">
              {primaryName}
              {hasLongAvailability || availability?.available ? (
                <span
                  className="availability-dot availability-dot--label"
                  aria-label={hasLongAvailability ? "Full day" : "Available"}
                  title={hasLongAvailability ? "Full day" : "Available"}
                />
              ) : null}
            </span>
          </p>
          <p>{clock.secondaryName || clock.timezone}</p>
          <span>{dayStatus} · {dayPeriod}</span>
        </div>
      </article>
    );

  return (
    <ClockContextMenu
      clock={clock}
      onEdit={onEdit}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onTogglePinned={onTogglePinned}
      onMoveToPosition={onMoveToPosition}
      clockPosition={clockPosition}
      clockCount={clockCount}
    >
      {content}
    </ClockContextMenu>
  );
}

type ClockActionsProps = {
  clock: Clock;
  onEdit: (clock: Clock) => void;
  onDuplicate: (clockId: string) => void;
  onDelete: (clockId: string) => void;
  onTogglePinned: (clockId: string) => void;
};

type ClockContextMenuProps = ClockActionsProps & {
  children: ReactNode;
  onMoveToPosition: (clockId: string, position: number) => void;
  clockPosition: number;
  clockCount: number;
};

function ClockContextMenu({
  clock,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePinned,
  onMoveToPosition,
  clockPosition,
  clockCount,
  children,
}: ClockContextMenuProps) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [positionValue, setPositionValue] = useState(String(clockPosition));

  function openMoveDialog() {
    setPositionValue(String(clockPosition));
    setMoveDialogOpen(true);
  }

  function handleMoveSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const position = Number(positionValue);
    if (!Number.isInteger(position) || position < 1 || position > clockCount) {
      return;
    }

    onMoveToPosition(clock.id, position);
    setMoveDialogOpen(false);
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => onTogglePinned(clock.id)}>
            {clock.pinned ? <PinOff size={15} /> : <Pin size={15} />}
            {clock.pinned ? "Unpin" : "Pin"}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onEdit(clock)}>
            <Pencil size={15} />
            Edit
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onEdit(clock)}>
            <Clock3 size={15} />
            Availability
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onDuplicate(clock.id)}>
            <Copy size={15} />
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem onSelect={openMoveDialog}>
            <ListOrdered size={15} />
            Move to position...
          </ContextMenuItem>
          <ContextMenuItem className="context-menu-item--danger" onSelect={() => onDelete(clock.id)}>
            <Trash2 size={15} />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="move-position-dialog" aria-describedby={`move-position-${clock.id}`}>
          <form className="move-position-form" onSubmit={handleMoveSubmit} autoComplete="off">
            <div>
              <DialogTitle className="settings-title">Move clock</DialogTitle>
              <DialogDescription id={`move-position-${clock.id}`} className="move-position-description">
                Choose a numbered slot from 1 to {clockCount}.
              </DialogDescription>
            </div>
            <label className="form-field">
              <span className="ui-label">Position</span>
              <input
                className="text-input"
                type="number"
                inputMode="numeric"
                min={1}
                max={clockCount}
                value={positionValue}
                onChange={(event) => setPositionValue(event.target.value)}
                name="clock-position"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
              />
            </label>
            <div className="form-actions">
              <Button type="button" variant="ghost" onClick={() => setMoveDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Move</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
