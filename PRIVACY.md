# Privacy policy — Follow Restore

Last updated: 2026-10-09

Follow Restore collects nothing.

- **No data collection.** The extension does not collect, store, transmit,
  or sell any personal data, browsing data, or account data.
- **No network requests.** The extension makes no requests of its own. The
  only request that happens is the navigation you trigger by clicking the
  restored Follow button, which opens X's own follow intent page in the
  same tab.
- **No storage.** The extension requests no storage permission and persists
  nothing.
- **No remote code.** All code ships inside the extension package. Nothing
  is loaded from the network.
- **No analytics, no telemetry, no third parties.**
- **No cookies.** The extension never reads or sends cookies, including X's
  session cookies.
- **No automation.** It never follows, unfollows, posts, or performs any
  action on your account. Following happens only when you confirm on X's
  own page.

## Host permission justification

The extension runs a content script on `https://x.com/*` and
`https://twitter.com/*`. It needs this to read the profile header's DOM and
insert a link to X's follow intent where X did not render a Follow button.
It uses no other hosts and no other permissions.

## Contact

Open an issue at https://github.com/beep-effect/x-follow-fix.
