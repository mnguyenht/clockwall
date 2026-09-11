import { Pin, PinOff, Trash2, X } from "lucide-react";
import { Button } from "./ui/button";

type SelectionBarProps = {
  count: number;
  onPin: () => void;
  onUnpin: () => void;
  onDelete: () => void;
  onClear: () => void;
};

export function SelectionBar({ count, onPin, onUnpin, onDelete, onClear }: SelectionBarProps) {
  if (count === 0) {
    return null;
  }

  return (
    <div className="selection-bar">
      <span className="selection-bar__count">{count} selected</span>
      <span className="selection-bar__divider" aria-hidden="true" />
      <Button type="button" variant="ghost" size="icon" onClick={onPin} aria-label="Pin" title="Pin">
        <Pin size={15} />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={onUnpin} aria-label="Unpin" title="Unpin">
        <PinOff size={15} />
      </Button>
      <Button
        type="button"
        className="selection-bar__delete"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 size={15} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClear}
        aria-label="Clear selection"
        title="Clear selection"
      >
        <X size={15} />
      </Button>
    </div>
  );
}
