export type ThemeMode = "hotel-analog" | "dark-digital";

export type ClockNameMode = "location" | "location-code" | "code";

export type Clock = {
  id: string;
  timezone: string;
  locationName: string;
  secondaryName?: string;
  nameMode: ClockNameMode;
  pinned?: boolean;
  color?: string;
  workHours?: {
    enabled: boolean;
    start: string;
    end: string;
    basis?: "clock" | "primary";
  };
};

export type Board = {
  id: string;
  name: string;
  clocks: Clock[];
};

export type BoardDeckExport = {
  app: "clockwall";
  version: 1;
  exportedAt: string;
  board: {
    name: string;
    clocks: Clock[];
  };
};

export type AppState = {
  activeBoardId: string;
  boards: Board[];
  settings: {
    displaySeconds: boolean;
    lightBackground: string;
    darkGlow: string;
    primaryTimezone: string;
    theme: ThemeMode;
  };
};
