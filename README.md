# Regulatory Affairs & Pharmacovigilance Training Platform

A single-file, self-contained web application for learning **drug regulatory affairs** and **pharmacovigilance (PV)**. It is built as an educational reference and study tool for students, educators, and early-career professionals, with enough operational depth to serve serious learners.

> **Educational use only.** This project is a personal, non-commercial knowledge resource. It is **not** official guidance from any regulator or standards body, **not** a substitute for the primary regulations/guidelines it summarises, and **not** legal, medical, or regulatory advice. Always work from the current official source and your organisation's SOPs.

---

## Table of Contents

- [What this is](#what-this-is)
- [What's new](#whats-new)
- [Live demo / deployment](#live-demo--deployment)
- [Install as an app (iPhone, Android, desktop)](#install-as-an-app-iphone-android-desktop)
- [Features](#features)
- [Content map](#content-map)
- [Tech stack & architecture](#tech-stack--architecture)
- [Running locally](#running-locally)
- [Project structure](#project-structure)
- [How the app is built (for contributors)](#how-the-app-is-built-for-contributors)
- [Sources & attribution](#sources--attribution)
- [Roadmap](#roadmap)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## What this is

The platform is delivered as one file — **`index.html`** — that contains all HTML, CSS, and JavaScript inline (fonts are loaded from a public CDN). There is no build step, no server, and no external dependencies to install. Open the file in a browser and it runs.

It is organised into three areas:

- **News & Updates**: a daily, automatically refreshed headline feed plus a curated **PV Updates & News** page that explains new guidelines and regulator safety actions.
- **Regulatory** — the drug development and submission lifecycle (US FDA-centric, with international context).
- **Pharmacovigilance** — post-approval and development-stage drug safety, aggregate reporting, MedDRA coding, signal management, and the EU/US regulatory frameworks.

Each area combines reference content, worked examples, interactive decision helpers, and self-check quizzes.

---

## What's new

### October 2026
- **My Space: news bookmarks and personal notes.** Tap ☆ on any headline in the news feed to bookmark it; bookmarks are listed under **My Space → Saved News** (kept even after a headline leaves the feed) with search, remove and "Add note". **My Space → My Notes** lets you create, search, edit and delete notes that save automatically, can link to a bookmarked article, and can be downloaded as a Markdown file. Both sync to your account when signed in and online, and work offline.
- **News feed now updates daily** (06:17 UTC) instead of weekly. The sidebar folder is now **Daily Feed**.
- **PV regulatory radar** added to the top of **PV Updates & News**: recent and upcoming ICH, EMA and FDA pharmacovigilance changes (status as of 27 Oct 2026). Examples: E2B(R3) now mandatory for FDA postmarketing ICSRs, AEMS replacing FAERS, the GVP Module VI revision, the EU pharma package, and the ICH Assembly in November.
- **Installable app (PWA).** Add the site to your iPhone/iPad home screen (or install it on Android/desktop) and it opens full-screen like an app, with its own icon, and keeps working offline after the first visit. See [Install as an app](#install-as-an-app-iphone-android-desktop).
- **New sidebar folder: News & Updates → Latest → ★ PV Updates & News.** A curated page of explained PV updates, newest first:
  - **ICH E2D(R1)** (Post-Approval Safety Data). In the EU it came into effect on 18 Mar 2026, and the transition period ended on 18 Sep 2026. The page covers:
    - the timeline and why the guideline was revised
    - a table of section-by-section changes
    - the new definitions: organised data collection system (ODCS), solicited vs spontaneous, patient support programme, digital platforms
    - a table for classifying a case by source
    - the documentation required for an ODCS without a protocol
    - the planned E2B(R3) C.5.4 change, a compliance checklist, and links to official sources
  - **MedDRA 29.1**: release dates, the replacement English package (v2), and the reported content changes.
  - **Regulator safety highlights, Aug – Oct 2026** from FDA and EMA PRAC.
- **App content updated to ICH E2D(R1):**
  - **Post-Marketing Guide → Case Handling (E2D(R1))**: new callouts for other observations and for spontaneous vs solicited, the R1 expectedness rules, and a rewritten sources table (PSP/MRP, non-interventional studies, digital platforms, duplicates).
  - **Regulatory Guidelines library**: the final E2D(R1) guideline replaces an incorrect "E2D(R1) Q&A" entry, and the 2003 E2D is kept and marked superseded.
  - **PV Deep Dive**: corrected the solicited-report wording. Solicited reports need a causality assessment and are not treated as spontaneous.
  - Guideline lists and the quiz citation now reference E2D(R1).
- **News feed** (`news.json`, refreshed by a GitHub Action, now daily) now includes **regulator sources**: FDA (MedWatch safety alerts, press releases) and EMA news. It also pulls BioSpace, Fierce Pharma, BioPharma Dive, RAPS, and new *Drug Safety* journal articles (via Crossref). The broken Endpoints feed (HTTP 403) was removed. See [`NEWS_SETUP.md`](NEWS_SETUP.md).
- **Fix:** removed a call to an undefined `setupFilters()` function. It threw an error on every sign-in and stopped the dashboard news preview from loading.

---

## Live demo / deployment

Because it is a single static file, it deploys anywhere that serves static pages:

**GitHub Pages**
1. Put `index.html` at the repository root (the file must be named `index.html`).
2. **Settings → Pages → Build and deployment → Source:** *Deploy from a branch*.
3. Select your branch and the `/ (root)` folder, then **Save**.
4. The site publishes at `https://<your-username>.github.io/<repo-name>/`.

**Netlify / Vercel / Cloudflare Pages** — drag-and-drop `index.html`, or connect the repo. No configuration required.

**Local** — just double-click `index.html` (see [Running locally](#running-locally)).

> After each change, hard-refresh the deployed page (**Ctrl/Cmd + Shift + R**) to bypass the browser cache.

---

## Install as an app (iPhone, Android, desktop)

The site is an installable web app (PWA). Open the live site (`https://<your-username>.github.io/<repo-name>/`), then:

- **iPhone / iPad (Safari):** tap **Share** → **Add to Home Screen** → **Add**. (In other iOS browsers, use their *Add to Home Screen* option.)
- **Android (Chrome):** tap **⋮** → **Install app** (or **Add to Home screen**).
- **Desktop (Chrome / Edge):** click the install icon in the address bar, or look for **Install** in the browser menu (wording varies by browser).

What you get:
- **Its own icon and a full-screen window**, with no browser bars.
- **Offline use after the first visit.** All guides, quizzes, the PV Updates page and the last downloaded news feed are cached on the device. If you have signed in on that device before, the app opens offline; saved data then uses the copy on the device.
- **Automatic updates.** When online, the app loads the latest version of the site; the cached copy is only used when there is no connection.

How it works: `manifest.webmanifest` (name, colours, icons), `icons/` (home-screen icons), and `sw.js` (a service worker that caches the app for offline use). Installation and offline use need the site served over **https** (GitHub Pages is fine); they do not work when `index.html` is opened directly from disk. If you change the caching rules or the list of pre-cached files in `sw.js`, bump `CACHE_VERSION` there.

---

## Features

- **Sidebar navigation** across News & Updates, My Space, Regulatory, and Pharmacovigilance.
- **My Space**: bookmark news headlines and keep personal notes, synced to your account and available offline.
- **News & Updates**: a daily auto-refreshed headline feed (`news.json`, built by a GitHub Action) and a curated **PV Updates & News** page explaining new guidelines (e.g., ICH E2D(R1), MedDRA releases) and regulator safety actions.
- **Interactive tools** — a pathway decision helper, development-lifecycle views, submission checklists, and document templates.
- **Deep-dive guides** — long-form, tabbed reference sections for the major PV aggregate reports and coding standards.
- **Live worked examples** — fully populated, section-by-section walk-throughs (illustrative data) that mirror the *actual* report structures.
- **Teaching scenarios** — step-by-step, educator-focused case walk-throughs with "situation → process → teaching point" framing and classroom exercises.
- **Self-check quizzes** — interactive, scored questions with explanations, embedded in each major guide plus standalone Regulatory and PV quizzes.
- **Global search** — searches across sections and tabs.
- **Consistent design system** — shared CSS classes, tab patterns, callouts, and tables throughout.
- **Installable & offline-capable** — install it on a phone or computer like an app; after the first visit the content works without a connection (see [Install as an app](#install-as-an-app-iphone-android-desktop)). Everything runs client-side; signed-in users' saved data syncs to their account when online.

---

## Content map

### My Space
| Icon | Section | What it covers |
|---|---------|----------------|
| ☆ | **Saved News** | Your bookmarked headlines from the news feed, with search, remove and "Add note" |
| ✎ | **My Notes** | Personal notes: create, search, edit, delete, autosave, link to an article, download as Markdown |

Bookmarks and notes are stored with your account (Supabase `user_data.meta`, field `ws`) and on the device (localStorage `reg_myspace_v1`, tagged with your user ID). When the two differ, the newer copy wins, so edits made offline are uploaded the next time you are online.

### News & Updates
| Icon | Section | What it covers |
|---|---------|----------------|
| ★ | **PV Updates & News** (Latest) | Curated, explained PV updates: a recent & upcoming ICH / EMA / FDA radar, ICH E2D(R1) section-by-section, MedDRA 29.1, and recent FDA / EMA PRAC safety actions |
| ◆ | Regulatory & PV News (Daily Feed) | Auto-refreshed headlines from regulators (FDA, EMA), industry news and the *Drug Safety* journal, filterable by source, category and ⚑ priority |

### Regulatory domain
| # | Section | What it covers |
|---|---------|----------------|
| 01 | Dashboard | Landing/overview |
| 02 | Pathway Decision Helper | Interactive guidance toward the right regulatory pathway |
| 03 | Development Lifecycle | End-to-end drug development stages |
| 04 | Development Considerations | Cross-cutting development topics |
| 05 | Clinical Trial Ops & GCP | Trial operations and Good Clinical Practice |
| 06 | FDA Meetings | Meeting types and interactions |
| 07 | Designations & Programs | Expedited programs and designations |
| 08 | Regulatory Guidelines | Curated regulatory reference library |
| 09 | Submission Checklists | Checklists by submission type |
| 10 | Document Templates | Reusable document scaffolds |
| 11 | Required Documents | Master index across submission types |
| 12 | Post-Approval Changes | Managing changes after approval |
| 13 | Medical Devices | Device-specific regulatory basics |
| 14 | Case Studies | Applied examples |
| 15 | eCTD Modules | Electronic Common Technical Document structure |
| 16 | Warning Letters | Enforcement examples |
| 17 | Regulatory Quiz | Interactive self-assessment |

### Pharmacovigilance domain
| # | Section | What it covers |
|---|---------|----------------|
| 18 | **PV Deep Dive** | Multi-tab PV reference (see tabs below) |
| 19 | **MedDRA Coding Guide** | Term-selection principles, worked examples, and a coding self-check |
| 20 | **PBRER Guide** | ICH E2C(R2) Periodic Benefit-Risk Evaluation Report — concepts, 20-section anatomy, a live section-by-section worked example, teaching scenarios, and a quiz |
| 21 | **DSUR Guide** | ICH E2F Development Safety Update Report — concepts, 20-section anatomy, a live worked example, teaching scenarios, and a quiz |
| 22 | **Post-Marketing Guide** | Post-marketing surveillance — case handling (ICH E2D(R1)), expedited/periodic reporting, signal & risk management, global frameworks, a live ICSR-to-signal-to-action case file, teaching scenarios, and a quiz |
| 23 | PV Quiz | Interactive self-assessment |

### PV Deep Dive tabs (Section 18)
Foundations · Glossary & Definitions · AEs & Causality · ICSRs · Aggregate Reports · Signal & Risk · Materiovigilance (devices) · Combination PV · Workflows · Safety Databases · Inspections · Global Authorities · **EMA & FDA Framework** · **AI in PV** · Guidelines & References

Highlights:
- **EMA & FDA Framework** — a detailed, QPPV-perspective reference to EU Good Pharmacovigilance Practices (GVP) modules and the US 21 CFR framework, with reporting-clock tables, PSMF/RMP structure, an EU-vs-US comparison, an abbreviations glossary, and primary citations.
- **AI in PV** — a summary of the CIOMS Working Group XIV guiding principles for responsible AI in pharmacovigilance, with QPPV operating notes and citation.

---

## Tech stack & architecture

- **HTML + CSS + vanilla JavaScript**, all inline in one file. No frameworks, no bundler.
- **Fonts** loaded from a public CDN (Google Fonts).
- **Client-side only.** No backend, no database, no analytics. The daily news feed is a static `news.json` file that a scheduled GitHub Action (`.github/workflows/update-news.yml` → `scripts/fetch-news.mjs`) regenerates and commits.
- **Rendering model:** each section/tab is produced by a JavaScript render function or a content object; a lightweight router shows/hides views and updates the active tab. A shared design system (CSS classes such as tables, callouts, tab bars) keeps everything visually consistent.
- **State:** interactive elements (quizzes, filters) hold state in memory during the session. Nothing is persisted, so refreshing resets interactive state.

> Note: because state is in-memory only, this is ideal for personal study. If you fork it for classroom tracking, you would need to add your own storage layer.

---

## Running locally

**Option 1 — open directly**
Double-click `index.html`, or drag it into any modern browser. Everything works offline (an internet connection only improves font loading), except the daily news feed: browsers often block loading `news.json` from `file://`, so use Option 2 to see it.

**Option 2 — local web server** (recommended for a production-like check)
```bash
# Python 3
python3 -m http.server 8000
# then visit http://localhost:8000
```
or
```bash
# Node
npx serve .
```

---

## Project structure

```
.
├── index.html                       # The entire application (HTML + CSS + JS inline)
├── news.json                        # Daily news feed data (auto-generated; do not edit by hand)
├── scripts/
│   └── fetch-news.mjs               # Builds news.json from RSS/Atom feeds + Crossref (no npm dependencies)
├── .github/
│   └── workflows/
│       └── update-news.yml          # Runs fetch-news.mjs daily at 06:17 UTC and commits news.json
├── NEWS_SETUP.md                    # How the daily news feed works and how to change sources
├── manifest.webmanifest             # Installable-app settings (name, colours, icons)
├── sw.js                            # Service worker: offline caching for the installed app
├── icons/                           # Home-screen / app icons (192, 512, maskable 512, Apple 180)
└── README.md                        # This file
```

The app itself is still one file, which makes it trivial to host, share and archive. The other files support the daily news feed and installing the app. The curated **PV Updates & News** page is static content inside `index.html`, so update it there (the `view-pvupdates` section).

---

## How the app is built (for contributors)

Development follows a consistent, verifiable workflow so the single large file stays healthy:

1. **Edit** `index.html` with targeted changes (new tab button, content block, render function, and search-index entry).
2. **Validate the JavaScript** by extracting the main `<script>` block and running a syntax check:
   ```bash
   # extract the largest <script> block to app.js, then:
   node --check app.js
   ```
3. **Verify wiring** — confirm each new tab button, content key, render branch, and search-index entry exists exactly once (e.g., with `grep`), and that existing sections remain intact.
4. **Keep the design system** — reuse the established CSS classes and tab patterns rather than introducing new styles.

Conventions used throughout:
- New guide sections follow the same tab architecture (`Overview → concept tabs → live example → teaching scenarios → self-check`).
- Live worked examples are aligned **section-for-section** with the corresponding report anatomy (verified programmatically).
- All example data in worked examples is **fabricated for teaching** and labelled as such.

---

## Sources & attribution

Content is written in original wording and summarises publicly available regulatory frameworks and standards. Primary sources referenced across the app include:

- **ICH** guidelines — e.g., E2A, E2B(R3), E2C(R2) (PBRER), E2D(R1), E2E, E2F (DSUR), and M1 (MedDRA).
- **MedDRA** term-selection principles (ICH-endorsed *Points to Consider*), summarised and reorganised for study. *MedDRA® is a registered trademark of ICH.*
- **EU** pharmaceutical legislation and **Good Pharmacovigilance Practices (GVP)** modules.
- **US FDA** — Title 21 CFR pharmacovigilance provisions, the FD&C Act/PHS Act, FDAAA, and relevant FDA guidances.
- **CIOMS Working Group XIV** — guiding principles for AI in pharmacovigilance (open-access source, summarised with citation).
- **WHO-UMC** — global pharmacovigilance and VigiBase context.
- **Regulator safety communications** (PV Updates & News page): FDA Drug Safety Communications, EMA PRAC meeting highlights, and MedDRA MSSO release notes, each linked from the relevant update.
- **Daily news feed**: headlines, dates and links only (no article text) from FDA, EMA, BioSpace, Fierce Pharma, BioPharma Dive, RAPS, and *Drug Safety* (article metadata via the Crossref API).

Where a section draws on a specific publication, the citation is shown inline within that section. Trademarks and guideline names belong to their respective owners. This project claims no endorsement by any of these bodies.

---

## Roadmap

Possible future additions (contributions welcome):

- A DSUR/Post-Marketing question bank folded into the main PV quiz.
- Instructor answer keys and discussion prompts for the teaching scenarios.
- An ICH & WHO framework tab to sit beside the EMA & FDA Framework tab.
- Optional persistence (local storage) for quiz progress if used in a classroom.
- A native iOS/Android app (e.g., Capacitor) for App Store / Google Play distribution, building on the installable web app.

---

## Disclaimer

This platform is an independent, personal, **educational** resource. It summarises and reorganises public regulatory frameworks in original wording and uses fabricated, clearly-labelled examples for teaching. It does **not** reproduce proprietary or copyrighted source text. It is not affiliated with, endorsed by, or an official publication of ICH, EMA, FDA, CIOMS, WHO-UMC, or any other authority. Nothing here is legal, medical, or regulatory advice. Before acting on any topic, verify against the current official guideline, regulation, or your organisation's procedures.

---

## License

Choose a license for your repository. Two common options:

- **Code** (the application): the [MIT License](https://opensource.org/licenses/MIT) is a simple, permissive choice for the HTML/CSS/JS.
- **Educational content/text**: if you want to allow non-commercial sharing with attribution, [Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/) is a common fit.

Add a `LICENSE` file (and, if you split terms, note in this section which license applies to code versus content). Until a license is added, all rights are reserved by default.

---

*Built as a personal knowledge project for regulatory affairs and pharmacovigilance education.*
