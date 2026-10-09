# Follow Restore

Puts the Follow button back on x.com profiles where the header hides it.

On x.com desktop, some profiles you do not follow never render the Follow
control. The header shows the `···` menu, a message bubble, and for monetized
accounts a Subscribe control, but the free Follow button is missing. The
wrapper X reserves for it is present in the DOM with a hidden
"Click to Follow <handle>" label and nothing inside. Follow Restore fills that
spot with a button that looks like X's own and opens X's documented follow
web intent:

```
https://x.com/intent/follow?screen_name=HANDLE
```

Logged in, X renders its own "Do you want to follow @handle?" confirmation
over the profile. Logged out, X shows an inline sign-in form. The extension
never follows anyone for you.

## What it refuses to do

- It never calls X's private follow API and never reads or sends cookies.
- It never clicks Follow on your behalf and never automates a follow.
- It makes no network requests. The only request is the navigation you
  trigger by clicking the button.
- It has no background service worker, no remote code, no analytics, and
  no storage. Host permissions are `https://x.com/*` and
  `https://twitter.com/*` only.

## Load unpacked

Chrome:

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder (the one containing
   `manifest.json`).

Brave: identical, at `brave://extensions`. Brave loads unpacked Chromium
extensions the same way.

Reload the extension from that page after pulling changes.

## How it decides

The content script runs on `x.com` and `twitter.com`. A debounced
`MutationObserver` watches the single-page app and compares
`location.href` on every batch of mutations, so client-side navigation is
caught without hooking `history`. The decision is gated: `inject()` returns
immediately unless something relevant changed.

It injects only when all of these hold:

- the URL is `/<handle>` with exactly one path segment and the segment is
  not reserved (`home`, `explore`, `search`, `i`, `settings`, `messages`,
  `notifications`, `compose`, `premium`, and so on),
- the header action cluster exists (`[data-testid="userActions"]`),
- there is no `[data-testid="editProfileButton"]` (not your own profile),
- there is no native `[data-testid$="-follow"]` or `[data-testid$="-unfollow"]`
  in the header row.

The button is an `<a>` tagged `data-xfix-follow="header"`, mounted inside
`[data-testid="placementTracking"]`, the empty wrapper where X's own Follow
sits (last in the row, right of the `···` menu). It carries no `-follow`
test id, so the native-present check ignores it. When a real Follow button
exists anywhere on the page (sidebar, user cell) the extension clones its
markup and class list so X's CSS drives the look. Otherwise it applies X's
own tokens, verified against a live Follow button:

| | light | dark |
|---|---|---|
| fill | `#0f1419` | `#eff3f4` |
| label | `#ffffff` | `#0f1419` |
| hover | `#272c30` | `#d7dbdc` |

Chirp 15px / 20px, weight 700, radius 9999px, height 36px, padding 0 16px.
Theme follows `color-scheme` on `<html>` and `prefers-color-scheme`.

User cells get the same treatment at 32px, tagged `data-xfix-follow="cell"`,
mounted in the empty slot X leaves before its hidden "Click to Follow HANDLE"
label. Cells that still render a native Follow or Following control are left
alone.

## Limitations

- The intent is X's confirmation step, not a silent follow. You click Follow
  twice: once on our button, once on X's sheet.
- Navigating to the intent URL reloads the single-page app once.
- A rate-limited or very new account can still get an error from X after
  the click. That is X's response, not something the extension can change.
- Selectors drift. `userActions`, `placementTracking`, `editProfileButton`
  and the `<id>-follow` / `<id>-unfollow` test ids were verified on
  2026-10-09. If X renames them the button stops appearing, and nothing
  else happens.
- User cells (followers, following, search, the "You might like" sidebar)
  are best-effort. When X drops the Follow button there it also drops
  "Following", so the extension cannot tell which of those accounts you
  already follow and adds the link to every cell that has X's hidden
  "Click to Follow" label. X's own sheet after the click is the source of
  truth.

## Manual test plan

- A monetized profile whose header has `···`, Subscribe, and message but no
  Follow (for example a profile you do not follow that shows the purple
  Subscribe icon). The button appears, looks native, and opens the
  "Do you want to follow" sheet.
- A profile you already follow. No second button. An Unfollow control counts
  as present.
- Your own profile (`editProfileButton`). No injection.
- SPA navigation: Home, then a profile, without a full reload. The button
  appears after the client-side navigation. Then back to Home: it is gone.
- Light and dark theme. Hover and focus-visible match a real Follow button.
- Chrome and Brave, loaded unpacked.
- A rate-limited or logged-out account: the sheet may error or ask for
  sign-in. That is X, not a bug in this extension.
- A followers or following list where cells have no Follow button. Each
  cell gets a 32px link in the button slot; cells with a native control do
  not.

## Development

```
npm install      # jsdom, test only; nothing ships
npm test         # node --test against a DOM fixture, no browser, no network
scripts/pack.sh  # dist/follow-restore-<version>.zip for a store upload
```

Icons are rendered from `icons/icon.svg` with `rsvg-convert` and committed.

## License

Apache-2.0. Not affiliated with X Corp.
