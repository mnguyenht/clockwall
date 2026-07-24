import { useEffect, useState, type CSSProperties } from "react";
import { AppControls } from "./components/AppControls";
import { ClockFormDialog } from "./components/ClockFormDialog";
import { ClockWall } from "./components/ClockWall";
import { getTimezoneLabel } from "./data/timezones";
import { useAppState } from "./hooks/useAppState";
import { useNow } from "./hooks/useNow";
import { getAvailabilityDurationMinutes } from "./lib/time";
import type { Clock } from "./types";

const digitalContrastPresets: Record<string, { time: string; indicator: string }> = {
  "#21917e": { time: "#8ff2df", indicator: "#38c99d" },
  "#2d8ca4": { time: "#92e7f5", indicator: "#36b9d8" },
  "#4d74b8": { time: "#adcaff", indicator: "#6d95e8" },
  "#7b6cc4": { time: "#d4c2ff", indicator: "#a88be8" },
  "#b85f7d": { time: "#f4b8cc", indicator: "#e97399" },
  "#a9832f": { time: "#f5d77d", indicator: "#dda83e" },
};

function getDigitalContrast(glow: string) {
  return digitalContrastPresets[glow.toLowerCase()] ?? {
    time: "#8ff2df",
    indicator: "#38c99d",
  };
}

export function App() {
  const now = useNow();
  const [clockDialogOpen, setClockDialogOpen] = useState(false);
  const [editingClock, setEditingClock] = useState<Clock | null>(null);
  const [selectedClockIds, setSelectedClockIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);
  const {
    state,
    activeBoard,
    setActiveBoardId,
    setTheme,
    createBoard,
    setDisplaySeconds,
    setDarkGlow,
    setPrimaryTimezone,
    addClock,
    updateClock,
    deleteClock,
    duplicateClock,
    reorderClocks,
    moveClockToPosition,
    toggleClockPinned,
    exportActiveBoardDeck,
    importBoardDeck,
  } = useAppState();
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isTyping || clockDialogOpen) {
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
  }, [clockDialogOpen]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  return (
    <div className={`app-shell app-shell--${theme}`} style={appStyle}>
      <AppControls
        boards={state.boards}
        activeBoardId={activeBoard.id}
        theme={theme}
        darkGlow={state.settings.darkGlow}
        primaryTimezone={state.settings.primaryTimezone}
        onBoardChange={setActiveBoardId}
        onThemeChange={setTheme}
        onCreateBoard={createBoard}
        displaySeconds={state.settings.displaySeconds}
        onDisplaySecondsChange={setDisplaySeconds}
        onDarkGlowChange={setDarkGlow}
        onPrimaryTimezoneChange={setPrimaryTimezone}
        onAddClock={openAddClock}
        searchQuery={searchQuery}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        onSearchQueryChange={setSearchQuery}
        onExportBoard={exportActiveBoardDeck}
        onImportBoard={importBoardDeck}
      />
      <ClockWall
        board={activeBoard}
        theme={theme}
        now={now}
        searchQuery={searchQuery}
        displaySeconds={state.settings.displaySeconds}
        primaryTimezone={state.settings.primaryTimezone}
        onEditClock={openEditClock}
        onDuplicateClock={duplicateClock}
        onDeleteClock={deleteClock}
        onToggleClockPinned={toggleClockPinned}
        onReorderClocks={reorderClocks}
        onMoveClockToPosition={moveClockToPosition}
        selectedClockIds={selectedClockIds}
        onToggleClockSelection={toggleClockSelection}
      />
      <ClockFormDialog
        open={clockDialogOpen}
        clock={editingClock}
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
            nameMode: "location" as const,
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
      {toast ? (
        <div className="app-toast app-toast--center" role="status" aria-live="polite">
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </div>
      ) : null}
    </div>
  );
}
