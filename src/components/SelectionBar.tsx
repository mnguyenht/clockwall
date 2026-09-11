import { m, useReducedMotion } from "framer-motion";
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
  const shouldReduceMotion = useReducedMotion();

  if (count === 0) {
    return null;
  }

  return (
    <m.div
      className="selection-bar"
      initial={shouldReduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={shouldReduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.98 }}
      transition={
        shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }
      }
    >
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
    </m.div>
  );
}
