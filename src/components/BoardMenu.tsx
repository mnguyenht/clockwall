import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import type { Board } from "../types";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type BoardMenuProps = {
  boards: Board[];
  activeBoardId: string;
  onSelect: (boardId: string) => void;
  onCreate: () => void;
  onDelete: (boardId: string) => void;
};

export function getCompactBoardName(name: string) {
  const maxLength = 15;
  return name.length > maxLength ? `${name.slice(0, maxLength - 3)}...` : name;
}

export function BoardMenu({ boards, activeBoardId, onSelect, onCreate, onDelete }: BoardMenuProps) {
  const [open, setOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? boards[0];
  const canDelete = boards.length > 1;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setDeleteMode(false);
    }
  }

  function selectBoard(boardId: string) {
    if (deleteMode) {
      return;
    }
    onSelect(boardId);
    setOpen(false);
  }

  function deleteBoard(event: MouseEvent<HTMLSpanElement>, boardId: string) {
    event.preventDefault();
    event.stopPropagation();
    onDelete(boardId);
  }

  function handleDeleteKeyDown(event: KeyboardEvent<HTMLSpanElement>, boardId: string) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onDelete(boardId);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className="select-trigger" aria-label="Board">
          <span className="select-trigger__value">{getCompactBoardName(activeBoard?.name ?? "Board")}</span>
          <ChevronDown size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent className={`board-menu${deleteMode ? " board-menu--deleting" : ""}`} align="start">
        <div className="board-menu__list">
          {boards.map((board, index) => (
            <button
              key={board.id}
              type="button"
              className={`board-menu__item${board.id === activeBoardId ? " board-menu__item--active" : ""}`}
              title={board.name}
              aria-disabled={deleteMode || undefined}
              onClick={() => selectBoard(board.id)}
              style={{ "--row-index": index } as CSSProperties}
            >
              <span>{getCompactBoardName(board.name)}</span>
              <span className="board-menu__delete-slot">
                {deleteMode && canDelete ? (
                    <span
                      className="board-menu__delete"
                      role="button"
                      tabIndex={0}
                      aria-label={`Delete ${board.name}`}
                      onClick={(event) => deleteBoard(event, board.id)}
                      onKeyDown={(event) => handleDeleteKeyDown(event, board.id)}
                    >
                      <Trash2 size={15} />
                    </span>
                  ) : null}
              </span>
            </button>
          ))}
        </div>
        <div className="board-menu__island">
          {deleteMode ? (
              <div key="delete" className="board-menu__island-state">
                <button type="button" className="board-menu__action" onClick={() => setDeleteMode(false)}>
                  <Check size={15} />
                  Done
                </button>
              </div>
            ) : (
              <div key="normal" className="board-menu__island-state">
                <button
                  type="button"
                  className="board-menu__action"
                  onClick={() => {
                    setOpen(false);
                    onCreate();
                  }}
                >
                  <Plus size={15} />
                  New Board
                </button>
                <button
                  type="button"
                  className="board-menu__action board-menu__action--danger"
                  disabled={!canDelete}
                  title={canDelete ? undefined : "A board is required"}
                  onClick={() => setDeleteMode(true)}
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
