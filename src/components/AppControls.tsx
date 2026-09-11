import { Download, Moon, Plus, Search, Settings, SunMedium, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import type { Board, BoardDeckExport, ClockNameMode, ThemeMode } from "../types";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { GlowPaletteControl } from "./GlowPaletteControl";
import { NameModeGroup } from "./NameModeGroup";
import { TimeRangeField } from "./TimeRangeField";
import { TimezonePicker } from "./TimezonePicker";

type AppControlsProps = {
  boards: Board[];
  activeBoardId: string;
  theme: ThemeMode;
  displaySeconds: boolean;
  darkGlow: string;
  primaryTimezone: string;
  awakeStart: string;
  awakeEnd: string;
  defaultNameMode: ClockNameMode;
  searchQuery: string;
  searchOpen: boolean;
  onBoardChange: (boardId: string) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onCreateBoard: (name: string) => void;
  onDisplaySecondsChange: (displaySeconds: boolean) => void;
  onDarkGlowChange: (color: string) => void;
  onPrimaryTimezoneChange: (timezone: string) => void;
  onAwakeHoursChange: (start: string, end: string) => void;
  onDefaultNameModeChange: (nameMode: ClockNameMode) => void;
  onAddClock: () => void;
  onSearchOpenChange: (open: boolean) => void;
  onSearchQueryChange: (query: string) => void;
  onExportBoard: () => BoardDeckExport;
  onExportStarted: () => void;
  onImportBoard: (raw: string) => void;
};

function getCompactBoardName(name: string) {
  const maxLength = 13;
  return name.length > maxLength ? `${name.slice(0, maxLength - 3)}...` : name;
}

export function AppControls({
  boards,
  activeBoardId,
  theme,
  displaySeconds,
  darkGlow,
  primaryTimezone,
  awakeStart,
  awakeEnd,
  defaultNameMode,
  searchQuery,
  searchOpen,
  onBoardChange,
  onThemeChange,
  onCreateBoard,
  onDisplaySecondsChange,
  onDarkGlowChange,
  onPrimaryTimezoneChange,
  onAwakeHoursChange,
  onDefaultNameModeChange,
  onAddClock,
  onSearchOpenChange,
  onSearchQueryChange,
  onExportBoard,
  onExportStarted,
  onImportBoard,
}: AppControlsProps) {
  const isAnalog = theme === "hotel-analog";
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  function handleBoardChange(value: string) {
    if (value === "__create") {
      setCreateBoardOpen(true);
      return;
    }

    onBoardChange(value);
  }

  function handleCreateBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newBoardName.trim();
    if (!name) {
      return;
    }

    onCreateBoard(name);
    setNewBoardName("");
    setCreateBoardOpen(false);
  }

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }
  }, [searchOpen]);

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onSearchOpenChange(false);
    }
  }

  function exportBoard() {
    const deck = onExportBoard();
    const json = JSON.stringify(deck, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = deck.board.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "clockwall";

    link.href = url;
    link.download = `${safeName}-clockwall.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.requestAnimationFrame(() => {
      onExportStarted();
      URL.revokeObjectURL(url);
    });
  }

  async function importBoard(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      onImportBoard(await file.text());
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not import that deck.");
    }
  }

  return (
    <>
      <div className="corner-control corner-control--left">
        <Select value={activeBoardId} onValueChange={handleBoardChange}>
          <SelectTrigger aria-label="Board">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="board-select-content">
            {boards.map((board) => (
              <SelectItem key={board.id} value={board.id} title={board.name}>
                {getCompactBoardName(board.name)}
              </SelectItem>
            ))}
            <SelectItem value="__create">New board</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={createBoardOpen} onOpenChange={setCreateBoardOpen}>
        <DialogContent className="board-dialog" aria-describedby="board-dialog-description">
          <form className="board-form" onSubmit={handleCreateBoard} autoComplete="off">
            <div>
              <DialogTitle className="settings-title">New board</DialogTitle>
              <DialogDescription id="board-dialog-description" className="settings-description">
                Create a new board for another clock deck.
              </DialogDescription>
            </div>
            <div className="form-field">
              <Label htmlFor="new-board-name">Board name</Label>
              <input
                id="new-board-name"
                className="text-input"
                value={newBoardName}
                onChange={(event) => setNewBoardName(event.target.value)}
                placeholder="Board name"
                name="new-board-name"
                autoFocus
              />
            </div>
            <div className="form-actions">
              <Button type="button" variant="ghost" onClick={() => setCreateBoardOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newBoardName.trim()}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="corner-control corner-control--right top-actions">
        <div className={`search-chip ${searchOpen ? "search-chip--open" : ""}`}>
          <button
            type="button"
            className="search-toggle"
            onClick={() => onSearchOpenChange(!searchOpen)}
            aria-label={searchOpen ? "Close search" : "Open search"}
            title={searchOpen ? "Close search" : "Search"}
          >
            <Search size={18} strokeWidth={2.6} />
          </button>
          <div className="search-chip__field">
            <Search size={14} className="search-chip__icon" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search"
              name="clock-search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              onBlur={() => {
                if (!searchQuery.trim()) {
                  onSearchOpenChange(false);
                }
              }}
            />
            {searchQuery ? (
              <button
                type="button"
                className="search-chip__clear"
                onClick={() => onSearchQueryChange("")}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          className="theme-toggle"
          variant="default"
          onClick={() => onThemeChange(theme === "hotel-analog" ? "dark-digital" : "hotel-analog")}
          aria-label="Toggle theme"
          title={isAnalog ? "Current theme: Hotel Analog" : "Current theme: Dark Digital"}
        >
          {isAnalog ? <SunMedium size={17} /> : <Moon size={17} />}
          <span>{isAnalog ? "Hotel Analog" : "Dark Digital"}</span>
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="icon" size="icon" aria-label="Open settings" title="Settings">
              <Settings size={18} />
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby="settings-description">
            <div className="settings-page">
              <div>
                <DialogTitle className="settings-title">Settings</DialogTitle>
                <DialogDescription id="settings-description" className="settings-description">
                  Display preferences for this clock wall.
                </DialogDescription>
              </div>

              <div className="settings-row">
                <div className="settings-row__copy">
                  <Label htmlFor="display-seconds">Show seconds</Label>
                </div>
                <Switch
                  id="display-seconds"
                  checked={displaySeconds}
                  onCheckedChange={onDisplaySecondsChange}
                  aria-label="Show seconds"
                />
              </div>

              <div className="settings-row settings-row--stacked">
                <div className="settings-row__copy">
                  <Label>Main timezone</Label>
                  <p>Your central reference clock for availability.</p>
                </div>
                <TimezonePicker
                  id="primary-timezone"
                  value={primaryTimezone}
                  onChange={onPrimaryTimezoneChange}
                  className="settings-timezone-picker"
                />
              </div>

              <div className="settings-row settings-row--stacked">
                <div className="settings-row__copy">
                  <Label>Awake hours</Label>
                  <p>Outside these hours availability shows as an outline.</p>
                </div>
                <TimeRangeField
                  start={awakeStart}
                  end={awakeEnd}
                  onChange={onAwakeHoursChange}
                  idPrefix="awake-hours"
                />
              </div>

              <div className="settings-row settings-row--stacked">
                <div className="settings-row__copy">
                  <Label htmlFor="dark-glow">Digital glow</Label>
                </div>
                <GlowPaletteControl value={darkGlow} onChange={onDarkGlowChange} />
              </div>

              <div className="settings-row settings-row--stacked">
                <div className="settings-row__copy">
                  <Label>Default name style</Label>
                  <p>Used when adding a new clock.</p>
                </div>
                <NameModeGroup
                  value={defaultNameMode}
                  onChange={onDefaultNameModeChange}
                  previewTimezone={primaryTimezone}
                />
              </div>

              <div className="settings-row">
                <div className="settings-row__copy">
                  <Label>Import & Export</Label>
                  <p>Download and import your clocks on a different machine.</p>
                  {importError ? <p className="settings-error">{importError}</p> : null}
                </div>
                <div className="settings-actions">
                  <Button
                    type="button"
                    className="settings-action-button"
                    variant="ghost"
                    size="sm"
                    onClick={exportBoard}
                    aria-label="Export deck"
                    title="Export"
                  >
                    <Download size={15} />
                  </Button>
                  <Button
                    type="button"
                    className="settings-action-button"
                    variant="ghost"
                    size="sm"
                    onClick={() => importInputRef.current?.click()}
                    aria-label="Import deck"
                    title="Import"
                  >
                    <Upload size={15} />
                  </Button>
                  <input
                    ref={importInputRef}
                    className="file-input"
                    type="file"
                    accept="application/json,.json"
                    onChange={importBoard}
                  />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Button
        type="button"
        className="add-clock-button"
        variant="icon"
        size="fab"
        aria-label="Add clock"
        title="Add clock"
        onClick={onAddClock}
      >
        <Plus size={30} strokeWidth={2.2} />
      </Button>
    </>
  );
}
