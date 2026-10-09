// DOM fixture test for src/content.js. No browser, no network.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const SRC = fs.readFileSync(path.join(__dirname, "..", "src", "content.js"), "utf8");

function load(url, body) {
  const dom = new JSDOM(`<!doctype html><html style="color-scheme: dark"><body>${body}</body></html>`, {
    url,
    runScripts: "outside-only",
  });
  dom.window.__followRestoreNoAutostart = true;
  dom.window.eval(SRC);
  return { dom, api: dom.window.__followRestore, doc: dom.window.document, loc: dom.window.location };
}

const HEADER_NO_FOLLOW = `
  <div id="row">
    <button data-testid="userActions" aria-label="More"></button>
    <button data-testid="sendDMFromProfile" aria-label="Message"></button>
    <button aria-label="Subscribe to @visegrad24"></button>
    <div data-testid="placementTracking"><div><div>Click to Follow visegrad24</div></div></div>
  </div>`;

test("injects a native-looking intent link into placementTracking when Follow is missing", () => {
  const { api, doc, loc } = load("https://x.com/visegrad24", HEADER_NO_FOLLOW);
  const r = api.inject(doc, loc);
  assert.equal(r.action, "inject");
  const node = doc.querySelector("[data-xfix-follow]");
  assert.ok(node, "injected node exists");
  assert.equal(node.tagName, "A");
  assert.equal(node.getAttribute("href"), "https://x.com/intent/follow?screen_name=visegrad24");
  assert.equal(node.getAttribute("aria-label"), "Follow @visegrad24");
  assert.equal(node.getAttribute("target"), null, "same-tab navigation");
  assert.equal(node.getAttribute("rel"), "noopener");
  assert.equal(node.textContent.trim(), "Follow");
  assert.equal(node.closest('[data-testid="placementTracking"]') !== null, true, "mounted in placementTracking");
  for (const el of [node, ...node.querySelectorAll("[data-testid]")]) {
    const tid = el.getAttribute("data-testid") || "";
    assert.ok(!/-(un)?follow$/.test(tid), "no -follow/-unfollow test id on our node");
  }
  assert.equal(node.dataset.xfixSource, "fallback");
  assert.equal(node.style.backgroundColor, "rgb(239, 243, 244)", "dark theme fill");
  assert.equal(node.style.borderRadius, "9999px");
});

test("is idempotent: a second inject keeps the single existing node", () => {
  const { api, doc, loc } = load("https://x.com/visegrad24", HEADER_NO_FOLLOW);
  api.inject(doc, loc);
  const r = api.inject(doc, loc);
  assert.equal(r.action, "kept");
  assert.equal(doc.querySelectorAll("[data-xfix-follow]").length, 1);
});

test("re-styling on a kept pass preserves the row margins", () => {
  const { api, doc, loc } = load("https://x.com/visegrad24", HEADER_NO_FOLLOW);
  doc.querySelector('[data-testid="userActions"]').style.marginBottom = "12px";
  api.inject(doc, loc);
  const node = doc.querySelector("[data-xfix-follow]");
  assert.equal(node.style.marginBottom, "12px");
  api.inject(doc, loc);
  assert.equal(node.style.marginBottom, "12px", "cssText reset must not drop the margin");
});

test("does not inject on /home", () => {
  const { api, doc, loc } = load("https://x.com/home", HEADER_NO_FOLLOW);
  const r = api.inject(doc, loc);
  assert.equal(r.action, "remove");
  assert.equal(doc.querySelector("[data-xfix-follow]"), null);
});

test("does not inject on multi-segment paths", () => {
  const { api, doc, loc } = load("https://x.com/visegrad24/followers", HEADER_NO_FOLLOW);
  assert.equal(api.inject(doc, loc).action, "remove");
});

test("does not inject when editProfileButton is present", () => {
  const body = HEADER_NO_FOLLOW.replace('aria-label="Subscribe to @visegrad24"', 'data-testid="editProfileButton"');
  const { api, doc, loc } = load("https://x.com/me", body);
  assert.equal(api.inject(doc, loc).reason, "own-profile");
  assert.equal(doc.querySelector("[data-xfix-follow]"), null);
});

test("does not inject when a native follow or unfollow control is present, and removes a stale node", () => {
  for (const tid of ["123-follow", "123-unfollow"]) {
    const body = HEADER_NO_FOLLOW.replace("<div>Click to Follow visegrad24</div>", `<button data-testid="${tid}">x</button>`);
    const { api, doc, loc } = load("https://x.com/visegrad24", body);
    doc.getElementById("row").insertAdjacentHTML("beforeend", '<a data-xfix-follow="1" href="#">stale</a>');
    const r = api.inject(doc, loc);
    assert.equal(r.reason, "native-present", tid);
    assert.equal(doc.querySelector("[data-xfix-follow]"), null, "stale node removed");
  }
});

test("waits when the header anchor is missing instead of injecting elsewhere", () => {
  const { api, doc, loc } = load("https://x.com/visegrad24", "<div>loading</div>");
  assert.equal(api.inject(doc, loc).action, "wait");
  assert.equal(doc.querySelector("[data-xfix-follow]"), null);
});

test("clones a native Follow button elsewhere on the page when one exists", () => {
  const body = HEADER_NO_FOLLOW + `
    <aside><button data-testid="999-follow" class="css-g5y9jx r-xyz" role="button" aria-label="Follow @someone">
      <div><span><span>Seguir</span></span></div></button></aside>`;
  const { api, doc, loc } = load("https://x.com/visegrad24", body);
  api.inject(doc, loc);
  const node = doc.querySelector("[data-xfix-follow]");
  assert.equal(node.dataset.xfixSource, "clone");
  assert.equal(node.className, "css-g5y9jx r-xyz");
  assert.equal(node.textContent.trim(), "Seguir", "locale label taken from the clone");
  assert.equal(node.getAttribute("aria-label"), "Follow @visegrad24");
  assert.equal(node.getAttribute("href"), "https://x.com/intent/follow?screen_name=visegrad24");
  // The native sidebar button must still count as native, and ours must not.
  assert.equal(doc.querySelectorAll('[data-testid$="-follow"]').length, 1);
});

test("profileHandle rejects reserved and invalid segments", () => {
  const { api } = load("https://x.com/home", "");
  const h = (u) => api.profileHandle(new URL(u));
  assert.equal(h("https://x.com/home"), null);
  assert.equal(h("https://x.com/i/flow/login"), null);
  assert.equal(h("https://x.com/settings"), null);
  assert.equal(h("https://x.com/visegrad24"), "visegrad24");
  assert.equal(h("https://twitter.com/visegrad24"), "visegrad24");
  assert.equal(h("https://x.com/visegrad24/status/1"), null);
  assert.equal(h("https://example.com/visegrad24"), null);
  assert.equal(h("https://x.com/this_handle_is_way_too_long"), null);
});

test("start() reacts to DOM mutations and popstate with a debounced, gated observer", async () => {
  const { api, dom, doc } = load("https://x.com/home", "<div id='app'></div>");
  const h = api.start(doc, dom.window);
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(doc.querySelector("[data-xfix-follow]"), null);
  dom.window.history.pushState({}, "", "/visegrad24");
  doc.getElementById("app").innerHTML = HEADER_NO_FOLLOW;
  await new Promise((r) => setTimeout(r, 250));
  assert.ok(doc.querySelector("[data-xfix-follow]"), "injected after client-side navigation");
  dom.window.history.pushState({}, "", "/home");
  dom.window.dispatchEvent(new dom.window.Event("popstate"));
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(doc.querySelector("[data-xfix-follow]"), null, "removed after navigating away");
  h.stop();
});
