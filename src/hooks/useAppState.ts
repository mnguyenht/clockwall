import { useEffect, useMemo, useState } from "react";
import { defaultState } from "../data/defaultState";
import type { AppState, BoardDeckExport, Clock, ThemeMode } from "../types";

const STORAGE_KEY = "clockwall:v1";

function readInitialState(): AppState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultState;
    }

    const parsed = JSON.parse(stored) as AppState;
    if (!parsed.activeBoardId || !Array.isArray(parsed.boards)) {
      return defaultState;
    }

    const legacyActiveBoard = parsed.boards.find((board) => board.id === parsed.activeBoardId) as
      | (AppState["boards"][number] & { theme?: ThemeMode })
      | undefined;
    const legacyTheme = parsed.settings?.theme ?? legacyActiveBoard?.theme;
    const boards = parsed.boards.map((board) => {
      const boardWithoutTheme = { ...(board as AppState["boards"][number] & { theme?: ThemeMode }) };
      delete boardWithoutTheme.theme;
      return boardWithoutTheme;
    });

    return {
      ...defaultState,
      ...parsed,
      boards,
      settings: {
        ...defaultState.settings,
        ...parsed.settings,
        theme: legacyTheme ?? defaultState.settings.theme,
      },
    };
  } catch {
    return defaultState;
  }
}

function isClockNameMode(value: unknown): value is Clock["nameMode"] {
  return value === "location" || value === "location-code" || value === "code";
}

function isWorkHoursBasis(value: unknown): value is NonNullable<Clock["workHours"]>["basis"] {
  return value === "clock" || value === "primary" || value === undefined;
}

function sanitizeImportedClock(value: unknown): Clock | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const clock = value as Partial<Clock>;
  if (
    typeof clock.timezone !== "string" ||
    typeof clock.locationName !== "string" ||
    !isClockNameMode(clock.nameMode)
  ) {
    return null;
  }

  const workHours =
    clock.workHours &&
    typeof clock.workHours === "object" &&
    typeof clock.workHours.enabled === "boolean" &&
    typeof clock.workHours.start === "string" &&
    typeof clock.workHours.end === "string" &&
    isWorkHoursBasis(clock.workHours.basis)
      ? {
          enabled: clock.workHours.enabled,
          start: clock.workHours.start,
          end: clock.workHours.end,
          basis: clock.workHours.basis,
        }
      : undefined;

  return {
    id: `clock-${crypto.randomUUID()}`,
    timezone: clock.timezone,
    locationName: clock.locationName,
    secondaryName: typeof clock.secondaryName === "string" ? clock.secondaryName : undefined,
    nameMode: clock.nameMode,
    pinned: typeof clock.pinned === "boolean" ? clock.pinned : undefined,
    color: typeof clock.color === "string" ? clock.color : undefined,
    workHours,
  };
}

function parseImportedDeck(raw: string): { name: string; clocks: Clock[] } {
  const parsed = JSON.parse(raw) as Partial<BoardDeckExport>;
  const board = parsed.board;

  if (parsed.app !== "clockwall" || parsed.version !== 1 || !board || typeof board.name !== "string") {
    throw new Error("This does not look like a Clock Wall deck export.");
  }

  if (!Array.isArray(board.clocks)) {
    throw new Error("The deck export is missing its clocks.");
  }

  const clocks = board.clocks.map(sanitizeImportedClock);
  if (clocks.some((clock) => !clock)) {
    throw new Error("One or more clocks in this deck could not be imported.");
  }

  return {
    name: board.name.trim() || "Imported deck",
    clocks: clocks as Clock[],
  };
}

export function useAppState() {
  const [state, setState] = useState<AppState>(readInitialState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeBoard = useMemo(
    () => state.boards.find((board) => board.id === state.activeBoardId) ?? state.boards[0],
    [state.activeBoardId, state.boards],
  );

  function setActiveBoardId(boardId: string) {
    setState((current) => ({ ...current, activeBoardId: boardId }));
  }

  function setTheme(theme: ThemeMode) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        theme,
      },
    }));
  }

  function createBoard(name: string) {
    const id = `board-${crypto.randomUUID()}`;

    setState((current) => ({
      ...current,
      activeBoardId: id,
      boards: [
        ...current.boards,
        {
          id,
          name,
          clocks: [],
        },
      ],
    }));
  }

  function setDisplaySeconds(displaySeconds: boolean) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        displaySeconds,
      },
    }));
  }

  function setLightBackground(lightBackground: string) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        lightBackground,
      },
    }));
  }

  function setDarkGlow(darkGlow: string) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        darkGlow,
      },
    }));
  }

  function setPrimaryTimezone(primaryTimezone: string) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        primaryTimezone,
      },
    }));
  }

  function setAwakeHours(awakeStart: string, awakeEnd: string) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        awakeStart,
        awakeEnd,
      },
    }));
  }

  function addClock(clock: Omit<Clock, "id">) {
    const id = `clock-${crypto.randomUUID()}`;

    setState((current) => ({
      ...current,
      boards: current.boards.map((board) =>
        board.id === current.activeBoardId
          ? {
              ...board,
              clocks: [...board.clocks, { ...clock, id }],
            }
          : board,
      ),
    }));
  }

  function updateClock(clockId: string, clock: Omit<Clock, "id">) {
    setState((current) => ({
      ...current,
      boards: current.boards.map((board) =>
        board.id === current.activeBoardId
          ? {
              ...board,
              clocks: board.clocks.map((item) => (item.id === clockId ? { ...clock, id: clockId, pinned: item.pinned } : item)),
            }
          : board,
      ),
    }));
  }

  function deleteClock(clockId: string) {
    setState((current) => ({
      ...current,
      boards: current.boards.map((board) =>
        board.id === current.activeBoardId
          ? {
              ...board,
              clocks: board.clocks.filter((clock) => clock.id !== clockId),
            }
          : board,
      ),
    }));
  }

  function deleteClocks(clockIds: string[]) {
    const clockIdSet = new Set(clockIds);
    setState((current) => ({
      ...current,
      boards: current.boards.map((board) =>
        board.id === current.activeBoardId
          ? {
              ...board,
              clocks: board.clocks.filter((clock) => !clockIdSet.has(clock.id)),
            }
          : board,
      ),
    }));
  }

  function duplicateClock(clockId: string) {
    setState((current) => ({
      ...current,
      boards: current.boards.map((board) => {
        if (board.id !== current.activeBoardId) {
          return board;
        }

        const sourceIndex = board.clocks.findIndex((clock) => clock.id === clockId);
        const source = board.clocks[sourceIndex];
        if (!source) {
          return board;
        }

        const copy: Clock = {
          ...source,
          id: `clock-${crypto.randomUUID()}`,
          pinned: false,
          secondaryName: source.secondaryName ? `${source.secondaryName} Copy` : "Copy",
        };
        const clocks = [...board.clocks];
        clocks.splice(sourceIndex + 1, 0, copy);

        return { ...board, clocks };
      }),
    }));
  }

  function reorderClocks(clockIds: string[]) {
    setState((current) => ({
      ...current,
      boards: current.boards.map((board) => {
        if (board.id !== current.activeBoardId) {
          return board;
        }

        const clocksById = new Map(board.clocks.map((clock) => [clock.id, clock]));
        const reorderedClocks = clockIds.flatMap((clockId) => {
          const clock = clocksById.get(clockId);
          return clock ? [clock] : [];
        });

        if (reorderedClocks.length !== board.clocks.length) {
          return board;
        }

        return { ...board, clocks: reorderedClocks };
      }),
    }));
  }

  function moveClockToPosition(clockId: string, position: number) {
    setState((current) => ({
      ...current,
      boards: current.boards.map((board) => {
        if (board.id !== current.activeBoardId) {
          return board;
        }

        const currentIndex = board.clocks.findIndex((clock) => clock.id === clockId);
        if (currentIndex === -1) {
          return board;
        }

        const clocks = [...board.clocks];
        const [clock] = clocks.splice(currentIndex, 1);
        const targetIndex = Math.max(0, Math.min(clocks.length, position - 1));
        clocks.splice(targetIndex, 0, clock);

        return { ...board, clocks };
      }),
    }));
  }

  function toggleClockPinned(clockId: string) {
    setState((current) => ({
      ...current,
      boards: current.boards.map((board) => {
        if (board.id !== current.activeBoardId) {
          return board;
        }

        const updatedClocks = board.clocks.map((clock) =>
          clock.id === clockId ? { ...clock, pinned: !clock.pinned } : clock,
        );
        const pinned = updatedClocks.filter((clock) => clock.pinned);
        const unpinned = updatedClocks.filter((clock) => !clock.pinned);

        return { ...board, clocks: [...pinned, ...unpinned] };
      }),
    }));
  }

  function setClocksPinned(clockIds: string[], pinned: boolean) {
    const clockIdSet = new Set(clockIds);
    setState((current) => ({
      ...current,
      boards: current.boards.map((board) => {
        if (board.id !== current.activeBoardId) {
          return board;
        }

        const updatedClocks = board.clocks.map((clock) =>
          clockIdSet.has(clock.id) ? { ...clock, pinned } : clock,
        );
        const pinnedClocks = updatedClocks.filter((clock) => clock.pinned);
        const unpinnedClocks = updatedClocks.filter((clock) => !clock.pinned);

        return { ...board, clocks: [...pinnedClocks, ...unpinnedClocks] };
      }),
    }));
  }

  function exportActiveBoardDeck(): BoardDeckExport {
    return {
      app: "clockwall",
      version: 1,
      exportedAt: new Date().toISOString(),
      board: {
        name: activeBoard.name,
        clocks: activeBoard.clocks,
      },
    };
  }

  function importBoardDeck(raw: string) {
    const deck = parseImportedDeck(raw);
    const id = `board-${crypto.randomUUID()}`;

    setState((current) => ({
      ...current,
      activeBoardId: id,
      boards: [
        ...current.boards,
        {
          id,
          name: deck.name,
          clocks: deck.clocks,
        },
      ],
    }));
  }

  return {
    state,
    activeBoard,
    setActiveBoardId,
    setTheme,
    createBoard,
    setDisplaySeconds,
    setLightBackground,
    setDarkGlow,
    setPrimaryTimezone,
    setAwakeHours,
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
  };
}
