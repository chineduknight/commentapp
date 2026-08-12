// actions.js — one entry per thing a user can do.
//
// This table IS the dispatch/reducer pattern. `data-action` in the markup is
// the action type, the lookup in main.js is the dispatch, and these functions
// are the reducers. No switch statement, no action constants, no library.
//
// Adding a new button later means adding one row here and one attribute in the
// template. You never write addEventListener again.

window.App = window.App || {};

(function (App) {
  "use strict";

  const m = App.mutations;
  const setState = App.store.setState;

  function draft(key) {
    const value = App.store.getDraft(key);
    return value === undefined ? "" : value;
  }

  function closeBoxes(s) {
    if (s.ui.replyingTo) delete s.ui.drafts["reply:" + s.ui.replyingTo];
    if (s.ui.editingId) delete s.ui.drafts["edit:" + s.ui.editingId];
    s.ui.replyingTo = null;
    s.ui.editingId = null;
  }

  App.actions = {
    upvote: function (id) {
      setState(function (s) {
        m.vote(s, id, 1);
      });
    },

    downvote: function (id) {
      setState(function (s) {
        m.vote(s, id, -1);
      });
    },

    reply: function (id) {
      setState(function (s) {
        closeBoxes(s);
        s.ui.replyingTo = id;
      });
    },

    edit: function (id) {
      setState(function (s) {
        closeBoxes(s);
        s.ui.editingId = id;
        s.ui.drafts["edit:" + id] = s.comments[id].content;
      });
    },

    cancel: function () {
      setState(closeBoxes);
    },

    "submit-new": function () {
      setState(function (s) {
        m.addComment(s, { parentId: null, content: draft("new:root") });
        delete s.ui.drafts["new:root"];
      });
    },

    "submit-reply": function (id) {
      setState(function (s) {
        m.addComment(s, { parentId: id, content: draft("reply:" + id) });
        delete s.ui.drafts["reply:" + id];
        s.ui.replyingTo = null;
      });
    },

    "submit-edit": function (id) {
      setState(function (s) {
        m.editComment(s, id, draft("edit:" + id));
        delete s.ui.drafts["edit:" + id];
        s.ui.editingId = null;
      });
    },

    "ask-delete": function (id) {
      setState(function (s) {
        s.ui.confirmingDelete = id;
      });
    },

    "cancel-delete": function () {
      setState(function (s) {
        s.ui.confirmingDelete = null;
      });
    },

    "confirm-delete": function () {
      setState(function (s) {
        m.removeComment(s, s.ui.confirmingDelete);
        s.ui.confirmingDelete = null;
      });
    },
  };
})(window.App);
