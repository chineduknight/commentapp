// main.js — wiring. This is the only file that calls addEventListener.

window.App = window.App || {};

(function (App) {
  "use strict";

  const store = App.store;
  const actions = App.actions;
  const state = store.state;
  const app = document.getElementById("app");

  store.subscribe(function (s) {
    App.view.render(s, store.getDraft);
  });

  // ---------------------------------------------------------- the dispatcher
  //
  // One listener for the entire application. Replaces the ~90-line chain of
  // `if (event.target.closest(".foo"))` blocks in the original.

  app.addEventListener("click", function (event) {
    const el = event.target.closest("[data-action]");
    if (!el || el.disabled) return;

    const handler = actions[el.dataset.action];
    if (!handler) return;

    event.preventDefault();
    handler(el.dataset.id, el);
  });

  // ----------------------------------------------------------------- drafts
  //
  // Deliberately does NOT call setState. Typing records text; it does not
  // re-render. This is what stops a half-written reply from vanishing when
  // something else on the page updates.

  app.addEventListener("input", function (event) {
    const key = event.target.dataset ? event.target.dataset.focusKey : null;
    if (key) store.setDraft(key, event.target.value);
  });

  // --------------------------------------------------------------- keyboard

  app.addEventListener("keydown", function (event) {
    // Ctrl/Cmd + Enter submits whichever composer you're in.
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      const box = event.target.closest(".composer");
      const submit = box ? box.querySelector("[data-action^='submit']") : null;
      if (submit) {
        event.preventDefault();
        submit.click();
      }
      return;
    }

    if (event.key !== "Escape") return;

    if (state.ui.confirmingDelete !== null) actions["cancel-delete"]();
    else if (state.ui.replyingTo || state.ui.editingId) actions.cancel();
  });

  // ------------------------------------------------------------ modal a11y
  //
  // Focus goes into the dialog on open, is trapped while it's there, and
  // returns to the button that opened it on close.

  const modal = document.getElementById("delete-modal");
  let lastFocused = null;

  function focusablesIn(root) {
    const nodes = root.querySelectorAll(
      "button, [href], input, textarea, [tabindex]:not([tabindex='-1'])",
    );
    return Array.prototype.filter.call(nodes, function (el) {
      if (el.disabled) return false;
      return el.checkVisibility ? el.checkVisibility() : true;
    });
  }

  new MutationObserver(function () {
    if (!modal.hidden) {
      lastFocused = document.activeElement;
      const first = focusablesIn(modal)[0];
      if (first) first.focus();
    } else if (lastFocused) {
      lastFocused.focus();
      lastFocused = null;
    }
  }).observe(modal, { attributes: true, attributeFilter: ["hidden"] });

  modal.addEventListener("keydown", function (event) {
    if (event.key !== "Tab") return;
    const items = focusablesIn(modal);
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

  // Clicking the backdrop closes the dialog.
  modal.addEventListener("click", function (event) {
    if (event.target === modal) actions["cancel-delete"]();
  });

  // ------------------------------------------------------------------- boot

  // The avatars are data URIs held in JS, so the static composer gets its
  // image here rather than in the markup.
  document.getElementById("me-avatar").src = state.users[state.currentUser].avatar;

  document.getElementById("reset").addEventListener("click", function () {
    if (window.confirm("Clear saved comments and reload the seed data?")) store.resetAll();
  });

  // Timestamps are computed at render time, so re-render every minute to keep
  // "just now" from becoming a lie.
  setInterval(store.touch, 60000);

  App.view.render(state, store.getDraft);
})(window.App);
