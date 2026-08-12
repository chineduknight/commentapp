// render.js — turns state into DOM. Reads state, writes DOM, nothing else.
// It never mutates state and never saves anything.

window.App = window.App || {};

(function (App) {
  "use strict";

  const m = App.mutations;

  // ---------------------------------------------- safe-by-default templating
  //
  // The original code did `<p>${comment.content}</p>` straight into innerHTML,
  // which meant posting `<img src=x onerror=alert(1)>` executed — and because
  // it was saved to localStorage, it re-executed on every page load.
  //
  // The `html` tag below escapes every interpolated value automatically. You
  // have to opt *out* with raw(), which makes the dangerous case the visible one.

  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return ESCAPES[c];
    });
  }

  const RAW = "__raw_html__";

  function raw(value) {
    const box = {};
    box[RAW] = String(value);
    return box;
  }

  function interpolate(value) {
    if (value == null || value === false || value === true) return "";
    if (Array.isArray(value)) return value.map(interpolate).join("");
    if (typeof value === "object" && RAW in value) return value[RAW];
    return esc(value);
  }

  function html(strings) {
    let out = strings[0];
    for (let i = 1; i < arguments.length; i++) {
      out += interpolate(arguments[i]) + strings[i];
    }
    return out;
  }

  // ------------------------------------------------------------------- icons
  // Inlined so the app has no external asset files, and so `currentColor`
  // lets CSS control them.

  const ICONS = {
    plus: '<svg viewBox="0 0 11 11" width="11" height="11" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.33 10.896c.137 0 .255-.05.354-.149.1-.1.149-.217.149-.354V7.004h3.315c.136 0 .254-.05.354-.149.099-.1.148-.217.148-.354V5.272a.483.483 0 0 0-.148-.354.483.483 0 0 0-.354-.149H6.833V1.4a.483.483 0 0 0-.149-.354.483.483 0 0 0-.354-.149H4.915a.483.483 0 0 0-.354.149c-.1.1-.149.217-.149.354v3.37H1.08a.483.483 0 0 0-.354.15c-.1.099-.149.217-.149.353v1.23c0 .136.05.254.149.353.1.1.217.149.354.149h3.333v3.39c0 .136.05.254.15.353.098.1.216.149.353.149H6.33Z"/></svg>',
    minus: '<svg viewBox="0 0 11 3" width="11" height="3" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9.256 2.66c.204 0 .38-.056.53-.167.148-.11.222-.243.222-.396V.722c0-.152-.074-.284-.223-.395a.859.859 0 0 0-.53-.167H.76a.859.859 0 0 0-.53.167C.083.437.009.57.009.722v1.375c0 .153.074.285.223.396a.859.859 0 0 0 .53.167h8.495Z"/></svg>',
    reply: '<svg viewBox="0 0 14 13" width="14" height="13" aria-hidden="true" focusable="false"><path fill="currentColor" d="M.227 4.316 5.04.16a.657.657 0 0 1 1.085.497v2.189c4.392.05 7.875.93 7.875 5.093 0 1.68-1.082 3.344-2.279 4.214-.373.272-.905-.07-.767-.51 1.24-3.964-.588-5.017-4.829-5.078v2.404c0 .566-.664.86-1.085.496L.227 5.31a.657.657 0 0 1 0-.993Z"/></svg>',
    edit: '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M13.479 2.872 11.08.474a1.75 1.75 0 0 0-2.327-.06L.879 8.287a1.75 1.75 0 0 0-.5 1.06l-.375 3.648a.875.875 0 0 0 .875.954h.078l3.65-.333c.399-.04.773-.216 1.058-.499l7.875-7.875a1.68 1.68 0 0 0-.061-2.371Zm-2.975 2.923L8.159 3.449 9.865 1.7l2.389 2.39-1.75 1.706Z"/></svg>',
    trash: '<svg viewBox="0 0 12 14" width="12" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M1.167 12.448c0 .854.7 1.552 1.555 1.552h6.222c.856 0 1.556-.698 1.556-1.552V3.5H1.167v8.948Zm10.5-11.281H8.75L7.773 0h-3.88l-.976 1.167H0v1.166h11.667V1.167Z"/></svg>',
  };

  // -------------------------------------------------------------- timestamps

  const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const UNITS = [
    ["year", 31536000000],
    ["month", 2592000000],
    ["week", 604800000],
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
  ];

  /** 1719... -> "2 weeks ago". Computed at render time, so it stays true. */
  function timeAgo(timestamp, now) {
    now = now || Date.now();
    const diff = timestamp - now;
    for (let i = 0; i < UNITS.length; i++) {
      if (Math.abs(diff) >= UNITS[i][1]) {
        return RTF.format(Math.round(diff / UNITS[i][1]), UNITS[i][0]);
      }
    }
    return "just now";
  }

  // ------------------------------------------------------------------ pieces

  function avatarFor(state, authorId) {
    const user = state.users[authorId];
    return user ? user.avatar : state.users[state.currentUser].avatar;
  }

  function voteBox(state, comment) {
    const mine = m.isMine(state, comment);
    const disabled = mine ? "disabled" : "";

    return html`
      <div class="vote">
        <button
          class="vote__btn"
          type="button"
          data-action="upvote"
          data-id="${comment.id}"
          aria-label="Upvote comment by ${comment.authorId}"
          aria-pressed="${comment.myVote === 1}"
          ${raw(disabled)}
        >${raw(ICONS.plus)}</button>

        <span class="vote__score" aria-live="polite">${m.displayScore(comment)}</span>

        <button
          class="vote__btn"
          type="button"
          data-action="downvote"
          data-id="${comment.id}"
          aria-label="Downvote comment by ${comment.authorId}"
          aria-pressed="${comment.myVote === -1}"
          ${raw(disabled)}
        >${raw(ICONS.minus)}</button>
      </div>
    `;
  }

  function actionBar(state, comment) {
    const mine = m.isMine(state, comment);

    const own = html`
      <button class="act act--danger" type="button" data-action="ask-delete" data-id="${comment.id}">
        ${raw(ICONS.trash)} Delete
      </button>
      <button class="act" type="button" data-action="edit" data-id="${comment.id}">
        ${raw(ICONS.edit)} Edit
      </button>
    `;

    const theirs = html`
      <button class="act" type="button" data-action="reply" data-id="${comment.id}">
        ${raw(ICONS.reply)} Reply
      </button>
    `;

    // Note: the class list never changes based on ownership. The original code
    // swapped `delete-btn` out for `not-you` to hide a button, which meant the
    // element stopped being a delete button in order to become invisible.
    return html`<div class="actions">${raw(mine ? own : theirs)}</div>`;
  }

  function composer(opts) {
    const cancel =
      opts.submitAction === "submit-new"
        ? ""
        : html`<button class="btn btn--ghost" type="button" data-action="cancel">Cancel</button>`;

    const avatar = opts.avatar
      ? html`<img class="composer__avatar" src="${opts.avatar}" alt="" />`
      : "";

    return html`
      <div class="composer ${raw(opts.inline ? "composer--inline" : "")}">
        ${raw(avatar)}
        <label class="sr-only" for="ta-${opts.focusKey}">${opts.placeholder}</label>
        <textarea
          id="ta-${opts.focusKey}"
          class="composer__input"
          data-focus-key="${opts.focusKey}"
          placeholder="${opts.placeholder}"
          rows="4"
        >${opts.value}</textarea>
        <div class="composer__side">
          <button class="btn" type="button" data-action="${opts.submitAction}" data-id="${opts.id}">
            ${opts.submitLabel}
          </button>
          ${raw(cancel)}
        </div>
      </div>
    `;
  }

  function card(state, comment, getDraft) {
    if (comment.deleted) {
      return html`
        <article class="card card--tombstone" data-id="${comment.id}">
          <p class="tombstone">This comment was deleted.</p>
        </article>
      `;
    }

    const mine = m.isMine(state, comment);
    const mention = m.mentionFor(state, comment);
    const editing = state.ui.editingId === comment.id;
    const editDraft = getDraft("edit:" + comment.id);

    const body = editing
      ? html`<div class="card__body card__body--editing">
          ${raw(
            composer({
              focusKey: "edit:" + comment.id,
              value: editDraft === undefined ? comment.content : editDraft,
              submitAction: "submit-edit",
              id: comment.id,
              submitLabel: "Update",
              placeholder: "Edit your comment",
              inline: true,
            }),
          )}
        </div>`
      : html`<div class="card__body">
          <p>
            ${raw(mention ? html`<a class="mention" href="#">@${mention}</a> ` : "")}${comment.content}
          </p>
        </div>`;

    return html`
      <article class="card" data-id="${comment.id}">
        ${raw(voteBox(state, comment))}
        <header class="card__head">
          <img class="avatar" src="${avatarFor(state, comment.authorId)}" alt="" />
          <span class="username">${comment.authorId}</span>
          ${raw(mine ? html`<span class="badge">you</span>` : "")}
          <time class="timestamp" datetime="${new Date(comment.createdAt).toISOString()}"
            >${timeAgo(comment.createdAt)}</time
          >
          ${raw(comment.editedAt ? html`<span class="edited">(edited)</span>` : "")}
        </header>
        ${raw(actionBar(state, comment))} ${raw(body)}
      </article>
    `;
  }

  /**
   * Recursive. Arbitrary nesting depth comes free from the normalized data —
   * but the visual indent stops at one level, matching the original design.
   */
  function node(state, comment, getDraft, depth) {
    const kids = m.childrenOf(state, comment.id);
    const replying = state.ui.replyingTo === comment.id;
    const replyDraft = getDraft("reply:" + comment.id);

    const replyBox = replying
      ? composer({
          focusKey: "reply:" + comment.id,
          value: replyDraft === undefined ? "" : replyDraft,
          submitAction: "submit-reply",
          id: comment.id,
          submitLabel: "Reply",
          placeholder: "Reply to " + comment.authorId,
          avatar: avatarFor(state, state.currentUser),
        })
      : "";

    const childList = kids.length
      ? html`<ul class="thread ${raw(depth === 0 ? "thread--nested" : "thread--flat")}">
          ${raw(
            kids
              .map(function (k) {
                return node(state, k, getDraft, depth + 1);
              })
              .join(""),
          )}
        </ul>`
      : "";

    return html`
      <li class="thread__item">
        ${raw(card(state, comment, getDraft))} ${raw(replyBox)} ${raw(childList)}
      </li>
    `;
  }

  // ------------------------------------------------------ focus preservation
  //
  // Re-rendering the container blows away focus and caret position. Capture it
  // before the swap, put it back after.

  function selector(key) {
    const safe = window.CSS && CSS.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
    return '[data-focus-key="' + safe + '"]';
  }

  function captureFocus() {
    const el = document.activeElement;
    const key = el && el.dataset ? el.dataset.focusKey : null;
    if (!key) return null;
    return { key: key, start: el.selectionStart, end: el.selectionEnd };
  }

  function restoreFocus(snapshot) {
    if (!snapshot) return;
    const el = document.querySelector(selector(snapshot.key));
    if (!el) return;
    el.focus();
    if (snapshot.start != null) el.setSelectionRange(snapshot.start, snapshot.end);
  }

  function focusEnd(key) {
    const el = document.querySelector(selector(key));
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }

  // --------------------------------------------------------------- rendering

  let previousUi = { replyingTo: null, editingId: null };

  function render(state, getDraft) {
    const thread = document.getElementById("thread");
    const snapshot = captureFocus();
    const roots = m.rootComments(state);

    // One assignment, not `innerHTML +=` inside a loop. The original re-parsed
    // the whole container once per comment, which is O(n^2).
    thread.innerHTML = roots.length
      ? roots
          .map(function (c) {
            return node(state, c, getDraft, 0);
          })
          .join("")
      : '<li class="empty">No comments yet. Start the conversation below.</li>';

    // Keep the always-on composer in sync with its draft.
    const rootBox = document.querySelector(selector("new:root"));
    let rootDraft = getDraft("new:root");
    if (rootDraft === undefined) rootDraft = "";
    if (rootBox && rootBox.value !== rootDraft) rootBox.value = rootDraft;

    // A box that just opened should take focus; otherwise put focus back.
    const openedReply = state.ui.replyingTo && state.ui.replyingTo !== previousUi.replyingTo;
    const openedEdit = state.ui.editingId && state.ui.editingId !== previousUi.editingId;

    if (openedReply) focusEnd("reply:" + state.ui.replyingTo);
    else if (openedEdit) focusEnd("edit:" + state.ui.editingId);
    else restoreFocus(snapshot);

    previousUi = { replyingTo: state.ui.replyingTo, editingId: state.ui.editingId };

    const modal = document.getElementById("delete-modal");
    const open = state.ui.confirmingDelete !== null;
    modal.hidden = !open;
    document.body.classList.toggle("is-locked", open);
  }

  App.view = { render: render, html: html, esc: esc, raw: raw, timeAgo: timeAgo, ICONS: ICONS };
})(window.App);
