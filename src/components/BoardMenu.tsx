import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
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
  const maxLength = 13;
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
      <PopoverContent className="board-menu" align="start">
        <div className="board-menu__list">
          {boards.map((board) => (
            <button
              key={board.id}
              type="button"
              className={`board-menu__item${board.id === activeBoardId ? " board-menu__item--active" : ""}`}
              title={board.name}
              aria-disabled={deleteMode || undefined}
              onClick={() => selectBoard(board.id)}
            >
              <span>{getCompactBoardName(board.name)}</span>
              <AnimatePresence>
                {deleteMode && canDelete ? (
                  <m.span
                    key="delete"
                    className="board-menu__delete"
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete ${board.name}`}
                    onClick={(event) => deleteBoard(event, board.id)}
                    onKeyDown={(event) => handleDeleteKeyDown(event, board.id)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.12 }}
                  >
                    <Trash2 size={15} />
                  </m.span>
                ) : null}
              </AnimatePresence>
            </button>
          ))}
        </div>
        <div className="board-menu__island">
          <AnimatePresence mode="wait">
            {deleteMode ? (
              <m.div
                key="delete"
                className="board-menu__island-state"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
              >
                <button type="button" className="board-menu__action" onClick={() => setDeleteMode(false)}>
                  <Check size={15} />
                  Done
                </button>
              </m.div>
            ) : (
              <m.div
                key="normal"
                className="board-menu__island-state"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
              >
                <button
                  type="button"
                  className="board-menu__action"
                  onClick={() => {
                    setOpen(false);
                    onCreate();
                  }}
                >
                  <Plus size={15} />
                  New list
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
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
}
