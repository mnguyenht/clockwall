import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  defaultAnimateLayoutChanges,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Board, Clock, ThemeMode } from "../types";
import { ClockTile } from "./ClockTile";
import { getClockDateTime, getClockPrimaryName, getTimezoneCode } from "../lib/time";

type ClockWallProps = {
  board: Board;
  theme: ThemeMode;
  now: Date;
  searchQuery: string;
  displaySeconds: boolean;
  primaryTimezone: string;
  awakeHours: { start: string; end: string };
  onEditClock: (clock: Clock) => void;
  onDuplicateClock: (clockId: string) => void;
  onDeleteClock: (clockId: string) => void;
  onToggleClockPinned: (clockId: string) => void;
  onReorderClocks: (clockIds: string[]) => void;
  onMoveClockToPosition: (clockId: string, position: number) => void;
  selectedClockIds: string[];
  onToggleClockSelection: (clockId: string) => void;
  onClearSelection: () => void;
};

export function ClockWall({
  board,
  theme,
  now,
  searchQuery,
  displaySeconds,
  primaryTimezone,
  awakeHours,
  onEditClock,
  onDuplicateClock,
  onDeleteClock,
  onToggleClockPinned,
  onReorderClocks,
  onMoveClockToPosition,
  selectedClockIds,
  onToggleClockSelection,
  onClearSelection,
}: ClockWallProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchActive = normalizedSearchQuery.length > 0;
  const visibleClocks = normalizedSearchQuery
    ? board.clocks.filter((clock) => clockMatchesSearch(clock, now, normalizedSearchQuery))
    : board.clocks;
  const movableClockIds = visibleClocks.filter((clock) => !clock.pinned).map((clock) => clock.id);
  const sortableItems = movableClockIds;

  function resolveDropIndex(overId: string) {
    const direct = movableClockIds.indexOf(overId);
    if (direct !== -1) {
      return direct;
    }

    // Released over a pinned clock. Pinned clocks never move, so walk outward
    // through board order and land beside the closest clock that can move,
    // instead of cancelling the drag.
    const overBoardIndex = board.clocks.findIndex((clock) => clock.id === overId);
    if (overBoardIndex === -1) {
      return -1;
    }

    for (let step = 1; step < board.clocks.length; step += 1) {
      const neighbours = [board.clocks[overBoardIndex - step], board.clocks[overBoardIndex + step]];
      for (const neighbour of neighbours) {
        const index = neighbour ? movableClockIds.indexOf(neighbour.id) : -1;
        if (index !== -1) {
          return index;
        }
      }
    }

    return -1;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    setDragDelta(null);

    if (!over) {
      return;
    }

    const activeClock = board.clocks.find((clock) => clock.id === String(active.id));
    if (!activeClock || activeClock.pinned) {
      return;
    }

    const oldIndex = movableClockIds.indexOf(activeClock.id);
    const newIndex = resolveDropIndex(String(over.id));

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    const selectedSet = new Set(selectedClockIds);
    const picked = movableClockIds
      .map((id, index) => ({ id, index }))
      .filter((entry) => selectedSet.has(entry.id));
    let reorderedMovableIds: string[];

    if (!selectedSet.has(activeClock.id) || picked.length < 2) {
      reorderedMovableIds = arrayMove(movableClockIds, oldIndex, newIndex);
    } else {
      const delta = newIndex - oldIndex;
      const n = movableClockIds.length;

      // Clamp the group as a unit so the gaps between the picked clocks never collapse.
      let shift = delta;
      const first = picked[0].index + delta;
      const last = picked[picked.length - 1].index + delta;
      if (first < 0) shift -= first;
      if (last > n - 1) shift -= last - (n - 1);

      const placed: Array<string | null> = new Array(n).fill(null);
      picked.forEach((entry) => {
        placed[entry.index + shift] = entry.id;
      });
      const rest = movableClockIds.filter((id) => !selectedSet.has(id));
      let restIndex = 0;
      for (let i = 0; i < n; i += 1) {
        if (!placed[i]) {
          placed[i] = rest[restIndex];
          restIndex += 1;
        }
      }
      reorderedMovableIds = placed as string[];
    }

    const nextClockIds = board.clocks.map((clock) => {
      if (clock.pinned || !movableClockIds.includes(clock.id)) {
        return clock.id;
      }

      return reorderedMovableIds.shift() ?? clock.id;
    });
    onReorderClocks(nextClockIds);
  }

  if (board.clocks.length === 0) {
    return (
      <div className="empty-wall">
        <p>No clocks yet</p>
      </div>
    );
  }

  if (visibleClocks.length === 0) {
    return (
      <div className="empty-wall">
        <p>No matching clocks</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={({ active }) => {
        setActiveDragId(String(active.id));
        setDragDelta({ x: 0, y: 0 });
      }}
      onDragMove={(event) => setDragDelta(event.delta)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveDragId(null);
        setDragDelta(null);
      }}
    >
      <SortableContext items={sortableItems} strategy={rectSortingStrategy}>
        <main
          className={`clock-wall clock-wall--${theme} ${searchActive ? 'clock-wall--searching' : ''}`}
          aria-label={`${board.name} clocks`}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget && selectedClockIds.length > 0) {
              onClearSelection();
            }
          }}
        >
          {visibleClocks.map((clock) => {
            const clockIndex = board.clocks.findIndex((candidate) => candidate.id === clock.id);
            return (
            <SortableClockTile
              key={clock.id}
              clock={clock}
              coDragOffset={
                !clock.pinned &&
                activeDragId !== null &&
                activeDragId !== clock.id &&
                selectedClockIds.includes(activeDragId) &&
                selectedClockIds.includes(clock.id)
                  ? dragDelta
                  : null
              }
            >
              <ClockTile
                clock={clock}
                now={now}
                theme={theme}
                displaySeconds={displaySeconds}
                primaryTimezone={primaryTimezone}
                awakeHours={awakeHours}
                onEdit={onEditClock}
                onDuplicate={onDuplicateClock}
                onDelete={onDeleteClock}
                onTogglePinned={onToggleClockPinned}
                onMoveToPosition={onMoveClockToPosition}
                clockPosition={clockIndex + 1}
                clockCount={board.clocks.length}
                selected={selectedClockIds.includes(clock.id)}
                onToggleSelected={onToggleClockSelection}
              />
            </SortableClockTile>
            );
          })}
        </main>
      </SortableContext>
    </DndContext>
  );
}

function clockMatchesSearch(clock: Clock, now: Date, query: string) {
  const dateTime = getClockDateTime(now, clock.timezone);
  const haystack = [
    clock.locationName,
    clock.secondaryName,
    clock.timezone,
    getTimezoneCode(dateTime),
    getClockPrimaryName(clock, dateTime),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

type SortableClockTileProps = {
  clock: Clock;
  children: ReactNode;
  coDragOffset: { x: number; y: number } | null;
};

function SortableClockTile({ clock, children, coDragOffset }: SortableClockTileProps) {
  if (clock.pinned) {
    return <PinnedClockTile clock={clock}>{children}</PinnedClockTile>;
  }

  return <MovableClockTile clock={clock} coDragOffset={coDragOffset}>{children}</MovableClockTile>;
}

function PinnedClockTile({ clock, children }: { clock: Clock; children: ReactNode }) {
  const { setNodeRef, transform, transition } = useSortable({
    id: clock.id,
    disabled: true,
    transition: {
      duration: 260,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  } as CSSProperties;

  return (
    <div
      ref={setNodeRef}
      className="sortable-clock sortable-clock--pinned sortable-clock--search-transition"
      style={style}
      aria-disabled
    >
      {children}
    </div>
  );
}

function MovableClockTile({ clock, children, coDragOffset }: SortableClockTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: clock.id,
    animateLayoutChanges: (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true }),
    transition: {
      duration: 260,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    },
  });
  const transformValue = coDragOffset
    ? `translate3d(${coDragOffset.x}px, ${coDragOffset.y}px, 0)`
    : CSS.Transform.toString(transform);
  const dragRotation = useVelocityRotation(isDragging, transform?.x ?? 0);
  const style = {
    "--drag-rotation": `${dragRotation}deg`,
    transform: transformValue,
    transition: coDragOffset
      ? "none"
      : isDragging
        ? undefined
        : transition ?? "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  } as CSSProperties;
  const className = [
    "sortable-clock",
    isDragging ? "sortable-clock--dragging" : "",
    coDragOffset ? "sortable-clock--co-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");


  return (
    <div
      ref={setNodeRef}
      className={className}
      style={style}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

function useVelocityRotation(isDragging: boolean, x: number) {
  const [rotation, setRotation] = useState(0);
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);
  const lastMotion = useRef({ time: 0, x: 0 });

  useEffect(() => {
    if (!isDragging) {
      lastMotion.current = { time: 0, x: 0 };
      targetRotation.current = 0;
      return;
    }

    const now = Date.now();
    const previous = lastMotion.current;
    if (previous.time) {
      const deltaX = x - previous.x;
      const deltaTime = Math.max(16, now - previous.time);
      targetRotation.current = Math.max(-6, Math.min(6, (deltaX / deltaTime) * 86));
    }
    lastMotion.current = { time: now, x };
  }, [isDragging, x]);

  useEffect(() => {
    let frameId = 0;

    function tick() {
      if (!isDragging) {
        targetRotation.current = 0;
      } else {
        targetRotation.current *= 0.9;
      }

      currentRotation.current += (targetRotation.current - currentRotation.current) * 0.18;
      const nextRotation = Math.abs(currentRotation.current) < 0.04 ? 0 : currentRotation.current;
      setRotation(nextRotation);
      frameId = window.requestAnimationFrame(tick);
    }

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isDragging]);

  return rotation;
}
