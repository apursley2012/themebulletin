/*
 * ThemeBulletin static board-fit adapter
 * Author: Alysha Pursley
 * Purpose: Applies the shared board-fit utility to fixed supporting-page boards that do not need interactive catalog rendering.
 * Role: Connects About/theme-detail board markup to board-fit.js without duplicating the responsive scaling calculation.
 */

(() => {
  'use strict';

  // These values match the fixed-board dimensions used by shared.css. Static
  // pages share the same responsive contract as the interactive home board.
  const BOARD_WIDTH = 1240;
  const MOBILE_GUTTER = 16;

  const board = document.querySelector('.static-board-viewport .pinboard');
  const viewport = document.querySelector('.static-board-viewport');

  // Static board pages are allowed to omit the board entirely; in that case
  // there is nothing to scale and the script should exit without side effects.
  if (!board || !viewport) {
    return;
  }

  function fitBoard() {
    window.ThemeBulletinBoardFit.fitBoardToViewport({
      board,
      viewport,
      boardWidth: BOARD_WIDTH,
      mobileGutter: MOBILE_GUTTER,
      boardHeight: board.offsetHeight,
    });
  }

  // Resize handles viewport changes. The load pass catches late image/font
  // sizing, while the first animation frame handles already-cached resources.
  window.addEventListener('resize', fitBoard, { passive: true });
  window.addEventListener('load', fitBoard, { once: true });

  requestAnimationFrame(fitBoard);
})();
