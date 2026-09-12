import { ArrowUpDown } from "lucide-react";
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
  direction: ClockSortDirection;
}> = [
  { label: "Location A–Z", key: "locationName", direction: "ascending" },
  { label: "Location Z–A", key: "locationName", direction: "descending" },
  { label: "Secondary A–Z", key: "secondaryName", direction: "ascending" },
  { label: "Secondary Z–A", key: "secondaryName", direction: "descending" },
  { label: "Time, Earliest First", key: "time", direction: "ascending" },
  { label: "Time, Latest First", key: "time", direction: "descending" },
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
            <button
              key={`${option.key}-${option.direction}`}
              type="button"
              className="sort-menu__item"
              onClick={() => sort(option.key, option.direction)}
            >
              {option.label}
            </button>
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
