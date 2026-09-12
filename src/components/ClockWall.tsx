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
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  type SortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { getTimezoneCountryLabel } from "../data/timezones";
import type { Board, Clock, ThemeMode } from "../types";
import { ClockTile } from "./ClockTile";
import {
  clockMatchesSearch,
  formatRelativeTimezoneCode,
  getClockDateTime,
  getClockPrimaryName,
  getRelativeTimezoneDeltas,
  getTimezoneCode,
  getZoneCodes,
  resolveTimezoneQuery,
} from "../lib/time";

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

function computeGroupOrder(
  itemIds: string[],
  selectedIds: Set<string>,
  activeId: string,
  fromIndex: number,
  toIndex: number,
): string[] {
  const picked = itemIds
    .map((id, index) => ({ id, index }))
    .filter((entry) => selectedIds.has(entry.id));

  if (!selectedIds.has(activeId) || picked.length < 2) {
    return arrayMove(itemIds, fromIndex, toIndex);
  }

  const delta = toIndex - fromIndex;
  const n = itemIds.length;

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
  const rest = itemIds.filter((id) => !selectedIds.has(id));
  let restIndex = 0;
  for (let i = 0; i < n; i += 1) {
    if (!placed[i]) {
      placed[i] = rest[restIndex];
      restIndex += 1;
    }
  }
  return placed as string[];
}

function createGroupSortingStrategy(itemIds: string[], selectedIds: Set<string>, activeId: string | null): SortingStrategy {
  const selectedItemCount = itemIds.filter((id) => selectedIds.has(id)).length;

  return (args) => {
    if (!activeId || selectedItemCount < 2 || !selectedIds.has(activeId)) {
      return rectSortingStrategy(args);
    }

    const { rects, activeIndex, overIndex, index } = args;
    if (
      activeIndex < 0 || activeIndex >= itemIds.length ||
      overIndex < 0 || overIndex >= itemIds.length ||
      index < 0 || index >= itemIds.length ||
      !rects[index]
    ) {
      return null;
    }

    const newOrder = computeGroupOrder(itemIds, selectedIds, activeId, activeIndex, overIndex);
    const newIndex = newOrder.indexOf(itemIds[index]);
    if (newIndex === index) {
      return null;
    }

    const newRect = newIndex >= 0 && newIndex < rects.length ? rects[newIndex] : null;
    if (!newRect) {
      return null;
    }

    return {
      x: newRect.left - rects[index].left,
      y: newRect.top - rects[index].top,
      scaleX: 1,
      scaleY: 1,
    };
  };
}

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
  const [coDraggingIds, setCoDraggingIds] = useState<Set<string>>(() => new Set());
  const [flipDeltas, setFlipDeltas] = useState<Map<string, { x: number; y: number }> | null>(null);
  const tileNodes = useRef(new Map<string, HTMLElement>());
  const participatingDragIds = useRef(new Set<string>());
  const dragDelta = useRef({ x: 0, y: 0 });
  const flipFirstRects = useRef<Map<string, DOMRect> | null>(null);
  const registerTileNode = useCallback((id: string, node: HTMLElement | null) => {
    if (node) {
      tileNodes.current.set(id, node);
    } else {
      tileNodes.current.delete(id);
    }
  }, []);
  const snapshotTileRects = useCallback(() => {
    const rects = new Map<string, DOMRect>();
    tileNodes.current.forEach((node, id) => rects.set(id, node.getBoundingClientRect()));
    flipFirstRects.current = rects;
  }, []);
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
  const resolvedTimezoneQuery = resolveTimezoneQuery(normalizedSearchQuery);
  const relativeTimezoneDeltas = resolvedTimezoneQuery
    ? getRelativeTimezoneDeltas(
        board.clocks.map((clock) => clock.timezone),
        now,
        resolvedTimezoneQuery.offset,
        undefined,
        resolvedTimezoneQuery.label,
      )
    : [];
  const relativeTimezoneDeltaById = new Map(
    board.clocks.map((clock, index) => [clock.id, relativeTimezoneDeltas[index]]),
  );
  const visibleClocks = (() => {
    if (!normalizedSearchQuery) {
      return board.clocks;
    }
    if (!resolvedTimezoneQuery) {
      return board.clocks.filter((clock) => clockMatchesSearch(clock, now, normalizedSearchQuery, resolvedTimezoneQuery));
    }

    const sortedUnpinnedClocks = board.clocks
      .map((clock, index) => ({ clock, index }))
      .filter(({ clock }) => !clock.pinned)
      .sort((left, right) =>
        (relativeTimezoneDeltas[left.index] ?? 0) - (relativeTimezoneDeltas[right.index] ?? 0) ||
        left.index - right.index,
      )
      .map(({ clock }) => clock);

    return board.clocks.map((clock) =>
      clock.pinned ? clock : (sortedUnpinnedClocks.shift() ?? clock),
    );
  })();
  const movableClockIds = visibleClocks.filter((clock) => !clock.pinned).map((clock) => clock.id);
  const sortableItems = movableClockIds;
  const selectedIdSet = useMemo(() => new Set(selectedClockIds), [selectedClockIds]);
  const sortingStrategy = useMemo(
    () => createGroupSortingStrategy(sortableItems, selectedIdSet, activeDragId),
    [sortableItems, selectedIdSet, activeDragId],
  );
  useVelocityRotation(activeDragId !== null, dragDelta, participatingDragIds, tileNodes);

  useLayoutEffect(() => {
    const firstRects = flipFirstRects.current;
    if (!firstRects) {
      return;
    }

    flipFirstRects.current = null;
    const deltas = new Map<string, { x: number; y: number }>();
    firstRects.forEach((first, id) => {
      const node = tileNodes.current.get(id);
      if (!node) {
        return;
      }

      const last = node.getBoundingClientRect();
      const x = first.left - last.left;
      const y = first.top - last.top;
      if (Math.abs(x) >= 0.5 || Math.abs(y) >= 0.5) {
        deltas.set(id, { x, y });
      }
    });
    if (deltas.size > 0) {
      setFlipDeltas(deltas);
    }
  });

  useEffect(() => {
    if (!flipDeltas) {
      return;
    }

    // Clear on the next frame, so the browser paints the inverted position before
    // the tiles transition to their slots. The timeout is a floor, not a duplicate:
    // where rAF is starved (hidden tab, some embedded webviews) the tiles would
    // otherwise stay stuck at the inverted offset instead of animating home.
    const frameId = window.requestAnimationFrame(() => setFlipDeltas(null));
    const timeoutId = window.setTimeout(() => setFlipDeltas(null), 64);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [flipDeltas]);

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
    snapshotTileRects();
    clearDragNodeStyles();
    const { active, over } = event;
    setActiveDragId(null);
    setCoDraggingIds(new Set());

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

    const reorderedMovableIds = computeGroupOrder(
      movableClockIds,
      selectedIdSet,
      activeClock.id,
      oldIndex,
      newIndex,
    );

    const nextClockIds = board.clocks.map((clock) => {
      if (clock.pinned || !movableClockIds.includes(clock.id)) {
        return clock.id;
      }

      return reorderedMovableIds.shift() ?? clock.id;
    });
    onReorderClocks(nextClockIds);
  }

  function clearDragNodeStyles() {
    participatingDragIds.current.forEach((id) => {
      const node = tileNodes.current.get(id);
      node?.style.removeProperty("transform");
      node?.style.removeProperty("--drag-rotation");
    });
    participatingDragIds.current.clear();
    dragDelta.current = { x: 0, y: 0 };
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
        const activeId = String(active.id);
        const nextCoDraggingIds = selectedIdSet.has(activeId)
          ? new Set(movableClockIds.filter((id) => id !== activeId && selectedIdSet.has(id)))
          : new Set<string>();
        participatingDragIds.current = new Set([activeId, ...nextCoDraggingIds]);
        dragDelta.current = { x: 0, y: 0 };
        setCoDraggingIds(nextCoDraggingIds);
        setActiveDragId(activeId);
      }}
      onDragMove={(event) => {
        dragDelta.current = event.delta;
        participatingDragIds.current.forEach((id) => {
          if (id === String(event.active.id)) {
            return;
          }

          const node = tileNodes.current.get(id);
          if (node) {
            node.style.transform = `translate3d(${event.delta.x}px, ${event.delta.y}px, 0)`;
          }
        });
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        snapshotTileRects();
        clearDragNodeStyles();
        setActiveDragId(null);
        setCoDraggingIds(new Set());
      }}
    >
      <SortableContext items={sortableItems} strategy={sortingStrategy}>
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
            const deltaMinutes = relativeTimezoneDeltaById.get(clock.id) ?? 0;
            // countryLabel carries a " +4" suffix meaning "and 4 more countries",
            // which reads fine in the timezone picker but not here: sitting beside a
            // code like UTC+7 it looks like part of an offset. Show the primary
            // country only. The picker keeps the full label.
            const timezoneSubheaderOverride = resolvedTimezoneQuery
              ? getTimezoneCountryLabel(clock.timezone).replace(/\s\+\d+$/, "") || undefined
              : undefined;
            let timezoneCodeOverride: string | undefined;
            if (resolvedTimezoneQuery) {
              timezoneCodeOverride = deltaMinutes === 0
                ? (getZoneCodes(clock.timezone, now).has(resolvedTimezoneQuery.label) ||
                    /^UTC[+-]/.test(resolvedTimezoneQuery.label))
                  ? resolvedTimezoneQuery.label
                  : undefined
                : formatRelativeTimezoneCode(resolvedTimezoneQuery.label, deltaMinutes);
            }
            return (
            <SortableClockTile
              key={clock.id}
              clock={clock}
              flipDelta={flipDeltas?.get(clock.id) ?? null}
              registerTileNode={registerTileNode}
              coDragging={coDraggingIds.has(clock.id)}
            >
              <ClockTile
                clock={clock}
                now={now}
                theme={theme}
                timezoneCodeOverride={timezoneCodeOverride}
                timezoneSubheaderOverride={timezoneSubheaderOverride}
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

type SortableClockTileProps = {
  clock: Clock;
  children: ReactNode;
  coDragging: boolean;
  flipDelta: { x: number; y: number } | null;
  registerTileNode: (id: string, node: HTMLElement | null) => void;
};

function SortableClockTile({ clock, children, coDragging, flipDelta, registerTileNode }: SortableClockTileProps) {
  if (clock.pinned) {
    return <PinnedClockTile clock={clock} flipDelta={flipDelta} registerTileNode={registerTileNode}>{children}</PinnedClockTile>;
  }

  return <MovableClockTile clock={clock} coDragging={coDragging} flipDelta={flipDelta} registerTileNode={registerTileNode}>{children}</MovableClockTile>;
}

function PinnedClockTile({ clock, children, flipDelta, registerTileNode }: Pick<SortableClockTileProps, "clock" | "children" | "flipDelta" | "registerTileNode">) {
  const { setNodeRef, transform, transition } = useSortable({
    id: clock.id,
    disabled: { draggable: true, droppable: true },
    transition: {
      duration: 260,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    },
  });
  const setTileNodeRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    registerTileNode(clock.id, node);
  }, [clock.id, registerTileNode, setNodeRef]);
  // dnd-kit's getTransition disabledTransition branch returns a truthy 0ms value.
  const safeTransition = transition && /\b0ms\b/.test(transition)
    ? "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)"
    : transition ?? "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)";
  const style = {
    transform: flipDelta
      ? `translate3d(${flipDelta.x}px, ${flipDelta.y}px, 0)`
      : CSS.Transform.toString(transform),
    transition: flipDelta ? "none" : safeTransition,
  } as CSSProperties;

  return (
    <div
      ref={setTileNodeRef}
      className="sortable-clock sortable-clock--pinned sortable-clock--search-transition"
      style={style}
      aria-disabled
    >
      {children}
    </div>
  );
}

function MovableClockTile({ clock, children, coDragging, flipDelta, registerTileNode }: SortableClockTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: clock.id,
    animateLayoutChanges: () => false,
    transition: {
      duration: 260,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    },
  });
  const setTileNodeRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    registerTileNode(clock.id, node);
  }, [clock.id, registerTileNode, setNodeRef]);
  const transformValue = flipDelta
    ? `translate3d(${flipDelta.x}px, ${flipDelta.y}px, 0)`
    : CSS.Transform.toString(transform);
  // dnd-kit's getTransition disabledTransition branch returns a truthy 0ms value.
  const safeTransition = transition && /\b0ms\b/.test(transition)
    ? "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)"
    : transition ?? "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)";
  const style = {
    transition: flipDelta
      ? "none"
      : coDragging
        ? "none"
        : isDragging
          ? undefined
          : safeTransition,
  } as CSSProperties;
  if (!coDragging) {
    style.transform = transformValue;
  }
  const className = [
    "sortable-clock",
    isDragging ? "sortable-clock--dragging" : "",
    coDragging ? "sortable-clock--co-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");


  return (
    <div
      ref={setTileNodeRef}
      className={className}
      style={style}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

function useVelocityRotation(
  isDragging: boolean,
  dragDelta: { current: { x: number; y: number } },
  participatingDragIds: { current: Set<string> },
  tileNodes: { current: Map<string, HTMLElement> },
) {
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);
  const lastMotion = useRef({ time: 0, x: 0 });

  useEffect(() => {
    if (!isDragging) {
      lastMotion.current = { time: 0, x: 0 };
      targetRotation.current = 0;
      currentRotation.current = 0;
      return;
    }

    let frameId = 0;
    lastMotion.current = { time: Date.now(), x: dragDelta.current.x };

    function tick() {
      const x = dragDelta.current.x;
      const previous = lastMotion.current;
      if (x !== previous.x) {
        const now = Date.now();
        const deltaX = x - previous.x;
        const deltaTime = Math.max(16, now - previous.time);
        targetRotation.current = Math.max(-6, Math.min(6, (deltaX / deltaTime) * 86));
        lastMotion.current = { time: now, x };
      }

      targetRotation.current *= 0.9;
      currentRotation.current += (targetRotation.current - currentRotation.current) * 0.18;
      const nextRotation = Math.abs(currentRotation.current) < 0.04 ? 0 : currentRotation.current;
      participatingDragIds.current.forEach((id) => {
        tileNodes.current.get(id)?.style.setProperty("--drag-rotation", `${nextRotation}deg`);
      });
      frameId = window.requestAnimationFrame(tick);
    }

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [dragDelta, isDragging, participatingDragIds, tileNodes]);
}
