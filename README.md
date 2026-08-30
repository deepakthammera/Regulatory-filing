# Regulatory Affairs & Pharmacovigilance Training Platform

A single-file, self-contained web application for learning **drug regulatory affairs** and **pharmacovigilance (PV)**. It is built as an educational reference and study tool for students, educators, and early-career professionals, with enough operational depth to serve serious learners.

> **Educational use only.** This project is a personal, non-commercial knowledge resource. It is **not** official guidance from any regulator or standards body, **not** a substitute for the primary regulations/guidelines it summarises, and **not** legal, medical, or regulatory advice. Always work from the current official source and your organisation's SOPs.

---

## Table of Contents

- [What this is](#what-this-is)
- [Live demo / deployment](#live-demo--deployment)
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

It is organised into two domains:

- **Regulatory** — the drug development and submission lifecycle (US FDA-centric, with international context).
- **Pharmacovigilance** — post-approval and development-stage drug safety, aggregate reporting, MedDRA coding, signal management, and the EU/US regulatory frameworks.

Each area combines reference content, worked examples, interactive decision helpers, and self-check quizzes.

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

## Features

- **Two-domain navigation** — Regulatory and Pharmacovigilance, with a persistent sidebar.
- **Interactive tools** — a pathway decision helper, development-lifecycle views, submission checklists, and document templates.
- **Deep-dive guides** — long-form, tabbed reference sections for the major PV aggregate reports and coding standards.
- **Live worked examples** — fully populated, section-by-section walk-throughs (illustrative data) that mirror the *actual* report structures.
- **Teaching scenarios** — step-by-step, educator-focused case walk-throughs with "situation → process → teaching point" framing and classroom exercises.
- **Self-check quizzes** — interactive, scored questions with explanations, embedded in each major guide plus standalone Regulatory and PV quizzes.
- **Global search** — searches across sections and tabs.
- **Consistent design system** — shared CSS classes, tab patterns, callouts, and tables throughout.
- **Fully offline-capable** — everything runs client-side; no data leaves the browser.

---

## Content map

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
| 22 | **Post-Marketing Guide** | Post-marketing surveillance — case handling (ICH E2D), expedited/periodic reporting, signal & risk management, global frameworks, a live ICSR-to-signal-to-action case file, teaching scenarios, and a quiz |
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
- **Client-side only.** No backend, no database, no analytics.
- **Rendering model:** each section/tab is produced by a JavaScript render function or a content object; a lightweight router shows/hides views and updates the active tab. A shared design system (CSS classes such as tables, callouts, tab bars) keeps everything visually consistent.
- **State:** interactive elements (quizzes, filters) hold state in memory during the session. Nothing is persisted, so refreshing resets interactive state.

> Note: because state is in-memory only, this is ideal for personal study. If you fork it for classroom tracking, you would need to add your own storage layer.

---

## Running locally

**Option 1 — open directly**
Double-click `index.html`, or drag it into any modern browser. Everything works offline (an internet connection only improves font loading).

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
├── index.html        # The entire application (HTML + CSS + JS inline)
└── README.md         # This file
```

That is intentional: keeping everything in one file makes the app trivial to host, share, and archive.

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

- **ICH** guidelines — e.g., E2A, E2B(R3), E2C(R2) (PBRER), E2D, E2E, E2F (DSUR), and M1 (MedDRA).
- **MedDRA** term-selection principles (ICH-endorsed *Points to Consider*), summarised and reorganised for study. *MedDRA® is a registered trademark of ICH.*
- **EU** pharmaceutical legislation and **Good Pharmacovigilance Practices (GVP)** modules.
- **US FDA** — Title 21 CFR pharmacovigilance provisions, the FD&C Act/PHS Act, FDAAA, and relevant FDA guidances.
- **CIOMS Working Group XIV** — guiding principles for AI in pharmacovigilance (open-access source, summarised with citation).
- **WHO-UMC** — global pharmacovigilance and VigiBase context.

Where a section draws on a specific publication, the citation is shown inline within that section. Trademarks and guideline names belong to their respective owners. This project claims no endorsement by any of these bodies.

---

## Roadmap

Possible future additions (contributions welcome):

- A DSUR/Post-Marketing question bank folded into the main PV quiz.
- Instructor answer keys and discussion prompts for the teaching scenarios.
- An ICH & WHO framework tab to sit beside the EMA & FDA Framework tab.
- Optional persistence (local storage) for quiz progress if used in a classroom.
- Packaging as an installable Progressive Web App (PWA) for offline mobile use.

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
