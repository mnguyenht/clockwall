import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export type ClockSortKey = "locationName" | "secondaryName" | "time";
export type ClockSortDirection = "ascending" | "descending";

type SortMenuProps = {
  canRevert: boolean;
  onSort: (key: ClockSortKey, direction: ClockSortDirection) => void;
  onRevert: () => void;
};

const sortOptions: Array<{
  label: string;
  key: ClockSortKey;
}> = [
  { label: "Location", key: "locationName" },
  { label: "Name", key: "secondaryName" },
  { label: "Time", key: "time" },
];

export function SortMenu({ canRevert, onSort, onRevert }: SortMenuProps) {
  const [open, setOpen] = useState(false);

  function sort(key: ClockSortKey, direction: ClockSortDirection) {
    onSort(key, direction);
    setOpen(false);
  }

  function revert() {
    onRevert();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          className="sort-button"
          variant="icon"
          size="icon"
          aria-label="Sort clocks"
          title="Sort clocks"
        >
          <ArrowUpDown size={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="sort-menu" side="top" align="start">
        <div className="sort-menu__list">
          {sortOptions.map((option) => (
            <div key={option.key} className="sort-menu__row">
              <span>{option.label}</span>
              <div className="sort-menu__directions">
                <button
                  type="button"
                  className="sort-menu__direction"
                  aria-label={`Sort by ${option.label}, ascending`}
                  title={`Sort by ${option.label}, ascending`}
                  onClick={() => sort(option.key, "ascending")}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  className="sort-menu__direction"
                  aria-label={`Sort by ${option.label}, descending`}
                  title={`Sort by ${option.label}, descending`}
                  onClick={() => sort(option.key, "descending")}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="sort-menu__separator" />
        <button type="button" className="sort-menu__action" disabled={!canRevert} onClick={revert}>
          Revert Sort
        </button>
      </PopoverContent>
    </Popover>
  );
}
