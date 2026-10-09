# Publishing — exploration and checklist (nothing submitted)

Status: **draft**. No developer account exists, nothing has been uploaded,
no fee has been paid. Publishing happens only after the owner explicitly
says to submit and has a developer account.

## Chrome Web Store

Requirements to expect:

- One-time **$5 developer registration** fee, paid once per Google account.
- **2-step verification** on the Google account before the dashboard works.
- **Trader / non-trader declaration** (EU Digital Services Act). This is a
  free hobby tool with no monetization; declare **non-trader** unless legal
  advice says otherwise.
- **Single-purpose policy.** This qualifies: the one purpose is restoring a
  missing Follow control on x.com profiles. Say exactly that.
- **Manifest V3**, no remotely hosted code. Satisfied: one content script,
  no background worker, no `eval`, no fetched scripts.
- **Privacy policy URL** required because of host permissions. Use the raw
  GitHub URL of `PRIVACY.md` or a GitHub Pages render of it.
- **Icons**: 128×128 required in the manifest and store; 16 and 48 ship too.
- **Screenshots**: 1280×800 (or 640×400), PNG or JPEG, no alpha. At least
  one; up to five.
- Optional small promo tile 440×280.

### Host permission justification (what the reviewer reads)

> Follow Restore runs only on x.com and twitter.com. It reads the profile
> header to detect when X has not rendered a Follow button and inserts a
> link to X's own documented follow intent
> (`https://x.com/intent/follow?screen_name=…`). It makes no network
> requests, stores nothing, reads no cookies, injects no remote code, and
> never follows on the user's behalf. Following only happens when the user
> confirms on X's own page.

That paragraph is the review mitigation. The design was chosen so it is
true: the button is a link, nothing more.

### Listing copy (draft)

Title: **Follow Restore**

Summary (132 chars max):
`Puts the Follow button back on x.com profiles where the header hides it.`

Description:

> Follow Restore puts the Follow button back on x.com profiles where the
> header hides it, including accounts that show Subscribe instead of Follow.
>
> The button looks like X's own and opens X's own follow confirmation. It
> collects nothing: no analytics, no storage, no network requests, no
> cookies, no remote code, and it never follows anyone for you.
>
> Works on x.com and twitter.com. Not affiliated with X Corp.

Fallback line if a reviewer objects to naming x.com:
`Restores a missing Follow control on profiles by opening the site's own follow link.`

Category: Social & Communication. Language: English.

### Screenshot checklist (1280×800)

- [ ] A monetized profile header with the restored button in dark theme.
- [ ] The same in light theme.
- [ ] X's "Do you want to follow" confirmation after the click.
- [ ] Optional: before/after side by side.

## Trademark

The title stays `Follow Restore`. It does not start with "X" or "Twitter",
and does not use "official" or "Subscribe". The description may say the
extension is for use with x.com and is not affiliated with X Corp.

## X Terms of Service risk

Stated plainly: modifying x.com's UI can draw a complaint from X even when
the extension only links to a documented intent. X's developer terms and
automation rules focus on API and automated actions, which this extension
does not perform, but a UI-modifying extension still sits in a gray area and
X can ask a store to remove it. Do not hide this in the listing or the repo.

## Other stores

- **Edge Add-ons**: accepts the same MV3 zip. Separate listing, separate
  review, no fee. Not submitted.
- **Firefox**: needs `browser_specific_settings.gecko.id` in the manifest
  and a separate AMO pass. Not blocking v1. Not submitted.

## Checklist

- [ ] Owner says "submit".
- [ ] Owner has a Chrome Web Store developer account with 2FA and the $5 fee
      paid.
- [ ] Bump `version` in `manifest.json` and `package.json`.
- [ ] `npm test` green.
- [ ] `scripts/pack.sh` → `dist/follow-restore-<version>.zip`.
- [ ] Verify the zip contains `manifest.json`, `src/content.js`, three PNG
      icons, `PRIVACY.md`, `LICENSE`, `README.md`, and nothing else.
- [ ] Privacy policy URL live.
- [ ] Screenshots captured at 1280×800.
- [ ] Listing copy pasted from above; non-trader declaration done.
- [ ] Upload the zip, fill the permission justification above, submit for
      review.
- [ ] Edge Add-ons listing with the same zip (optional).
