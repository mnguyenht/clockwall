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
      <span>{count} selected</span>
      <Button type="button" variant="ghost" size="sm" onClick={onPin}>
        <Pin size={15} />
        Pin
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onUnpin}>
        <PinOff size={15} />
        Unpin
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
        <Trash2 size={15} />
        Delete
      </Button>
      <Button type="button" size="sm" onClick={onClear}>
        <X size={15} />
        Clear
      </Button>
    </div>
  );
}
