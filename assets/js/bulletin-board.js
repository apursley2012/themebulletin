/**
 * +----------------------------------------------------------------------------+
 * | ThemeBulletin                                                              |
 * | Purpose: Renders categories, theme cards, and pagination for the square    |
 * | bulletin board.                                                            |
 * | Author: Alysha Pursley                                                     |
 * | Copyright (c) 2026 Alysha Pursley.                                         |
 * +----------------------------------------------------------------------------+
 */

"use strict";

/*
 * Resolve project-relative URLs from this script instead of the current page.
 * This keeps detail and preview links correct when GitHub Pages serves the site
 * from a repository subpath.
 */
const PROJECT_ROOT = new URL(
  "../../",
  /** @type {HTMLScriptElement} */(document.currentScript).src,
);

/*
 * Pagination belongs to the catalog renderer. Board dimensions are defined
 * in CSS and read by board-square.js, avoiding a second size to keep in sync.
 */
const THEMES_PER_BOARD = 16;

/*
 * data/themes.js is the single source of truth for the catalog and must load
 * before this renderer. Falling back to an empty array keeps startup predictable
 * if the data script is missing or malformed.
 */
/** @type {Window & { STICKY_NOTE_THEMES?: ThemeEntry[] }} */
const catalogWindow = window;

/*
 * Validate catalog records before using them as DOM links or image paths.
 * Catalog data is local, but a malformed entry must not create an unsafe URL
 * or prevent the remaining valid themes from being displayed.
 */
function isValidThemeEntry(theme) {
  if (!theme || typeof theme !== "object") {
    return false;
  }

  const requiredText = ["id", "name", "category", "preview_file"];
  if (!requiredText.every((key) =>
    typeof theme[key] === "string" && theme[key].trim().length > 0
  )) {
    return false;
  }

  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(theme.id) ||
    !/^[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g|webp)$/i.test(theme.preview_file)) {
    return false;
  }

  const detailPath = theme.detail ?? `./pages/themes/${theme.id}.html`;
  if (typeof detailPath !== "string" ||
    !detailPath.startsWith("./pages/themes/") ||
    !/^[-a-z0-9]+[.]html$/.test(detailPath.slice("./pages/themes/".length))) {
    return false;
  }

  // Optional preview filenames use the same restricted local-asset format.
  if (theme.detail_preview_file !== undefined &&
    (typeof theme.detail_preview_file !== "string" ||
      !/^[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g|webp)$/i.test(theme.detail_preview_file))) {
    return false;
  }

  return ["demo", "repo"].every((key) => {
    if (typeof theme[key] !== "string" || !theme[key].startsWith("https://")) {
      return false;
    }

    try {
      const url = new URL(theme[key]);
      return url.protocol === "https:" && Boolean(url.hostname) &&
        !url.username && !url.password;
    } catch {
      return false;
    }
  });
}

const catalogEntries = Array.isArray(catalogWindow.STICKY_NOTE_THEMES)
  ? catalogWindow.STICKY_NOTE_THEMES
  : [];
const seenThemeIds = new Set();
const themes = catalogEntries.filter((theme) => {
  if (!isValidThemeEntry(theme) || seenThemeIds.has(theme.id)) {
    return false;
  }
  seenThemeIds.add(theme.id);
  return true;
});

if (themes.length !== catalogEntries.length) {
  console.warn("ThemeBulletin: invalid catalog entries were excluded.");
}
if (themes.length === 0) {
  console.warn("ThemeBulletin: no valid catalog entries were loaded.");
}

const categories = [...new Set(themes.map((theme) => theme.category))];

/*
 * Pre-index category membership once. Rendering and pagination can then reuse
 * the same groups instead of filtering all 64 records after every interaction.
 */
const themesByCategory = new Map(categories.map((category) => [category, []]));
for (const theme of themes) {
  themesByCategory.get(theme.category).push(theme);
}

/*
 * The home board cannot operate partially: missing shell controls would leave
 * navigation or pagination in an inconsistent state, so fail immediately.
 */
function getRequiredElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Required ThemeBulletin element not found: ${selector}`);
  }

  return element;
}

const elements = Object.freeze({
  pinboard: getRequiredElement("#pinboard"),
  viewport: getRequiredElement("#pinboard-viewport"),
  categoryNavigation: getRequiredElement("#category-navigation"),
  pagination: getRequiredElement("#board-pagination"),
  previousButton: getRequiredElement("#previous-board"),
  nextButton: getRequiredElement("#next-board"),
  status: getRequiredElement("#board-status"),
  announcement: getRequiredElement("#board-announcement"),
  readableList: getRequiredElement("#theme-list-alternative"),
  readableLinks: getRequiredElement("#theme-list-links"),
});

/*
 * Real category labels are non-empty strings, so an empty value safely
 * represents the category index without inventing a fake catalog category.
 */
const ALL_CATEGORIES = "";

let selectedCategory = ALL_CATEGORIES;
let currentBoard = 0;

// Catalog/state helpers -----------------------------------------------------

function getCategoryThemes(category = selectedCategory) {
  return themesByCategory.get(category) ?? [];
}

function getBoardCount() {
  return Math.max(
    1,
    Math.ceil(getCategoryThemes().length / THEMES_PER_BOARD),
  );
}

function getThemeDetailUrl(theme) {
  /*
   * `detail` remains the source of truth when present; the fallback preserves
   * compatibility with any future theme entry that only supplies an id.
   */
  const detailPath = theme.detail ?? `./pages/themes/${theme.id}.html`;
  return new URL(detailPath, PROJECT_ROOT).href;
}

function createTextElement(tagName, textContent, className = "") {
  const element = document.createElement(tagName);
  element.textContent = textContent;

  if (className) {
    element.className = className;
  }

  return element;
}

function selectCategory(category) {
  if (category !== ALL_CATEGORIES && !themesByCategory.has(category)) {
    return;
  }

  selectedCategory = category;
  currentBoard = 0;
  renderCategoryNavigation();
  render();
  focusSelectedCategory();
}

// Rebuilding navigation must not strand keyboard focus on a removed button.
function focusSelectedCategory() {
  const buttons = [...elements.categoryNavigation.querySelectorAll("button")];
  const selected = buttons.find((button) => button.dataset.category === selectedCategory);
  selected?.focus();
}

// Navigation rendering ------------------------------------------------------

function createCategoryButton(category, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.category = category;
  button.textContent = label;
  button.setAttribute("aria-pressed", String(selectedCategory === category));
  button.addEventListener("click", () => selectCategory(category));
  return button;
}

function renderCategoryNavigation() {
  elements.categoryNavigation.replaceChildren(
    createCategoryButton(ALL_CATEGORIES, "All Categories"),
    ...categories.map((category) =>
      createCategoryButton(category, `${category} (${getCategoryThemes(category).length})`)
    ),
  );
}

/*
 * Category notes are buttons because they change in-page state rather than
 * navigating away. This preserves native keyboard activation and focus behavior.
 */
function createCategoryNote(category) {
  const count = getCategoryThemes(category).length;
  const note = document.createElement("button");

  note.type = "button";
  note.className = "note category-note";
  note.setAttribute("aria-label", `Open ${category}`);
  note.append(
    createTextElement("span", category, "category-note-title"),
    createTextElement("span", `${count} themes`, "category-note-count"),
    createTextElement(
      "span",
      "Open Category →",
      "category-note-action",
    ),
  );
  note.addEventListener("click", () => selectCategory(category));

  return note;
}

/*
 * Each theme on a category board is one linked sticky note. Its individual
 * detail page contains the larger screenshot, so no preview is duplicated here.
 */
function createThemeNote(theme) {
  const note = document.createElement("a");
  note.className = "note theme-note";
  note.href = getThemeDetailUrl(theme);
  note.setAttribute("aria-label", `View details for ${theme.name}`);
  note.append(
    createTextElement("small", theme.category),
    createTextElement("h2", theme.name),
    createTextElement("span", "View Theme Details →", "theme-note-action"),
  );
  return note;
}

// Board rendering -----------------------------------------------------------

function renderCategoryBoard() {
  if (categories.length === 0) {
    const message = createTextElement(
      "p",
      "The theme catalog is temporarily unavailable.",
      "catalog-empty-message",
    );
    message.setAttribute("role", "status");
    elements.pinboard.replaceChildren(message);
  } else {
    elements.pinboard.replaceChildren(...categories.map(createCategoryNote));
  }

  elements.pagination.hidden = true;
  elements.readableList.hidden = true;
  elements.readableList.open = false;
  elements.readableLinks.replaceChildren();
}

function renderThemeBoard() {
  const categoryThemes = getCategoryThemes();
  const totalBoards = getBoardCount();

  /*
   * Clamp the board index in case the catalog changes while preserving the
   * current category. This prevents stale state from producing an empty board.
   */
  currentBoard = Math.min(Math.max(currentBoard, 0), totalBoards - 1);

  const start = currentBoard * THEMES_PER_BOARD;
  const visibleThemes = categoryThemes.slice(
    start,
    start + THEMES_PER_BOARD,
  );

  elements.pinboard.replaceChildren(...visibleThemes.map(createThemeNote));

  // Keep a readable small-screen alternative synchronized with each board.
  elements.readableLinks.replaceChildren(...visibleThemes.map((theme) => {
    const item = document.createElement("li");
    const link = createTextElement("a", theme.name);
    link.href = getThemeDetailUrl(theme);
    item.append(link);
    return item;
  }));
  elements.readableList.hidden = visibleThemes.length === 0;

  elements.status.textContent =
    `${selectedCategory} • Board ${currentBoard + 1} of ${totalBoards}`;
  elements.previousButton.disabled = currentBoard === 0;
  elements.nextButton.disabled = currentBoard === totalBoards - 1;
  elements.pagination.hidden = totalBoards <= 1;
}

// Rebuild the current board, then apply uniform viewport scaling.
function render() {
  if (selectedCategory) {
    renderThemeBoard();
  } else {
    renderCategoryBoard();
  }

  elements.announcement.textContent = selectedCategory
    ? `${selectedCategory}: board ${currentBoard + 1} of ${getBoardCount()}.`
    : `All categories: ${categories.length} categories available.`;

  // Scale the complete square board, including every note.
  /** @type {Window & { updateBoardScale?: () => void }} */ (
    window
  ).updateBoardScale?.();
}

/*
 * Interaction wiring -------------------------------------------------------
 * The explicit bounds checks protect state even if a disabled button is
 * triggered programmatically.
 */

elements.previousButton.addEventListener("click", () => {
  if (currentBoard <= 0) {
    return;
  }

  currentBoard -= 1;
  render();
});

elements.nextButton.addEventListener("click", () => {
  if (currentBoard >= getBoardCount() - 1) {
    return;
  }

  currentBoard += 1;
  render();
});

// Initial render starts on the category index.
renderCategoryNavigation();
render();
