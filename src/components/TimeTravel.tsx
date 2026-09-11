import { RotateCcw, X } from 'lucide-react';
import type { CSSProperties, SyntheticEvent } from 'react';
import { Button } from './ui/button';

type Overlap = { startMinutes: number; endMinutes: number };

type TimeTravelProps = {
  open: boolean;
  rawMinutes: number;
  onRawMinutesChange: (value: number) => void;
  onSettle: (value: number) => void;
  onClose: () => void;
  overlaps: Overlap[];
  primaryLabel: string;
};

function formatOffset(minutes: number) {
  if (minutes === 0) return 'Now';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `+${hours ? `${hours}h` : ''}${hours && remainder ? ' ' : ''}${remainder ? `${remainder}m` : ''}`;
}

export function TimeTravel({
  open, rawMinutes, onRawMinutesChange, onSettle, onClose, overlaps, primaryLabel,
}: TimeTravelProps) {
  if (!open) return null;

  const valueText = formatOffset(rawMinutes);
  const activeOverlap = overlaps.find(
    (overlap) => rawMinutes >= overlap.startMinutes && rawMinutes < overlap.endMinutes,
  );
  const nextOverlap = overlaps.find((overlap) => overlap.startMinutes > rawMinutes) ?? overlaps[0];
  const settle = (_event: SyntheticEvent<HTMLInputElement>) => {
    onSettle(Math.round(rawMinutes / 15) * 15);
  };

  return (
    <div className='time-travel'>
      <div className='time-travel__label'>
        <strong>{valueText}</strong>
        <span>{primaryLabel}</span>
        {activeOverlap ? (
          <span className='time-travel__availability'>Everyone free</span>
        ) : nextOverlap ? (
          <span>Next overlap {formatOffset(nextOverlap.startMinutes)}</span>
        ) : null}
      </div>
      <div className='time-travel__track'>
        {overlaps.map((overlap) => (
          <div
            className='time-travel__overlap'
            key={`${overlap.startMinutes}-${overlap.endMinutes}`}
            style={{
              left: `${(overlap.startMinutes / 1440) * 100}%`,
              width: `${((overlap.endMinutes - overlap.startMinutes) / 1440) * 100}%`,
            } as CSSProperties}
          />
        ))}
        <input
          className='time-travel__range'
          type='range'
          min={0}
          max={1440}
          step={1}
          value={rawMinutes}
          aria-label='Preview time offset'
          aria-valuetext={valueText}
          onInput={(event) => onRawMinutesChange(Number(event.currentTarget.value))}
          onPointerUp={settle}
          onMouseUp={settle}
          onTouchEnd={settle}
          onKeyUp={settle}
          onBlur={settle}
        />
      </div>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={() => onRawMinutesChange(0)}
      >
        <RotateCcw size={15} />
        Reset
      </Button>
      <Button type='button' variant='icon' size='icon' aria-label='Close time travel' onClick={onClose}>
        <X size={16} />
      </Button>
    </div>
  );
}
