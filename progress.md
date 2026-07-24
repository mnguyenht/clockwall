# Clock Wall Progress

## Current State

- React, TypeScript, Webpack, Babel, and Luxon are scaffolded.
- App state is local-first and persisted in LocalStorage.
- Default boards exist: Work, Family, and Friends.
- The app supports global themes:
  - Hotel Analog
  - Dark Digital
- Theme is stored as an app-level setting instead of on individual boards.
- Clock data uses IANA timezone identifiers internally.
- Clock labels support primary names, secondary names, and timezone-code display modes.
- The wall is an ordered, centered, responsive flex layout.
- Live ticking is implemented.
- Board selection uses a Radix/shadcn-style select.
- New board creation uses an in-app dialog instead of a browser prompt.
- Controls use lucide icons.
- Manrope is loaded locally through `@fontsource/manrope`.
- Add/edit clock dialog is implemented.
- Timezone search supports city names, IANA identifiers, common abbreviations, and offset-style searches such as `GMT-7` / `UTC-7`.
- Timezone search suggestions show current local time for candidate zones.
- Clock primary location is inferred from the selected timezone label.
- Clocks can be edited, duplicated, pinned/unpinned, moved to exact position, and deleted from the right-click context menu.
- Add-clock keyboard shortcuts are implemented with `A` and `+`.
- Active-board search opens from the top-right search button or `/`.
- Search filters clocks by location, secondary name, timezone code, or IANA identifier without mutating stored order.
- Clocks can be dragged to reorder within the active board.
- Reordered clock order is persisted through LocalStorage.
- Pinned clocks move to the front, stay anchored during normal drag sorting, and remain excluded from regular drag movement.
- Shift-click toggles individual clock selection.
- Settings include:
  - Show seconds
  - Main timezone
  - Curated digital glow preset palette
  - Import & Export JSON deck controls
- Settings can export the active board/deck as a serverless JSON file.
- Settings can import a Clock Wall JSON deck as a new local board, preserving clock order, names, availability, pinned state, and other clock metadata.
- App inputs and clock-management forms explicitly disable browser autocomplete/suggestions.

## Clock Display

- Hotel Analog mode renders clocks directly on the page background without individual cards.
- Analog clock faces are bright white with black outer rings and tick marks.
- Analog clocks include softer mini ticks for non-cardinal hours.
- PM analog clocks use a blue second hand and center pin, while AM stays red.
- Analog availability renders on the clock face as a green sector aligned through the tick area.
- Analog availability uses an awake/sleep split with default awake hours from `06:00` to `22:00`.
- Analog availability splits across AM/PM: the current 12-hour half is filled, while the other half is outlined.
- Light analog availability also uses a compact green radio indicator when currently available.
- Availability windows longer than 12 hours use `Full day` language instead of a full analog outer ring.
- Dark Digital mode renders restrained glass cards on a dark background.
- Dark digital availability uses centered status text under the time block without pushing or re-centering the time.
- Dark digital color presets include stronger hard-coded contrast colors for the center time text and availability indicator.
- Dark digital dragged cards become denser and more opaque with stronger blur to reduce overlap confusion.
- Theme backgrounds crossfade between light and dark layers to reduce flashing.

## UI Decisions So Far

- The analog wall should feel like clocks arranged directly on one clean page background.
- Analog clocks should not sit inside individual cards.
- The analog wall container should not have its own visible background, border, or panel treatment.
- The board dropdown should be solid, compact, and matched to its dropdown width.
- Digital clocks should look like restrained glass cards that reflect the dark page, without obvious gradients.
- Day labels are abbreviated, for example `Mon, Jun 15`.
- The add-clock button lives in the bottom-right corner.
- Page scrollbars are hidden.
- Visible clock action buttons were removed; right-click is the action surface.
- Digital cards should read as glass, not glossy panels.
- Availability should be understandable at a glance, but should not turn the app into a dense scheduler.
- Long availability windows should use title/tag treatment instead of a full outer ring.

## Import/Export Deck JSON

- Export is serverless and downloads the active board as a versioned JSON file.
- Exported decks include the board name and ordered clock list.
- Clock JSON includes timezone, location name, secondary name, display mode, pinned state, color, and availability/work-hours metadata.
- Import validates the Clock Wall JSON shape before adding it.
- Imported decks are added as new local boards with fresh local IDs to avoid collisions with existing boards/clocks.
- Import switches to the newly imported board after a successful load.

## Going Live Next

The major V1 and V1.5 feature work is now implemented. The next phase should be launch prep rather than new product scope.

1. Do a full visual QA pass in both Hotel Analog and Dark Digital themes.
2. Test the core flows on a fresh LocalStorage state:
   - Add clock
   - Edit clock
   - Reorder clocks
   - Pin/unpin clocks
   - Move to position
   - Search clocks
   - Create board
   - Export board JSON
   - Import board JSON
3. Verify responsive layout on narrow, medium, and wide windows.
4. Confirm import/export JSON handles bad files gracefully.
5. Decide the hosting target and production path.
6. Run a final production build.
7. Publish the app.

## Post-Launch Ideas

- Add multiple clock sizes.
- Add a meeting-time or "now plus X hours" preview.
- Add configurable awake/sleep hours.
- Add richer work-hours highlighting only if the current availability model proves useful.
- Add a larger timezone dataset if users need more cities than the curated list.

## Verification Notes

- Production builds currently pass with `npm.cmd run build`.
- Latest verification: `npm.cmd run build` passed on 2026-06-30 with the existing Webpack bundle-size warnings.
- A local dev server on `127.0.0.1:8080` returned HTTP 200 during smoke verification and was then stopped.
- In-app browser visual verification was attempted, but the browser control runtime hit a Windows permission error resolving `C:\Users\minhb\AppData`; no browser session was left running.
- Vite was replaced with Webpack because Vite/esbuild hit `spawn EPERM` on this Windows environment.
- Webpack currently emits bundle-size warnings, but the production build succeeds.
- npm currently reports moderate audit findings from the dependency tree; no forced audit fix has been applied.
