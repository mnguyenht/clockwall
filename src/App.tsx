import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { AppControls } from "./components/AppControls";
import { ClockFormDialog } from "./components/ClockFormDialog";
import { ClockWall } from "./components/ClockWall";
import { SelectionBar } from "./components/SelectionBar";
import type { ClockSortDirection, ClockSortKey } from "./components/SortMenu";
import { getTimezoneLabel } from "./data/timezones";
import { useAppState } from "./hooks/useAppState";
import { useNow } from "./hooks/useNow";
import { getAvailabilityDurationMinutes, getClockDateTime } from './lib/time';
import type { Clock } from "./types";

// Pre-2026-09 contrast palette kept for one-line revert.
export const legacyDigitalContrastPresets: Record<string, { time: string; indicator: string }> = {
  "#21917e": { time: "#8ff2df", indicator: "#38c99d" },
  "#2d8ca4": { time: "#92e7f5", indicator: "#36b9d8" },
  "#4d74b8": { time: "#adcaff", indicator: "#6d95e8" },
  "#7b6cc4": { time: "#d4c2ff", indicator: "#a88be8" },
  "#b85f7d": { time: "#f4b8cc", indicator: "#e97399" },
  "#a9832f": { time: "#f5d77d", indicator: "#dda83e" },
};

const digitalContrastPresets: Record<string, { time: string; indicator: string }> = {
  "#17c1a0": { time: "#8ff2df", indicator: "#38d9b4" },
  "#22b8d8": { time: "#9be9f7", indicator: "#45c9e6" },
  "#5b8cff": { time: "#c2d6ff", indicator: "#7fa5ff" },
  "#a06bff": { time: "#ddc9ff", indicator: "#b98cff" },
  "#ff5f9e": { time: "#ffc2d9", indicator: "#ff7fb0" },
  "#ffb224": { time: "#ffe0a3", indicator: "#ffc44d" },
};

function getDigitalContrast(glow: string) {
  return digitalContrastPresets[glow.toLowerCase()] ?? {
    time: "#8ff2df",
    indicator: "#38d9b4",
  };
}

const TOAST_DURATION_MS = 6200;

function sortedClockIds(clocks: Clock[], key: ClockSortKey, direction: ClockSortDirection, now: Date) {
  const sortedUnpinnedClocks = clocks.filter((clock) => !clock.pinned);
  sortedUnpinnedClocks.sort((left, right) => {
    if (key === "secondaryName") {
      if (!left.secondaryName && !right.secondaryName) {
        return 0;
      }
      if (!left.secondaryName) {
        return 1;
      }
      if (!right.secondaryName) {
        return -1;
      }

      const comparison = left.secondaryName.localeCompare(right.secondaryName, undefined, { sensitivity: "base" });
      return direction === "ascending" ? comparison : -comparison;
    }

    if (key === "locationName") {
      const comparison = left.locationName.localeCompare(right.locationName, undefined, { sensitivity: "base" });
      return direction === "ascending" ? comparison : -comparison;
    }

    const leftDateTime = getClockDateTime(now, left.timezone);
    const rightDateTime = getClockDateTime(now, right.timezone);
    const comparison = leftDateTime.hour * 60 + leftDateTime.minute - (rightDateTime.hour * 60 + rightDateTime.minute);
    return direction === "ascending" ? comparison : -comparison;
  });

  return clocks.map((clock) =>
    clock.pinned ? clock.id : (sortedUnpinnedClocks.shift()?.id ?? clock.id),
  );
}

export function App() {
  const now = useNow();
  const shouldReduceMotion = useReducedMotion();
  const [clockDialogOpen, setClockDialogOpen] = useState(false);
  const [editingClock, setEditingClock] = useState<Clock | null>(null);
  const [selectedClockIds, setSelectedClockIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: ReactNode } | null>(null);
  const [preSortClockIds, setPreSortClockIds] = useState<string[] | null>(null);
  const [activeSort, setActiveSort] = useState<{
    key: ClockSortKey;
    direction: ClockSortDirection;
  } | null>(null);
  const {
    state,
    activeBoard,
    setActiveBoardId,
    setTheme,
    createBoard,
    deleteBoard,
    setDisplaySeconds,
    setDarkGlow,
    setPrimaryTimezone,
    setAwakeHours,
    setDefaultNameMode,
    addClock,
    updateClock,
    deleteClock,
    deleteClocks,
    duplicateClock,
    reorderClocks,
    moveClockToPosition,
    toggleClockPinned,
    setClocksPinned,
    exportActiveBoardDeck,
    importBoardDeck,
  } = useAppState();
  const pinnedSignature = activeBoard.clocks.map((clock) => `${clock.id}:${clock.pinned ? 1 : 0}`).join(",");
  const theme = state.settings.theme;
  const digitalContrast = getDigitalContrast(state.settings.darkGlow);
  const appStyle = {
    "--light-bg": state.settings.lightBackground,
    "--digital-glow": state.settings.darkGlow,
    "--digital-accent": digitalContrast.time,
    "--digital-indicator": digitalContrast.indicator,
  } as CSSProperties;
  function openAddClock() {
    setEditingClock(null);
    setClockDialogOpen(true);
  }

  function openEditClock(clock: Clock) {
    setEditingClock(clock);
    setClockDialogOpen(true);
  }

  function toggleClockSelection(clockId: string) {
    setSelectedClockIds((current) =>
      current.includes(clockId) ? current.filter((id) => id !== clockId) : [...current, clockId],
    );
  }

  function sortClocks(key: ClockSortKey, direction: ClockSortDirection) {
    if (preSortClockIds === null) {
      setPreSortClockIds(activeBoard.clocks.map((clock) => clock.id));
    }

    setActiveSort({ key, direction });
    const nextClockIds = sortedClockIds(activeBoard.clocks, key, direction, now);
    reorderClocks(nextClockIds);
  }

  function revertSort() {
    setActiveSort(null);
    if (preSortClockIds === null) {
      return;
    }

    reorderClocks(preSortClockIds);
    setPreSortClockIds(null);
  }

  function manuallyReorderClocks(clockIds: string[]) {
    setPreSortClockIds(null);
    setActiveSort(null);
    reorderClocks(clockIds);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isTyping || clockDialogOpen) {
        return;
      }

      if (event.key === "Escape" && selectedClockIds.length > 0) {
        event.preventDefault();
        setSelectedClockIds([]);
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (event.key === "+" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        openAddClock();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clockDialogOpen, selectedClockIds]);

  useEffect(() => {
    setSelectedClockIds([]);
    setPreSortClockIds(null);
    setActiveSort(null);
  }, [activeBoard.id]);

  useEffect(() => {
    if (!activeSort) {
      return;
    }

    const desired = sortedClockIds(activeBoard.clocks, activeSort.key, activeSort.direction, now);
    const current = activeBoard.clocks.map((clock) => clock.id);
    if (desired.join(",") !== current.join(",")) {
      reorderClocks(desired);
    }
  }, [pinnedSignature, activeSort]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  return (
    <LazyMotion features={domAnimation} strict>
      <div
        className={`app-shell app-shell--${theme}`}
        data-bg="dots"
        style={appStyle}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget && selectedClockIds.length > 0) {
            setSelectedClockIds([]);
          }
        }}
      >
      <AppControls
        boards={state.boards}
        activeBoardId={activeBoard.id}
        theme={theme}
        darkGlow={state.settings.darkGlow}
        primaryTimezone={state.settings.primaryTimezone}
        awakeStart={state.settings.awakeStart}
        awakeEnd={state.settings.awakeEnd}
        defaultNameMode={state.settings.defaultNameMode}
        onBoardChange={setActiveBoardId}
        onThemeChange={setTheme}
        onCreateBoard={createBoard}
        onDeleteBoard={deleteBoard}
        displaySeconds={state.settings.displaySeconds}
        onDisplaySecondsChange={setDisplaySeconds}
        onDarkGlowChange={setDarkGlow}
        onPrimaryTimezoneChange={setPrimaryTimezone}
        onAwakeHoursChange={setAwakeHours}
        onDefaultNameModeChange={setDefaultNameMode}
        onAddClock={openAddClock}
        canRevertSort={preSortClockIds !== null}
        onSortClocks={sortClocks}
        onRevertSort={revertSort}
        searchQuery={searchQuery}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        onSearchQueryChange={setSearchQuery}
        onExportBoard={exportActiveBoardDeck}
        onExportStarted={() => {
          setToast({
            title: "Clock export downloaded",
            message: (
              <>
                Your clock export was downloaded. We recommend uploading it to{" "}
                <a href="https://drive.google.com/" target="_blank" rel="noreferrer">
                  Google Drive
                </a>{" "}
                for safekeeping.
              </>
            ),
          });
        }}
        onImportBoard={importBoardDeck}
      />
      <ClockWall
        board={activeBoard}
        theme={theme}
        now={now}
        searchQuery={searchQuery}
        displaySeconds={state.settings.displaySeconds}
        primaryTimezone={state.settings.primaryTimezone}
        awakeHours={{ start: state.settings.awakeStart, end: state.settings.awakeEnd }}
        onEditClock={openEditClock}
        onDuplicateClock={duplicateClock}
        onDeleteClock={deleteClock}
        onToggleClockPinned={toggleClockPinned}
        onReorderClocks={manuallyReorderClocks}
        onMoveClockToPosition={moveClockToPosition}
        selectedClockIds={selectedClockIds}
        onToggleClockSelection={toggleClockSelection}
        onClearSelection={() => setSelectedClockIds([])}
      />
        <AnimatePresence>
          {selectedClockIds.length > 0 ? (
            <SelectionBar
              count={selectedClockIds.length}
              onPin={() => {
                setClocksPinned(selectedClockIds, true);
                setSelectedClockIds([]);
              }}
              onUnpin={() => {
                setClocksPinned(selectedClockIds, false);
                setSelectedClockIds([]);
              }}
              onDelete={() => {
                deleteClocks(selectedClockIds);
                setSelectedClockIds([]);
              }}
              onClear={() => setSelectedClockIds([])}
            />
          ) : null}
        </AnimatePresence>
      <ClockFormDialog
        open={clockDialogOpen}
        clock={editingClock}
        defaultNameMode={state.settings.defaultNameMode}
        onOpenChange={setClockDialogOpen}
        onSave={(values, clockId) => {
          const workHours = values.workHoursEnabled
            ? {
                enabled: true,
                start: values.workHoursStart,
                end: values.workHoursEnd,
                basis: values.workHoursBasis,
              }
            : undefined;
          const clockValues = {
            timezone: values.timezone,
            locationName: getTimezoneLabel(values.timezone),
            secondaryName: values.secondaryName || undefined,
            nameMode: values.nameMode,
            workHours,
          };

          if (getAvailabilityDurationMinutes(workHours) > 720) {
            setToast({
              title: "Long availability window",
              message: "This range is over 12 hours, so clocks show it as Full day.",
            });
          }

          if (clockId) {
            updateClock(clockId, clockValues);
            return;
          }

          addClock(clockValues);
        }}
      />
      {createPortal(
        <div className={`app-toast-layer app-shell--${theme}`} style={appStyle}>
          <AnimatePresence>
            {toast ? (
              <m.div
                className="app-toast app-toast--center"
                role="status"
                aria-live="polite"
                initial={shouldReduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
                transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 620, damping: 30 }}
              >
                <strong>{toast.title}</strong>
                <span>{toast.message}</span>
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>,
        document.body,
      )}
      </div>
    </LazyMotion>
  );
}
