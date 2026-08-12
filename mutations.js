// mutations.js — all the business logic, and nothing else.
//
// Rules for this file:
//   1. It never touches the DOM.
//   2. It never touches localStorage.
//   3. Every function takes state as its first argument and returns it.
//
// Because of those three rules this file loads in the browser AND in Node, so
// you can unit test the entire comment system with no browser. See
// mutations.test.js — run it with `node --test`.

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api; // Node
  } else {
    root.App = root.App || {}; // browser
    root.App.mutations = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function newId() {
    try {
      if (globalThis.crypto && globalThis.crypto.randomUUID) {
        return globalThis.crypto.randomUUID();
      }
    } catch (err) {
      /* randomUUID needs a secure context; fall through */
    }
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  // -------------------------------------------------------------- selectors
  // Derived facts. Never store what you can compute.

  function isMine(state, comment) {
    return comment.authorId === state.currentUser;
  }

  /** Displayed score = everyone else's votes + your own current vote. */
  function displayScore(comment) {
    return comment.score + comment.myVote;
  }

  function childrenOf(state, parentId) {
    return Object.keys(state.comments)
      .map(function (k) {
        return state.comments[k];
      })
      .filter(function (c) {
        return c.parentId === parentId;
      })
      .sort(function (a, b) {
        return a.createdAt - b.createdAt;
      });
  }

  /** Top-level comments, highest scoring first — the Frontend Mentor ordering. */
  function rootComments(state) {
    return childrenOf(state, null).sort(function (a, b) {
      return displayScore(b) - displayScore(a) || a.createdAt - b.createdAt;
    });
  }

  /** The "@username" prefix on a reply, derived from the parent, not stored. */
  function mentionFor(state, comment) {
    if (!comment.parentId) return null;
    const parent = state.comments[comment.parentId];
    return parent ? parent.authorId : null;
  }

  function hasChildren(state, id) {
    return childrenOf(state, id).length > 0;
  }

  // -------------------------------------------------------------- mutations

  /**
   * Vote toggles. myVote is -1 | 0 | 1, so a second click on the same arrow
   * undoes it and clicking the opposite arrow flips it. The original code used
   * a `hasVoted` boolean, which recorded *that* you voted but not *which way*,
   * and locked you out forever.
   */
  function vote(state, id, direction) {
    const comment = state.comments[id];
    if (!comment || comment.deleted) return state;
    if (isMine(state, comment)) return state; // no voting on your own comment
    comment.myVote = comment.myVote === direction ? 0 : direction;
    return state;
  }

  function addComment(state, options) {
    const parentId = options.parentId === undefined ? null : options.parentId;
    const text = String(options.content == null ? "" : options.content).trim();
    const id = options.id || newId();
    const now = options.now || Date.now();

    if (!text) return state;
    if (parentId !== null && !state.comments[parentId]) return state; // orphan guard

    state.comments[id] = {
      id: id,
      parentId: parentId,
      authorId: state.currentUser,
      content: text,
      createdAt: now,
      score: 0,
      myVote: 0,
      deleted: false,
    };
    return state;
  }

  function editComment(state, id, content) {
    const comment = state.comments[id];
    const text = String(content == null ? "" : content).trim();
    if (!comment || !text || comment.deleted) return state;
    if (!isMine(state, comment)) return state; // you can only edit your own
    comment.content = text;
    comment.editedAt = Date.now();
    return state;
  }

  /**
   * Soft delete. Hard-deleting a comment that has replies would orphan the
   * whole subtree, so we tombstone it instead and let the children survive.
   * Once the last child of a tombstone is gone, the tombstone cleans itself up.
   */
  function removeComment(state, id) {
    const comment = state.comments[id];
    if (!comment) return state;
    if (!isMine(state, comment)) return state;

    if (hasChildren(state, id)) {
      comment.deleted = true;
      comment.content = "";
      return state;
    }

    let parentId = comment.parentId;
    delete state.comments[id];

    // Walk up, clearing away any tombstones that no longer hold anything.
    while (parentId) {
      const parent = state.comments[parentId];
      if (!parent || !parent.deleted || hasChildren(state, parentId)) break;
      delete state.comments[parentId];
      parentId = parent.parentId;
    }
    return state;
  }

  return {
    newId: newId,
    isMine: isMine,
    displayScore: displayScore,
    childrenOf: childrenOf,
    rootComments: rootComments,
    mentionFor: mentionFor,
    hasChildren: hasChildren,
    vote: vote,
    addComment: addComment,
    editComment: editComment,
    removeComment: removeComment,
  };
});
