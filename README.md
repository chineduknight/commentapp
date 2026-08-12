# Interactive comments — refactored (standalone)

Plain HTML, CSS, and JavaScript. No framework, no bundler, no build step, no dependencies, **no server**.

## Running it

Put all 9 files in one folder and double-click `index.html`. That's it.

```
index.html
style.css
avatars.js      <- generated, base64 image data
seed.js
mutations.js
state.js
render.js
actions.js
main.js
mutations.test.js   (optional, for `node --test`)
```

No image or icon files are needed — the four avatars are inlined as base64 data URIs in `avatars.js`, and the five icons are inline SVG in `render.js`.

To run the logic tests, from that same folder:

```bash
node --test
```

## Why it works from `file://`

The earlier version used ES modules (`import` / `export`), and browsers block those over `file://` under the same-origin policy. This version uses classic `<script defer>` tags instead, which have no such restriction. `defer` guarantees they run in document order after parsing, so the dependency chain is just the order of the tags:

```
avatars -> seed -> mutations -> state -> render -> actions -> main
```

Each file wraps itself in an IIFE and hangs one object off a single `window.App` namespace, so there's exactly one global. That's what people did before modules existed, and it's still the right answer when you want zero tooling.

`mutations.js` is the one exception — it's written UMD-style, so the identical file loads as a `<script>` in the browser *and* as a `require()` in Node. That's how the tests run without a browser.

## The files

| File | Job |
|---|---|
| `seed.js` | Starting dataset, already normalized. Replaces `data.json`. |
| `mutations.js` | All business logic. No DOM, no storage. The testable core. |
| `state.js` | The store: `state`, `setState`, batching, persistence. |
| `render.js` | State → DOM. Auto-escaping template tag, recursive rendering, focus preservation, inline icons. |
| `actions.js` | One function per user action. The `data-action` lookup table. |
| `main.js` | The only file that calls `addEventListener`. |
| `mutations.test.js` | 13 tests: voting, editing, soft delete, sorting, nesting. |

## What changed, and why

**Security.** The `html` tagged template in `render.js` escapes every interpolated value. You opt *out* with `raw()`, so the dangerous case is the visible one. Try posting `<img src=x onerror=alert(1)>` — it renders as text.

**Data shape.** Comments are a flat map keyed by id with a `parentId` pointer. Every lookup is O(1). The eight copy-pasted `comments.forEach(c => c.replies.forEach(r => ...))` scans in the original are gone, and nesting works to any depth.

**State separation.** `state.comments` is domain data and gets persisted. `state.ui` holds `replyingTo`, `editingId`, `confirmingDelete`, and `drafts`, and is never written to storage. Refreshing mid-edit no longer drops you back into an open edit box.

**Templates.** Six near-identical card templates became `card()` + `composer()`, composed in `node()`.

**Rendering.** One `innerHTML` assignment instead of `+=` inside a loop. Mutations in the same tick batch into a single paint.

**Derived, not stored.** `unique` → `comment.authorId === state.currentUser`. `hasVoted` boolean → `myVote: -1 | 0 | 1`, so votes toggle and flip. `replyingTo` string → read off the parent. `createdAt` is a timestamp formatted with `Intl.RelativeTimeFormat` at render time.

**Soft delete.** Deleting a comment with replies leaves a tombstone so the subtree survives; the tombstone removes itself once its last child is gone.

**Accessibility.** Vote controls are real `<button>`s with `aria-label` and `aria-pressed`; the score is `aria-live`. The dialog has `role="dialog"`, traps Tab, closes on Escape or backdrop click, and returns focus to the button that opened it. Every textarea has a label. Reply boxes take focus when they open.

**Responsive.** Mobile-first with one breakpoint at `40rem`. The card is a grid whose `grid-template-areas` remap at the breakpoint, so the vote widget moves from a bottom row to a left column without any change to markup order.

## Known behaviours worth knowing about

**You can't reply to your own comment.** That matches the Frontend Mentor design comp: your own comments show Delete and Edit, everyone else's show Reply. If you'd rather allow it, in `render.js` change `actionBar` so `own` includes the Reply button too.

**localStorage on `file://`.** Chrome and Firefox allow it; some environments give the page an opaque origin where it throws. `state.js` probes for it on boot and falls back to in-memory-only with a console warning, rather than crashing. Comments will work either way; they just won't survive a reload in that case.
# commentapp
