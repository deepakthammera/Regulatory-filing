# Weekly News Feature — Setup

Your app has a **News & Updates** section (top of the sidebar) with two entries:

- **★ PV Updates & News** (Latest): a curated, hand-written page explaining new guidelines (e.g., ICH E2D(R1), MedDRA releases) and regulator safety actions. It is static content in `index.html` (the `view-pvupdates` section) and is **not** touched by the weekly job.
- **◆ Regulatory & PV News** (Weekly Feed): headlines from **regulators** (FDA MedWatch safety alerts and press releases, EMA news, MHRA Drug Safety Update and drug & device alerts), **industry news** (BioSpace, Fierce Pharma, BioPharma Dive, RAPS Regulatory Focus) and new articles in the journal ***Drug Safety*** (via the Crossref API), refreshed automatically every week. It shows only headlines, source, date, and a link to each original article.

This document covers the weekly feed.

## What the pieces are

| File | Purpose |
|------|---------|
| `index.html` | The app, now with a **News** view that loads `news.json`. |
| `news.json` | The data the News view displays. A **starter** version is included; it is overwritten automatically each week. |
| `scripts/fetch-news.mjs` | Node script that fetches the official RSS/Atom feeds and rebuilds `news.json`. No npm dependencies. |
| `.github/workflows/update-news.yml` | GitHub Actions workflow that runs the script **every Monday** (and on demand) and commits the updated `news.json`. |

## Install (one time)

1. Put all four items at the **root** of your repository, keeping the folder structure:
   ```
   your-repo/
   ├── index.html
   ├── news.json
   ├── scripts/
   │   └── fetch-news.mjs
   └── .github/
       └── workflows/
           └── update-news.yml
   ```
2. Commit and push.
3. In your repo: **Settings → Actions → General → Workflow permissions** → select **“Read and write permissions”** → **Save**. (This lets the workflow commit `news.json` back.)
4. Go to the **Actions** tab → select **“Update news feed”** → **Run workflow** to do the first run now (instead of waiting for Monday).

That's it. After the run finishes, open your site's **Regulatory & PV News** section and you'll see live headlines. On GitHub Pages, the page redeploys automatically after each commit.

## How it stays current

- The workflow runs **every Monday at 06:00 UTC** (`cron: "0 6 * * 1"`). Change that line in the workflow if you want a different day/time.
- It fetches each source's feed, keeps the newest items (headline + date + link only; up to 15 per source and 160 in total), de-duplicates, drops items older than ~150 days, tags each item with a category (e.g., Safety / PV, Approval) and a ⚑ priority flag for urgent safety news (not applied to journal articles), and writes `news.json`. Items with a future date are shown with the run date instead.
- If **every** source fails on a given run, the script exits without overwriting your existing `news.json`, so the page never goes blank.

## Good to know

- **GitHub pauses scheduled workflows after ~60 days of no repo activity.** Any commit re-enables them; for an active project this rarely matters. You can also just click **Run workflow** anytime.
- **Feed URLs can change.** If a source stops updating (check the `[Source] …` and `Per-source kept:` lines in the Actions log), open `scripts/fetch-news.mjs` and adjust that source's URL(s) in the `SOURCES` list. Each source has more than one URL as a fallback.
- **MHRA dates:** GOV.UK feeds only give an "updated" time, so an older MHRA alert that GOV.UK edits shows up with the edit date.
- **Undated items:** if a feed's dates can't be parsed, the Actions log prints `items without a usable date` with a sample raw date and the item's tags, so you can adjust `parseLooseDate()` in the script.
- **Copyright:** the feature intentionally stores and shows only headlines, dates, and links — never article text — which is the intended use of RSS/Atom. Each item links back to the publisher.
- **Opening `index.html` directly from your hard drive** (file://) may block the `news.json` fetch in some browsers; it works correctly when served over http/https (GitHub Pages, Netlify, or a local server such as `python3 -m http.server`).

## Adding or removing a source

Edit the `SOURCES` array in `scripts/fetch-news.mjs`. To add, e.g., Health Canada, add a new block (`tier` is one of `regulator`, `industry`, `journal`):
```js
{ source: "Health Canada", tier: "regulator", defaultCategory: "Safety / PV", feeds: ["https://<official-feed-url>"] }
```
- `defaultCategory` (optional) is used when no keyword rule matches, instead of "General".
- For a journal without a working RSS feed, use `type: "crossref"` with a Crossref API URL, e.g. `https://api.crossref.org/journals/<ISSN>/works?sort=published&order=desc&rows=30&filter=type:journal-article&select=title,URL,published,published-online,created` (see the *Drug Safety* entry).

**Sources tried and dropped** (see the notes at the top of `SOURCES`): Endpoints News (HTTP 403 to automated requests), Springer RSS for *Drug Safety* (returns no items; replaced by Crossref), FDA "drugs" page feed (mostly page edits with misleading dates), and WHO / Health Canada / TGA feeds (returned nothing from GitHub Actions runners).
Then add a matching entry to `SOURCE_META` inside the `renderNews()` function in `index.html` (label + colour) so it gets its own filter pill and colour.
