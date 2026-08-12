// mutations.test.js — run with:  node --test
//
// CommonJS on purpose: mutations.js is a UMD file, so the same source loads
// in the browser as a plain <script> and in Node as a require()-able module.
//
// The point of this file: it imports the real application logic and exercises
// every rule, with zero DOM, zero localStorage, and zero browser. That is only
// possible because mutations.js has no I/O in it.

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  addComment,
  childrenOf,
  displayScore,
  editComment,
  mentionFor,
  removeComment,
  rootComments,
  vote,
} = require("./mutations.js");

const makeState = () => ({
  currentUser: "juliusomo",
  users: {},
  comments: {
    a: { id: "a", parentId: null, authorId: "amy", content: "root a", createdAt: 100, score: 3, myVote: 0, deleted: false },
    b: { id: "b", parentId: null, authorId: "max", content: "root b", createdAt: 200, score: 9, myVote: 0, deleted: false },
    a1: { id: "a1", parentId: "a", authorId: "juliusomo", content: "mine", createdAt: 300, score: 1, myVote: 0, deleted: false },
  },
  ui: { replyingTo: null, editingId: null, confirmingDelete: null, drafts: {} },
});

test("adds a comment and trims whitespace", () => {
  const s = makeState();
  addComment(s, { content: "   hello   ", id: "new", now: 400 });
  assert.equal(s.comments.new.content, "hello");
  assert.equal(s.comments.new.authorId, "juliusomo");
  assert.equal(s.comments.new.parentId, null);
});

test("refuses empty and whitespace-only content", () => {
  const s = makeState();
  addComment(s, { content: "   ", id: "nope" });
  addComment(s, { content: "", id: "nope2" });
  assert.equal(s.comments.nope, undefined);
  assert.equal(s.comments.nope2, undefined);
});

test("refuses a reply to a parent that does not exist", () => {
  const s = makeState();
  addComment(s, { parentId: "ghost", content: "orphan", id: "x" });
  assert.equal(s.comments.x, undefined);
});

test("voting toggles off on a second click and flips on the opposite arrow", () => {
  const s = makeState();

  vote(s, "a", 1);
  assert.equal(displayScore(s.comments.a), 4);

  vote(s, "a", 1); // same arrow again -> undo
  assert.equal(displayScore(s.comments.a), 3);

  vote(s, "a", -1);
  assert.equal(displayScore(s.comments.a), 2);

  vote(s, "a", 1); // flip straight across
  assert.equal(displayScore(s.comments.a), 4);
});

test("you cannot vote on your own comment", () => {
  const s = makeState();
  vote(s, "a1", 1);
  assert.equal(displayScore(s.comments.a1), 1);
});

test("you can only edit your own comment", () => {
  const s = makeState();

  editComment(s, "a1", "edited by me");
  assert.equal(s.comments.a1.content, "edited by me");
  assert.ok(s.comments.a1.editedAt);

  editComment(s, "a", "hijacked");
  assert.equal(s.comments.a.content, "root a");
});

test("deleting a comment that has replies leaves a tombstone", () => {
  const s = makeState();
  s.comments.a.authorId = "juliusomo"; // make it deletable

  removeComment(s, "a");

  assert.equal(s.comments.a.deleted, true);
  assert.equal(s.comments.a.content, "");
  assert.ok(s.comments.a1, "the reply survives");
});

test("deleting the last child cleans up the tombstone above it", () => {
  const s = makeState();
  s.comments.a.authorId = "juliusomo";

  removeComment(s, "a"); // tombstone
  removeComment(s, "a1"); // last child

  assert.equal(s.comments.a, undefined);
  assert.equal(s.comments.a1, undefined);
});

test("you cannot delete someone else's comment", () => {
  const s = makeState();
  removeComment(s, "b");
  assert.ok(s.comments.b);
});

test("root comments sort by score, highest first", () => {
  const s = makeState();
  assert.deepEqual(rootComments(s).map((c) => c.id), ["b", "a"]);

  vote(s, "a", 1);
  vote(s, "a", 1);
  s.comments.a.score = 20;
  assert.deepEqual(rootComments(s).map((c) => c.id), ["a", "b"]);
});

test("the @mention is derived from the parent, not stored", () => {
  const s = makeState();
  assert.equal(mentionFor(s, s.comments.a1), "amy");
  assert.equal(mentionFor(s, s.comments.a), null);

  s.comments.a.authorId = "renamed";
  assert.equal(mentionFor(s, s.comments.a1), "renamed");
});

test("nesting works to arbitrary depth", () => {
  const s = makeState();
  addComment(s, { parentId: "a1", content: "level 3", id: "d3", now: 500 });
  addComment(s, { parentId: "d3", content: "level 4", id: "d4", now: 600 });
  addComment(s, { parentId: "d4", content: "level 5", id: "d5", now: 700 });

  assert.equal(childrenOf(s, "d4")[0].id, "d5");
  assert.equal(mentionFor(s, s.comments.d5), "juliusomo");
});

test("children come back in chronological order", () => {
  const s = makeState();
  addComment(s, { parentId: "a", content: "later", id: "z", now: 900 });
  addComment(s, { parentId: "a", content: "earlier", id: "y", now: 50 });

  assert.deepEqual(childrenOf(s, "a").map((c) => c.id), ["y", "a1", "z"]);
});
