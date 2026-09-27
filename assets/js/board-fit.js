/*
 * ThemeBulletin shared board-fit utility
 * Author: Alysha Pursley
 * Purpose: Owns the reusable viewport-scaling calculation used by fixed bulletin boards.
 * Role: Keeps responsive board sizing consistent between the interactive home board and static supporting boards.
 */

(() => {
  'use strict';

  /**
   * Scale a fixed-width bulletin board to the available viewport width.
   *
   * The project intentionally keeps each board's absolute-positioned composition
   * intact and scales the whole board on smaller screens instead of reflowing it.
   * Keeping this calculation in one utility prevents the dynamic and static boards
   * from drifting apart over time.
   */
  function fitBoardToViewport({
    board,
    viewport,
    boardWidth,
    mobileGutter,
    boardHeight,
  }) {
    const availableWidth = Math.max(
      0,
      window.innerWidth - mobileGutter * 2,
    );

    // The artwork is designed at its fixed desktop width. Scale down when space
    // is tight, but never enlarge it beyond the composition it was designed for.
    const scale = Math.min(1, availableWidth / boardWidth);

    board.style.transform = `scale(${scale})`;

    // CSS transforms do not change normal document flow, so the viewport height
    // must be updated explicitly or scaled boards would leave excess blank space.
    viewport.style.height = `${boardHeight * scale}px`;
  }

  window.ThemeBulletinBoardFit = Object.freeze({
    fitBoardToViewport,
  });
})();
