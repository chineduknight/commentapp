// state.js — the whole "store". No framework, no dispatch table, no action types.
//
// The entire contract is:  setState(fn)  ->  fn mutates state  ->  render runs once.

window.App = window.App || {};

(function (App) {
  "use strict";

  const STORAGE_KEY = "comments:v2";
  const listeners = [];

  // Opening this file from disk gives the page an opaque origin in some
  // browsers, where localStorage throws on access. Probe once and degrade to
  // in-memory only rather than crashing the app.
  const storage = (function () {
    try {
      const probe = "__probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch (err) {
      console.warn("localStorage is unavailable here — comments will not persist across reloads.");
      return null;
    }
  })();

  function load() {
    if (!storage) return App.seed.seedComments();
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return App.seed.seedComments();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return App.seed.seedComments();
      }
      return parsed;
    } catch (err) {
      console.warn("Saved comments were unreadable, starting from the seed data.", err);
      return App.seed.seedComments();
    }
  }

  const state = {
    currentUser: App.seed.CURRENT_USER,
    users: App.seed.USERS,

    // Domain data — persisted.
    comments: load(),

    // View state — deliberately NOT persisted. This is why a refresh no longer
    // drops you back into an open edit box with stale text.
    ui: {
      replyingTo: null,
      editingId: null,
      confirmingDelete: null,
      drafts: {}, // { "reply:<id>" | "edit:<id>" | "new:root" : "half typed text" }
    },
  };

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state.comments));
    } catch (err) {
      // Quota exceeded, or private mode. Don't kill the app over it.
      console.warn("Comments could not be saved.", err);
    }
  }

  function subscribe(fn) {
    listeners.push(fn);
  }

  // Batching: three mutations in the same tick produce one paint, not three.
  let queued = false;
  function scheduleRender() {
    if (queued) return;
    queued = true;
    Promise.resolve().then(function () {
      queued = false;
      for (let i = 0; i < listeners.length; i++) listeners[i](state);
    });
  }

  function setState(mutate) {
    mutate(state);
    persist(); // only state.comments goes to storage — state.ui never does
    scheduleRender();
  }

  /** Re-render without persisting — used by the clock tick. */
  function touch() {
    scheduleRender();
  }

  /** Record a keystroke without triggering a re-render. */
  function setDraft(key, value) {
    state.ui.drafts[key] = value;
  }

  /** Returns undefined when there is no draft — callers decide the fallback. */
  function getDraft(key) {
    return state.ui.drafts[key];
  }

  function resetAll() {
    if (storage) storage.removeItem(STORAGE_KEY);
    setState(function (s) {
      s.comments = App.seed.seedComments();
      s.ui.replyingTo = null;
      s.ui.editingId = null;
      s.ui.confirmingDelete = null;
      s.ui.drafts = {};
    });
  }

  App.store = {
    state: state,
    subscribe: subscribe,
    setState: setState,
    touch: touch,
    setDraft: setDraft,
    getDraft: getDraft,
    resetAll: resetAll,
  };
})(window.App);
