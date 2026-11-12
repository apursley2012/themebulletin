/**
 * +----------------------------------------------------------------------------+
 * | ThemeBulletin                                                              |
 * | Purpose: Maintains square boards and uniform scaling of their contents.    |
 * | Author: Alysha Pursley                                                     |
 * | Copyright (c) 2026 Alysha Pursley.                                         |
 * +----------------------------------------------------------------------------+
 */

"use strict";

(() => {
  const BOARD_SIZE = 1240;
  const MIN_SIDE_INSET = 12;

  /**
   * Fits each fixed-design square board into its viewport without distortion.
   * Reads --board-design-size from the board and writes scaled inline dimensions,
   * offsets, and viewport height; the shared 1240px maximum limits expansion.
   */
  function updateBoardScale() {
    document.querySelectorAll(".pinboard-viewport").forEach((element) => {
      const viewport = /** @type {HTMLElement} */ (element);
      const board = /** @type {HTMLElement | null} */ (viewport.querySelector(".pinboard"));
      if (!board) return;

      // Page-specific square canvases declare their design size in CSS.
      // Both axes and all pinned contents receive exactly the same scale.
      const sizeValue = window.getComputedStyle(board)
        .getPropertyValue("--board-design-size").trim();
      // Reject trailing garbage rather than accepting Number.parseFloat's
      // valid prefix. A malformed size must fall back to the shared board size.
      const declaredSize = /^(?:\d+(?:\.\d+)?|\.\d+)(?:px)?$/.test(sizeValue)
        ? Number.parseFloat(sizeValue)
        : Number.NaN;
      const boardSize = Number.isFinite(declaredSize) && declaredSize > 0
        ? declaredSize
        : BOARD_SIZE;
      const availableWidth = Math.max(0, viewport.clientWidth - 2 * MIN_SIDE_INSET);
      // All board types share the same maximum visible square size, even
      // when a supporting board needs a larger design coordinate system.
      const scale = Math.min(1, BOARD_SIZE / boardSize, availableWidth / boardSize);

      board.style.width = `${boardSize}px`;
      board.style.height = `${boardSize}px`;
      board.style.transform = `scale(${scale})`;
      board.style.left = `${Math.max(MIN_SIDE_INSET, (viewport.clientWidth - boardSize * scale) / 2)}px`;
      board.style.translate = "none";
      viewport.style.height = `${boardSize * scale}px`;
    });
  }

  /** @type {Window & { updateBoardScale?: () => void }} */ (
    window
  ).updateBoardScale = updateBoardScale;
  window.addEventListener("resize", updateBoardScale);
  document.addEventListener("DOMContentLoaded", () => {
    updateBoardScale();
  });
})();
