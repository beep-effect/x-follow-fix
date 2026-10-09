// Follow Restore — content script.
//
// Puts a Follow control back on x.com profile headers when X does not render
// one. The control is a plain link to X's documented follow web intent:
//   https://x.com/intent/follow?screen_name=HANDLE
// It never calls an API, never reads cookies, never follows on your behalf.
//
// Runs in the content-script isolated world. No background worker, no storage,
// no network. Exposed as `globalThis.__followRestore` for the DOM fixture test.

(function followRestore(root) {
  "use strict";

  const MARKER = "data-xfix-follow";
  const RESERVED = new Set([
    "home", "explore", "search", "i", "intent", "settings", "messages",
    "notifications", "compose", "jobs", "tos", "privacy", "login", "signup",
    "premium", "lists", "bookmarks", "communities", "verified", "logout",
    "account", "flow", "hashtag", "who_to_follow", "connect_people", "about",
  ]);
  const SEL = {
    actions: '[data-testid="userActions"]',
    placement: '[data-testid="placementTracking"]',
    editProfile: '[data-testid="editProfileButton"]',
    follow: '[data-testid$="-follow"]',
    unfollow: '[data-testid$="-unfollow"]',
    marker: `[${MARKER}]`,
  };
  const INTENT_BASE = "https://x.com/intent/follow?screen_name=";

  // Native x.com Follow tokens, verified 2026-10-09 against a live button.
  const TOKENS = {
    light: { bg: "#0f1419", fg: "#ffffff", hover: "#272c30" },
    dark: { bg: "#eff3f4", fg: "#0f1419", hover: "#d7dbdc" },
    font: 'TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  };

  // ---------------------------------------------------------------- helpers

  function profileHandle(loc) {
    const host = loc.hostname;
    if (host !== "x.com" && host !== "twitter.com" && host !== "www.x.com" && host !== "www.twitter.com") return null;
    const parts = loc.pathname.split("/").filter(Boolean);
    if (parts.length !== 1) return null;
    const seg = parts[0];
    if (RESERVED.has(seg.toLowerCase())) return null;
    if (!/^[A-Za-z0-9_]{1,15}$/.test(seg)) return null;
    return seg;
  }

  function intentUrl(handle) {
    return INTENT_BASE + encodeURIComponent(handle);
  }

  function isDark(doc) {
    const scheme = doc.documentElement.style.colorScheme;
    if (scheme === "dark") return true;
    if (scheme === "light") return false;
    const view = doc.defaultView;
    return !!(view && view.matchMedia && view.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  // Native follow controls on the page, ignoring our own node.
  function nativeFollowControls(scope) {
    return Array.from(scope.querySelectorAll(`${SEL.follow}, ${SEL.unfollow}`)).filter(
      (el) => !el.hasAttribute(MARKER) && !el.closest(SEL.marker)
    );
  }

  function headerRow(doc) {
    const actions = doc.querySelector(SEL.actions);
    return actions ? actions.parentElement : null;
  }

  // ----------------------------------------------------------- the button

  function applyFallbackStyle(a, doc) {
    const t = isDark(doc) ? TOKENS.dark : TOKENS.light;
    a.removeAttribute("class");
    a.style.cssText = [
      "display:inline-flex", "align-items:center", "justify-content:center",
      "box-sizing:border-box", "min-width:36px", "height:36px", "padding:0 16px",
      "border-radius:9999px", "border:1px solid transparent", "text-decoration:none",
      "cursor:pointer", "user-select:none", "outline-style:none",
      `font-family:${TOKENS.font}`, "font-size:15px", "line-height:20px", "font-weight:700",
      `background-color:${t.bg}`, `color:${t.fg}`, "transition:background-color .2s",
    ].join(";");
    a.dataset.xfixBg = t.bg;
    a.dataset.xfixHover = t.hover;
    const label = a.querySelector("span") || a;
    label.style.color = t.fg;
    label.style.fontFamily = TOKENS.font;
    label.style.fontSize = "15px";
    label.style.lineHeight = "20px";
    label.style.fontWeight = "700";
  }

  function attachHoverHandlers(a) {
    if (a.__xfixHover) return;
    a.__xfixHover = true;
    const over = () => { if (a.dataset.xfixHover) a.style.backgroundColor = a.dataset.xfixHover; };
    const out = () => { if (a.dataset.xfixBg) a.style.backgroundColor = a.dataset.xfixBg; };
    a.addEventListener("mouseenter", over);
    a.addEventListener("mouseleave", out);
    a.addEventListener("focus", () => { a.style.outline = "2px solid #1d9bf0"; a.style.outlineOffset = "2px"; });
    a.addEventListener("blur", () => { a.style.outline = "none"; });
    a.addEventListener("mousedown", over);
    a.addEventListener("mouseup", out);
  }

  // Build from a cloned native Follow button so X's own CSS drives the look.
  function buildFromClone(native, handle, doc) {
    const a = doc.createElement("a");
    a.className = native.className;
    for (const child of Array.from(native.childNodes)) a.appendChild(child.cloneNode(true));
    // Strip any test ids that would make us look native to our own checks.
    for (const el of [a, ...Array.from(a.querySelectorAll("[data-testid]"))]) {
      const tid = el.getAttribute("data-testid");
      if (tid && /-(un)?follow$/.test(tid)) el.removeAttribute("data-testid");
    }
    for (const el of a.querySelectorAll("[role],[aria-label],[tabindex]")) {
      el.removeAttribute("role"); el.removeAttribute("aria-label"); el.removeAttribute("tabindex");
    }
    const span = a.querySelector("span span") || a.querySelector("span");
    const nativeLabel = (span && span.textContent.trim()) || "Follow";
    if (span) span.textContent = nativeLabel;
    a.dataset.xfixLabel = nativeLabel;
    // Header size. Cloned sidebar/cell buttons are 32px; the header is 36px.
    a.style.height = "36px";
    a.style.minHeight = "36px";
    a.style.paddingLeft = "16px";
    a.style.paddingRight = "16px";
    a.style.textDecoration = "none";
    a.style.display = "inline-flex";
    a.style.alignItems = "center";
    a.style.boxSizing = "border-box";
    a.dataset.xfixSource = "clone";
    return a;
  }

  function buildFallback(handle, doc) {
    const a = doc.createElement("a");
    const span = doc.createElement("span");
    span.textContent = "Follow";
    a.appendChild(span);
    a.dataset.xfixLabel = "Follow";
    a.dataset.xfixSource = "fallback";
    applyFallbackStyle(a, doc);
    attachHoverHandlers(a);
    return a;
  }

  function buildButton(handle, doc) {
    const sample = doc.querySelector(SEL.follow);
    const a = sample && !sample.hasAttribute(MARKER) ? buildFromClone(sample, handle, doc) : buildFallback(handle, doc);
    a.setAttribute(MARKER, "1");
    a.setAttribute("href", intentUrl(handle));
    a.setAttribute("rel", "noopener");
    a.setAttribute("aria-label", `Follow @${handle}`);
    a.setAttribute("title", `Follow @${handle}`);
    return a;
  }

  // ------------------------------------------------------------- decision

  function decide(doc, loc) {
    const handle = profileHandle(loc);
    if (!handle) return { action: "remove", reason: "not-profile" };
    const row = headerRow(doc);
    if (!row) return { action: "wait", reason: "no-header" };
    if (doc.querySelector(SEL.editProfile)) return { action: "remove", reason: "own-profile" };
    if (nativeFollowControls(row).length > 0) return { action: "remove", reason: "native-present" };
    return { action: "inject", reason: "missing", handle, row };
  }

  function removeInjected(doc) {
    for (const el of doc.querySelectorAll(SEL.marker)) el.remove();
  }

  // Siblings in the header row carry margins (12px bottom in a flex-end row).
  // Copy them from the ··· button so we sit on the same baseline.
  function matchRowMargins(a, doc) {
    const actions = doc.querySelector(SEL.actions);
    const view = doc.defaultView;
    if (!actions || !view || !view.getComputedStyle) return;
    const cs = view.getComputedStyle(actions);
    if (cs.marginBottom) a.style.marginBottom = cs.marginBottom;
    if (cs.marginTop) a.style.marginTop = cs.marginTop;
  }

  function mountPoint(row, doc) {
    const placement = row.querySelector(SEL.placement);
    if (placement && nativeFollowControls(placement).length === 0) return { parent: placement, before: null };
    return { parent: row, before: null };
  }

  function inject(doc, loc) {
    const d = decide(doc, loc);
    if (d.action === "remove") { removeInjected(doc); return d; }
    if (d.action === "wait") return d;
    const existing = doc.querySelector(SEL.marker);
    const wantSource = doc.querySelector(SEL.follow) ? "clone" : "fallback";
    if (existing && existing.getAttribute("href") === intentUrl(d.handle) && existing.dataset.xfixSource === wantSource
        && d.row.contains(existing)) {
      if (wantSource === "fallback") applyFallbackStyle(existing, doc);
      return { ...d, action: "kept" };
    }
    removeInjected(doc);
    const a = buildButton(d.handle, doc);
    const { parent, before } = mountPoint(d.row, doc);
    parent.insertBefore(a, before);
    matchRowMargins(a, doc);
    return { ...d, node: a };
  }

  // ------------------------------------------------------------- runtime

  function start(doc, win) {
    let timer = 0;
    let lastHref = "";
    let lastKey = "";
    const run = () => {
      timer = 0;
      const href = win.location.href;
      const row = headerRow(doc);
      const key = [href, !!row, !!doc.querySelector(SEL.editProfile), row ? nativeFollowControls(row).length : -1,
        !!doc.querySelector(SEL.marker), !!doc.querySelector(SEL.follow), doc.documentElement.style.colorScheme].join("|");
      if (key === lastKey && href === lastHref) return; // gated: nothing changed
      lastKey = key; lastHref = href;
      inject(doc, win.location);
    };
    const schedule = () => { if (!timer) timer = win.setTimeout(run, 150); };
    const mo = new win.MutationObserver(schedule);
    mo.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "data-testid"] });
    win.addEventListener("popstate", schedule);
    if (win.matchMedia) win.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", schedule);
    schedule();
    return { stop: () => { mo.disconnect(); win.removeEventListener("popstate", schedule); } };
  }

  const api = { profileHandle, intentUrl, decide, inject, buildButton, start, MARKER, RESERVED };
  root.__followRestore = api;
  if (typeof document !== "undefined" && typeof window !== "undefined" && !root.__followRestoreNoAutostart) {
    start(document, window);
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
