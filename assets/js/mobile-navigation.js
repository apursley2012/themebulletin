/**
 * +----------------------------------------------------------------------------+
 * | ThemeBulletin                                                              |
 * | Purpose: Accessible, keyboard-operable mobile navigation drawer.           |
 * | Author: Alysha Pursley                                                     |
 * | Copyright (c) 2026 Alysha Pursley.                                         |
 * +----------------------------------------------------------------------------+
 */

"use strict";

(() => {
  // Guard against duplicate listeners if initialization is retriggered.
  const initializedHeaders = new WeakSet();

  document.addEventListener("DOMContentLoaded", () => {
    const header = /** @type {HTMLElement | null} */ (document.querySelector(".site-header"));
    if (!header) return;

    const toggle = /** @type {HTMLButtonElement | null} */ (
      header.querySelector(".menu-toggle")
    );
    const drawer = /** @type {HTMLElement | null} */ (header.querySelector(".site-nav"));
    const closeButton = /** @type {HTMLButtonElement | null} */ (
      header.querySelector(".menu-close")
    );
    const backdrop = /** @type {HTMLElement | null} */ (
      header.querySelector(".menu-backdrop")
    );
    if (!toggle || !drawer || !closeButton || !backdrop ||
      typeof window.matchMedia !== "function") return;
    if (initializedHeaders.has(header)) return;
    initializedHeaders.add(header);

    // Activate enhanced mobile styles only after all drawer controls exist.
    // Otherwise navigation stays visible and usable as a normal link list.
    document.documentElement.classList.add("has-js");
    const mobile = window.matchMedia("(max-width: 900px)");
    const brand = /** @type {HTMLAnchorElement | null} */ (
      header.querySelector(".site-brand")
    );
    const background = /** @type {HTMLElement[]} */ ([
      document.querySelector("main"),
      document.querySelector(".site-footer"),
      brand,
      toggle,
    ].filter(Boolean));
    const focusable = () => Array.from(
      drawer.querySelectorAll('a[href], button:not([disabled])'),
    ).filter((element) => element.getClientRects().length > 0)
      .map((element) => /** @type {HTMLElement} */(element));

    function setOpen(open, restoreFocus = false) {
      const shouldOpen = open && mobile.matches;
      header.classList.toggle("menu-open", shouldOpen);
      document.body.classList.toggle("menu-open", shouldOpen);
      toggle.setAttribute("aria-expanded", String(shouldOpen));
      toggle.setAttribute(
        "aria-label",
        shouldOpen ? "Navigation menu open" : "Open navigation menu",
      );
      // Prevent assistive technology and touch/keyboard focus from
      // reaching the page behind the open drawer.
      background.forEach((element) => { element.inert = shouldOpen; });

      if (shouldOpen) {
        closeButton.focus();
      } else if (restoreFocus && mobile.matches) {
        toggle.focus();
      }
    }

    toggle.addEventListener("click", () => {
      setOpen(!header.classList.contains("menu-open"));
    });
    closeButton.addEventListener("click", () => setOpen(false, true));
    backdrop.addEventListener("click", () => setOpen(false, true));

    drawer.addEventListener("click", (event) => {
      if (event.target instanceof Element &&
        event.target.closest("a[href]")) setOpen(false, true);
    });

    document.addEventListener("keydown", (event) => {
      if (!header.classList.contains("menu-open")) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false, true);
        return;
      }

      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    // An opened mobile drawer must never remain open after switching to desktop.
    mobile.addEventListener("change", () => {
      const wasOpen = header.classList.contains("menu-open");
      setOpen(false);
      if (wasOpen && !mobile.matches) brand?.focus();
    });
  });
})();
