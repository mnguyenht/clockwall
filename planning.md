# Clock Wall App Planning

## Product Vision

Build a personal, curated wall of live clocks for any timezones the user cares about. The app should feel like a clean hotel clock wall mixed with a lightweight productivity dashboard: focused on clocks first, with just enough controls to manage boards, themes, labels, and ordering.

The product should not feel like a dense admin dashboard. It should avoid heavy bars, side panels, and boxed layouts around the whole page. The clocks are the main interface.

The larger direction is a personal time command center: a place where the user can quickly understand who is awake, who is working, what time it is for each group, and where attention should go next. It should stay calm and visual instead of becoming a calendar clone. The wall should answer "what time is it there, and is this a good time?" at a glance.

## Core Experience

The main screen is a scrolling clock wall.

- Clocks behave like ordered list items, not freely positioned canvas objects.
- The wall lays clocks out in centered rows.
- When a row is full, clocks wrap to the next row.
- The final row should also stay centered horizontally.
- Users drag and drop clocks to reorder them.
- Reordering changes the array order, which determines visual layout.
- The page scrolls vertically as more clocks are added.

This is technically a sortable responsive wall, even if the app may feel canvas-like.

The experience should feel tactile:

- Dragging a clock should feel like moving a physical card or clock object.
- Dropping a clock should smoothly settle it into its ordered position.
- Pinned clocks should feel anchored and should not move during drag interactions.
- Right-click/context actions should be the main way to edit, duplicate, pin, move, delete, or adjust availability.
- The add flow should feel like a clean search box, not a form-heavy admin panel.

## Default Boards

For now, ship with three boards:

- Work
- Family
- Friends

Boards are selected from a simple dropdown in the top-left corner. The dropdown should always include a "Create new board" option at the bottom.

Each board owns:

- Its name
- Its ordered list of clocks

The app owns global preferences such as theme, main timezone, seconds visibility, and digital glow color. Spaces/boards should not store theme info.

## Minimal UI Placement

Keep the interface sparse and spatial.

- Top-left: board dropdown
- Top-right: small theme toggle and possibly settings later
- Bottom-center: circular add button
- Keyboard shortcut: add clock with a simple hotkey, such as `+` or `A`
- Clock actions: edit, duplicate, and delete should appear only on hover, focus, or selection

Avoid permanent top bars, sidebars, large panels, or visible instructional text. Use minimal buttons in useful locations.

## Clock Display

Each clock should support:

- Live local time for its timezone
- Primary name
- Secondary name
- Date or day indicator
- AM/PM or day/night scanning
- Availability/work-hours status

Primary name can toggle between:

- Location, for example `Tokyo`
- Location plus timezone code, for example `Tokyo JST`
- Timezone code only, for example `JST`

Secondary name is user-defined and separate from the primary name.

Examples:

```txt
Tokyo JST
Akira / Client
```

```txt
New York
Design Team
```

Internally, always store full IANA timezone identifiers such as `Asia/Tokyo` or `America/New_York`. Timezone codes are display-only because abbreviations like `CST` can be ambiguous.

Secondary names should stay lightweight and personal. Examples include team names, client names, friend names, family labels, or "main office."

## Themes

Start with two toggle themes. Theme is global app state, not board state.

### White Hotel Analog

- Light background
- Analog clock faces
- Calm hotel-lobby feeling
- Minimal, polished labels
- Soft contrast
- Clocks should feel like curated wall objects
- The whole page is the slate; do not put analog clocks inside individual cards or visible clock containers
- Clock faces should be bright white and precise
- Availability should be shown on the clock face when possible
- PM clocks can use a night-blue center/seconds accent; AM can keep the red accent

### Dark Digital Dashboard

- Dark background
- Digital time display
- Strong contrast
- More operational feel
- Useful for work, monitoring, and quick scanning
- Cards should feel like clean glass reflecting the dark page, not glossy gradient cards
- Digital glow should come from a limited curated palette, not arbitrary color picking
- Dragged transparent cards should avoid confusing overlap, either by becoming more opaque or increasing blur while dragged

Theme affects the clock presentation heavily. The surrounding app controls should remain minimal in both themes.

## Add Clock Flow

Adding a clock should be fast.

Entry points:

- Circular `+` button at the bottom-right
- Keyboard shortcut

The add/edit flow should support:

- Search for city or timezone in a single field
- Show timezone suggestions only while the user is typing or focused, similar to a clean search autocomplete
- Choose timezone
- Set optional secondary name
- Set availability window
- Choose whether availability is based on the clock timezone or the main timezone
- Save to current board

Editing an existing clock should use the same form.

Avoid secondary fields that are unclear. Primary location naming should be inferred from timezone data where possible, with deeper customization living in settings only if it becomes necessary.

## Productivity Features

These are good candidates once the core wall works:

- Work-hours window per clock
- Highlight clocks currently inside work hours
- Main timezone setting as the central "truth" clock for availability calculations
- Awake/sleep-aware availability visualization
- Availability labels that do not push or re-center primary clock text
- Meeting-time preview across all clocks
- "Now plus X hours" preview
- Pin/favorite clocks
- Duplicate clocks
- Import/export board JSON
- Multiple clock sizes
- Search/jump to clock
- Search/filter clocks by location, timezone code, or secondary name
- Fast sorting or narrowing when many clocks exist

Avoid adding these before the core clock wall, board dropdown, themes, add/edit flow, and drag-and-drop ordering feel good.

## Availability Vision

Availability should help users quickly answer whether a timezone is usable right now. It should not turn the clock wall into a schedule editor.

Each clock can define an available time window. That window can be interpreted in either:

- The clock's own timezone
- The user's main timezone, set in settings

The analog display should use the clock face itself as the primary visualization:

- Availability inside normal awake hours should render as a filled green sector.
- Availability outside normal awake hours should render as a transparent outlined sector.
- The awake/sleep reference should replace the older AM/PM split. A reasonable default awake window is around `06:00` to `22:00`, with room to make it configurable later.
- If a user selects a window longer than 12 hours, avoid confusing full-ring overlap. Prefer a title/tag treatment such as "wide window" or "mostly available" rather than adding another ring around the clock.

Digital displays should show availability without shifting the time:

- If currently available, place a small status/tag under the time text, anchored to the left edge of the time block.
- The tag must be absolutely positioned so it does not push, compress, or re-center the time.
- For light analog mode, use a compact green radio-style indicator instead of a large text chip.

## Recommended Tech Stack

Use:

- React
- TypeScript
- Webpack for this Windows environment
- Tailwind CSS
- shadcn/ui selectively
- `@dnd-kit/sortable` for drag-and-drop ordering
- Luxon for timezone handling
- LocalStorage for initial persistence

Vite was the original recommendation, but this local Windows environment hit `spawn EPERM` issues with Vite/esbuild. Webpack is the current working development path.

Use shadcn/ui for primitives only:

- Dropdown menu
- Dialog
- Command/search picker
- Button
- Toggle or switch
- Input
- Tooltip

Do not let shadcn define the whole app layout. The visual identity should come from custom clock components and the centered wall.

## Data Model

```ts
type ThemeMode = "hotel-analog" | "dark-digital";

type ClockNameMode = "location" | "location-code" | "code";

type Clock = {
  id: string;
  timezone: string;
  locationName: string;
  secondaryName?: string;
  nameMode: ClockNameMode;
  color?: string;
  pinned?: boolean;
  workHours?: {
    enabled: boolean;
    start: string;
    end: string;
    basis?: "clock" | "primary";
  };
};

type Board = {
  id: string;
  name: string;
  clocks: Clock[];
};

type AppState = {
  activeBoardId: string;
  boards: Board[];
  settings: {
    theme: ThemeMode;
    showSeconds: boolean;
    primaryTimezone: string;
    digitalGlow: string;
  };
};
```

The order of `board.clocks` is the source of truth for layout order.

Pinned clocks stay at the front of the wall and are excluded from drag sorting. They can still be moved through context-menu actions such as "move to position."

## Layout Notes

The clock wall can be implemented with flex wrapping:

```css
.clock-wall {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
}
```

Clock items should use stable dimensions so drag states, hover controls, and text changes do not shift the layout unexpectedly.

## V1 Build Plan

1. Scaffold React, TypeScript, Webpack, Tailwind, and shadcn primitives.
2. Create initial app state with Work, Family, and Friends boards.
3. Render a centered responsive clock wall.
4. Add live time updates using Luxon.
5. Build the white hotel analog clock component.
6. Build the dark digital dashboard clock component.
7. Add top-left board dropdown with "Create new board" at the bottom.
8. Add top-right theme toggle.
9. Add bottom-center circular add button.
10. Add add/edit clock dialog.
11. Add drag-and-drop reordering with `@dnd-kit/sortable`.
12. Persist boards and active board to LocalStorage.
13. Add add-clock keyboard shortcut.

## V1.5 Polish Plan

1. Remove browser autocomplete/suggestions from all app inputs.
2. Finish awake/sleep-based availability visualization.
3. Add wide-window title/tag treatment for availability windows longer than 12 hours.
4. Move digital availability status under the time text without affecting layout.
5. Add clock search/filter by location, timezone code, and secondary name.
6. Tune dark digital card glass so it feels transparent and useful without creating overlap confusion.
7. Keep theme transitions as color fades so toggles do not flash the user.
8. Continue alignment passes on menus, chips, toggles, labels, and clock centers.

## Design Principles

- Clocks are the product, not the chrome around them.
- Keep global controls minimal and spatially placed.
- Prefer calm, polished interactions over lots of visible configuration.
- The wall should feel curated and personal.
- The first version should be local-first and fast.
- Add productivity features only after the wall feels excellent.
