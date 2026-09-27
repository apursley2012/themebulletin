/*
 * ThemeBulletin interactive bulletin-board controller
 * Author: Alysha Pursley
 * Purpose: Renders category navigation, theme cards, pagination, and responsive home-board state from the centralized theme dataset.
 * Role: Owns home-page interaction and DOM rendering while board-fit.js owns shared scaling and data/themes.js owns catalog content.
 */

'use strict';

// Resolve project-relative URLs from this script instead of the current page.
// This keeps detail and preview links correct when GitHub Pages serves the site
// from a repository subpath.
const PROJECT_ROOT = new URL('../../', document.currentScript.src);

// These dimensions are the JavaScript side of the fixed-board contract defined
// in CSS. The board is deliberately scaled as one composition on narrow screens.
const BOARD_CONFIG = Object.freeze({
  themesPerBoard: 16,
  width: 1240,
  categoryHeight: 1100,
  themeHeight: 1780,
  mobileGutter: 16,
});

// data/themes.js is the single source of truth for the catalog and must load
// before this renderer. Falling back to an empty array keeps startup predictable
// if the data script is missing or malformed.
const themes = Array.isArray(window.STICKY_NOTE_THEMES)
  ? window.STICKY_NOTE_THEMES
  : [];
const categories = [...new Set(themes.map((theme) => theme.category))];

// Pre-index category membership once. Rendering and pagination can then reuse
// the same groups instead of filtering all 64 records after every interaction.
const themesByCategory = new Map(
  categories.map((category) => [
    category,
    themes.filter((theme) => theme.category === category),
  ]),
);

// The home board cannot operate partially: missing shell controls would leave
// navigation or pagination in an inconsistent state, so fail immediately.
function getRequiredElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Required ThemeBulletin element not found: ${selector}`);
  }

  return element;
}

const elements = Object.freeze({
  pinboard: getRequiredElement('#pinboard'),
  viewport: getRequiredElement('#pinboard-viewport'),
  categoryNavigation: getRequiredElement('#category-navigation'),
  pagination: getRequiredElement('#board-pagination'),
  previousButton: getRequiredElement('#previous-board'),
  nextButton: getRequiredElement('#next-board'),
  status: getRequiredElement('#board-status'),
});

// Real category labels are non-empty strings, so an empty value safely
// represents the category index without inventing a fake catalog category.
const ALL_CATEGORIES = '';

let selectedCategory = ALL_CATEGORIES;
let currentBoard = 0;

// Catalog/state helpers -----------------------------------------------------

function getCategoryThemes(category = selectedCategory) {
  return themesByCategory.get(category) ?? [];
}

function getBoardCount() {
  return Math.max(
    1,
    Math.ceil(getCategoryThemes().length / BOARD_CONFIG.themesPerBoard),
  );
}

function getThemeDetailUrl(theme) {
  // `detail` remains the source of truth when present; the fallback preserves
  // compatibility with any future theme entry that only supplies an id.
  const detailPath = theme.detail ?? `./pages/themes/${theme.id}.html`;
  return new URL(detailPath, PROJECT_ROOT).href;
}

function createTextElement(tagName, textContent, className = '') {
  const element = document.createElement(tagName);
  element.textContent = textContent;

  if (className) {
    element.className = className;
  }

  return element;
}

function openCategory(category) {
  selectedCategory = category;
  currentBoard = 0;
  render();
}

function showCategories() {
  selectedCategory = ALL_CATEGORIES;
  currentBoard = 0;
  render();
}

// Navigation rendering ------------------------------------------------------

function renderCategoryNavigation() {
  elements.categoryNavigation.replaceChildren();

  const allCategoriesButton = document.createElement('button');
  allCategoriesButton.type = 'button';
  allCategoriesButton.textContent = 'All Categories';
  allCategoriesButton.setAttribute(
    'aria-pressed',
    String(selectedCategory === ALL_CATEGORIES),
  );
  allCategoriesButton.addEventListener('click', showCategories);
  elements.categoryNavigation.append(allCategoriesButton);

  categories.forEach((category) => {
    const button = document.createElement('button');
    const count = getCategoryThemes(category).length;

    button.type = 'button';
    button.textContent = `${category} (${count})`;
    button.setAttribute(
      'aria-pressed',
      String(selectedCategory === category),
    );
    button.addEventListener('click', () => openCategory(category));

    elements.categoryNavigation.append(button);
  });
}

// Category notes are buttons because they change in-page state rather than
// navigating away. This preserves native keyboard activation and focus behavior.
function createCategoryNote(category) {
  const count = getCategoryThemes(category).length;
  const note = document.createElement('button');

  note.type = 'button';
  note.className = 'note category-note';
  note.setAttribute('aria-label', `Open ${category}`);
  note.append(
    createTextElement('small', 'Category'),
    createTextElement('h2', category),
    createTextElement('p', `${count} themes`),
    createTextElement(
      'span',
      'Open Category →',
      'category-note-action',
    ),
  );
  note.addEventListener('click', () => openCategory(category));

  return note;
}

// A theme is presented as a Polaroid plus a sticky note. Both pieces link to
// the same detail page so the visual design does not create competing actions.
function createThemePair(theme) {
  const pair = document.createElement('article');
  const detailUrl = getThemeDetailUrl(theme);

  pair.className = 'theme-pin-pair';

  const polaroid = document.createElement('a');
  polaroid.className = 'theme-polaroid';
  polaroid.href = detailUrl;
  polaroid.setAttribute('aria-label', `View details for ${theme.name}`);

  const image = document.createElement('img');
  image.className = 'theme-polaroid-image';
  image.src = new URL(
    `assets/images/theme-previews/${theme.preview_file}`,
    PROJECT_ROOT,
  ).href;
  image.alt = `${theme.name} homepage screenshot`;
  image.loading = 'lazy';

  const fallback = createTextElement(
    'span',
    'Homepage screenshot unavailable',
    'theme-polaroid-fallback',
  );
  fallback.hidden = true;

  // Replace a failed screenshot with readable text instead of leaving the
  // browser's broken-image indicator inside the Polaroid.
  image.addEventListener('error', () => {
    image.hidden = true;
    fallback.hidden = false;
  });

  const caption = createTextElement(
    'span',
    theme.name,
    'theme-polaroid-caption',
  );
  polaroid.append(image, fallback, caption);

  const note = document.createElement('a');
  note.className = 'note theme-note';
  note.href = detailUrl;
  note.append(
    createTextElement('small', theme.category),
    createTextElement('h2', theme.name),
    createTextElement(
      'span',
      'View Theme Details →',
      'theme-note-action',
    ),
  );

  pair.append(polaroid, note);
  return pair;
}

// Board rendering -----------------------------------------------------------

function renderCategoryBoard() {
  elements.pinboard.style.height = `${BOARD_CONFIG.categoryHeight}px`;
  elements.pinboard.replaceChildren(...categories.map(createCategoryNote));
  elements.pagination.hidden = true;
}

function renderThemeBoard() {
  elements.pinboard.style.height = `${BOARD_CONFIG.themeHeight}px`;

  const categoryThemes = getCategoryThemes();
  const totalBoards = getBoardCount();

  // Clamp the board index in case the catalog changes while preserving the
  // current category. This prevents stale state from producing an empty board.
  currentBoard = Math.min(Math.max(currentBoard, 0), totalBoards - 1);

  const start = currentBoard * BOARD_CONFIG.themesPerBoard;
  const visibleThemes = categoryThemes.slice(
    start,
    start + BOARD_CONFIG.themesPerBoard,
  );

  elements.pinboard.replaceChildren(...visibleThemes.map(createThemePair));
  elements.status.textContent =
    `${selectedCategory} • Board ${currentBoard + 1} of ${totalBoards}`;
  elements.previousButton.disabled = currentBoard === 0;
  elements.nextButton.disabled = currentBoard === totalBoards - 1;
  elements.pagination.hidden = totalBoards <= 1;
}

// Responsive board fitting -------------------------------------------------

function fitBoard() {
  const boardHeight = selectedCategory
    ? BOARD_CONFIG.themeHeight
    : BOARD_CONFIG.categoryHeight;

  window.ThemeBulletinBoardFit.fitBoardToViewport({
    board: elements.pinboard,
    viewport: elements.viewport,
    boardWidth: BOARD_CONFIG.width,
    mobileGutter: BOARD_CONFIG.mobileGutter,
    boardHeight,
  });
}

// Rendering updates the DOM first, then fits the board on the next animation
// frame so viewport height is calculated after the new composition is in place.
function render() {
  renderCategoryNavigation();

  if (selectedCategory) {
    renderThemeBoard();
  } else {
    renderCategoryBoard();
  }

  requestAnimationFrame(fitBoard);
}

// Interaction wiring -------------------------------------------------------
// The explicit bounds checks protect state even if a disabled button is
// triggered programmatically.

elements.previousButton.addEventListener('click', () => {
  if (currentBoard <= 0) {
    return;
  }

  currentBoard -= 1;
  render();
});

elements.nextButton.addEventListener('click', () => {
  if (currentBoard >= getBoardCount() - 1) {
    return;
  }

  currentBoard += 1;
  render();
});

// Resize only recalculates presentation; it does not rebuild catalog content.
window.addEventListener('resize', fitBoard, { passive: true });

// Initial render starts on the category index.
render();
