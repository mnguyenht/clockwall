import type { AppState } from "../types";

export const defaultState: AppState = {
  activeBoardId: "work",
  settings: {
    displaySeconds: true,
    lightBackground: "#f7f6f2",
    darkGlow: "#17c1a0",
    primaryTimezone: "Asia/Bangkok",
    theme: "hotel-analog",
    awakeStart: "06:00",
    awakeEnd: "22:00",
    defaultNameMode: "location",
  },
  boards: [
    {
      id: "work",
      name: "Work",
      clocks: [
        {
          id: "clock-new-york",
          timezone: "America/New_York",
          locationName: "New York",
          secondaryName: "Design Team",
          nameMode: "location",
        },
        {
          id: "clock-london",
          timezone: "Europe/London",
          locationName: "London",
          secondaryName: "Product",
          nameMode: "location-code",
        },
        {
          id: "clock-bangkok",
          timezone: "Asia/Bangkok",
          locationName: "Bangkok",
          secondaryName: "Home Base",
          nameMode: "location",
        },
        {
          id: "clock-tokyo",
          timezone: "Asia/Tokyo",
          locationName: "Tokyo",
          secondaryName: "Akira / Client",
          nameMode: "location-code",
        },
      ],
    },
    {
      id: "family",
      name: "Family",
      clocks: [
        {
          id: "clock-los-angeles",
          timezone: "America/Los_Angeles",
          locationName: "Los Angeles",
          secondaryName: "Sister",
          nameMode: "location",
        },
        {
          id: "clock-hanoi",
          timezone: "Asia/Ho_Chi_Minh",
          locationName: "Hanoi",
          secondaryName: "Parents",
          nameMode: "location",
        },
      ],
    },
    {
      id: "friends",
      name: "Friends",
      clocks: [
        {
          id: "clock-sydney",
          timezone: "Australia/Sydney",
          locationName: "Sydney",
          secondaryName: "Mina",
          nameMode: "location-code",
        },
        {
          id: "clock-berlin",
          timezone: "Europe/Berlin",
          locationName: "Berlin",
          secondaryName: "D&D Group",
          nameMode: "location",
        },
      ],
    },
  ],
};
