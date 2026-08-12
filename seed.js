// seed.js — the initial dataset, already in the normalized shape.
//
// Note what is NOT in here compared to the original data.json:
//   - no `showReplyBox` / `isEditing`  -> that is UI state, it lives in state.ui
//   - no `unique`                      -> ownership is derived from authorId
//   - no nested `replies: []`          -> the tree is expressed by parentId
//   - `createdAt` is a real timestamp  -> "1 month ago" is computed at render time

window.App = window.App || {};

(function (App) {
  "use strict";

  const MINUTE = 60000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;

  const CURRENT_USER = "juliusomo";

  const USERS = {
    amyrobson: { username: "amyrobson", avatar: App.AVATARS.amyrobson },
    maxblagun: { username: "maxblagun", avatar: App.AVATARS.maxblagun },
    ramsesmiron: { username: "ramsesmiron", avatar: App.AVATARS.ramsesmiron },
    juliusomo: { username: "juliusomo", avatar: App.AVATARS.juliusomo },
  };

  /**
   * A flat map keyed by id. Every lookup is O(1) instead of a nested scan.
   * `now` is injectable so tests can pin the clock.
   */
  function seedComments(now) {
    now = now || Date.now();
    return {
      c_amy: {
        id: "c_amy",
        parentId: null,
        authorId: "amyrobson",
        content:
          "Impressive! Though it seems the drag feature could be improved. But overall it looks incredible. You've nailed the design and the responsiveness at various breakpoints works really well.",
        createdAt: now - MONTH,
        score: 12,
        myVote: 0,
        deleted: false,
      },
      c_max: {
        id: "c_max",
        parentId: null,
        authorId: "maxblagun",
        content:
          "Woah, your project looks awesome! How long have you been coding for? I'm still new, but think I want to dive into React as well soon. Perhaps you can give me an insight on where I can learn React? Thanks!",
        createdAt: now - 2 * WEEK,
        score: 5,
        myVote: 0,
        deleted: false,
      },
      r_ramses: {
        id: "r_ramses",
        parentId: "c_max",
        authorId: "ramsesmiron",
        content:
          "If you're still new, I'd recommend focusing on the fundamentals of HTML, CSS, and JS before considering React. It's very tempting to jump ahead but lay a solid foundation first.",
        createdAt: now - WEEK,
        score: 4,
        myVote: 0,
        deleted: false,
      },
      r_julius: {
        id: "r_julius",
        parentId: "r_ramses",
        authorId: "juliusomo",
        content:
          "I couldn't agree more with this. Everything moves so fast and it always seems like everyone knows the newest library/framework. But the fundamentals are what stay constant.",
        createdAt: now - 2 * DAY,
        score: 2,
        myVote: 0,
        deleted: false,
      },
    };
  }

  App.seed = {
    CURRENT_USER: CURRENT_USER,
    USERS: USERS,
    seedComments: seedComments,
  };
})(window.App);

// we can rewrite the above as this.
// function setupSeed(App) {
//   "use strict";

// all the seed.js code
// }

// setupSeed(window.App);

// That is an IIFE, pronounced roughly “iffy”:

// Immediately Invoked Function Expression.
