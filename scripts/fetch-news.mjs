// scripts/fetch-news.mjs
// Fetches reputable regulatory / pharmacovigilance / biopharma feeds and writes news.json.
// Stores ONLY: source, headline (title), publication date, link, plus derived tags
// (category, priority flag). It deliberately does NOT store article body text — links
// point back to the original source, which is the intended use of RSS/Atom feeds.
//
// Runs on Node 20+ / 24 (global fetch available). No external npm dependencies.

import { writeFileSync } from "node:fs";

// --- Sources -------------------------------------------------------------
// Each source lists one or more feed URLs. If one URL fails, the others still run.
// Optional fields:
//   type: "crossref"   -> feeds are Crossref REST API URLs (JSON), used for journals
//   defaultCategory    -> category to use when no keyword rule matches (instead of "General")
//   category           -> fixed category for every item (skips keyword rules; used for journals)
// NOTES (check the "[Source] ..." lines in the Actions log when a source goes quiet):
// - Regulator feed URLs below have returned items from GitHub Actions runners.
//   FDA's "drugs" page feed is deliberately not used: it mostly lists page edits with
//   misleading dates. WHO, Health Canada and TGA feeds returned nothing from Actions runners.
// - RAPS retired its native RSS and publishes via FetchRSS (URL from the "RSS Feed" link
//   on raps.org/news-insights/regulatory-focus.html).
// - Endpoints News was removed: its feed returns HTTP 403 to automated requests.
// - MHRA was removed by choice (mostly device field-safety notices). To restore it, add:
//   { source: "MHRA", tier: "regulator", defaultCategory: "Safety / PV", feeds: [
//     "https://www.gov.uk/drug-safety-update.atom", "https://www.gov.uk/drug-device-alerts.atom" ]}
//   and a matching 'MHRA' colour in SOURCE_META in index.html.
// - Springer's search.rss for Drug Safety returns no items, so the journal is read from
//   Crossref instead (Drug Safety eISSN 1179-1942).
const SOURCES = [
  { source: "FDA", tier: "regulator", defaultCategory: "Regulatory / Policy", feeds: [
    "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml",
    "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml"
  ]},
  { source: "EMA", tier: "regulator", defaultCategory: "Regulatory / Policy", feeds: [
    "https://www.ema.europa.eu/en/news.xml"
  ]},
  { source: "BioSpace", tier: "industry", feeds: [
    "https://www.biospace.com/all-news.rss",
    "https://www.biospace.com/fda.rss",
    "https://www.biospace.com/policy.rss",
    "https://www.biospace.com/deals.rss",
    "https://www.biospace.com/drug-delivery.rss"
  ]},
  { source: "Fierce Pharma", tier: "industry", feeds: [
    "https://www.fiercepharma.com/rss/xml"
  ]},
  { source: "BioPharma Dive", tier: "industry", feeds: [
    "https://www.biopharmadive.com/feeds/news/",
    "https://www.biopharmadive.com/feeds/news"
  ]},
  { source: "RAPS", tier: "industry", feeds: [
    "https://fetchrss.com/feed/1w2Af33Ym6mQ1wCHDT7rBDVj.rss"
  ]},
  { source: "Drug Safety", tier: "journal", type: "crossref", category: "Safety / PV", feeds: [
    "https://api.crossref.org/journals/1179-1942/works?sort=published&order=desc&rows=30&filter=type:journal-article&select=title,URL,published,published-online,created"
  ]}
];

const MAX_PER_SOURCE = 15;
const MAX_TOTAL = 160;
const MAX_AGE_DAYS = 150;
const TIMEOUT_MS = 20000;

// --- Prioritization -------------------------------------------------------
// Priority = genuine safety / urgent signals (kept deliberately narrow so it stays useful).
// "Pharmacovigilance" is included per requirements.
const PRIORITY_KEYWORDS = [
  "pharmacovigilance", "recall", "recalled", "safety alert", "safety warning", "boxed warning",
  "black box", "black triangle", "withdrawn", "withdrawal", "suspension", "suspended",
  "contraindication", "serious risk", "urgent", "field safety", "falsified", "counterfeit",
  "contaminated", "substandard", "shortage", "prac", "referral", "safety signal",
  "rems", "risk minimisation", "risk minimization", "dhpc", "psusa", "adverse reaction",
  "adverse event", "death", "deaths", "fatal", "hepatotox", "cardiotox", "toxicity"
];

// --- Categorization -------------------------------------------------------
// Canonical categories (must match the labels/colours used in index.html).
// First matching group wins, so order matters (safety first, business last before General).
const CATEGORY_RULES = [
  { name: "Safety / PV", terms: [
    "pharmacovigilance", "safety", "recall", "recalled", "withdrawn", "withdrawal", "warning",
    "boxed warning", "black box", "adverse", "toxicity", "hepatotox", "cardiotox", "side effect",
    "contraindication", "falsified", "counterfeit", "contaminated", "substandard", "death",
    "deaths", "fatal", "prac", "signal", "rems", "risk minim", "dhpc", "psusa", "shortage"
  ]},
  { name: "Approval", terms: [
    "approv", "cleared", "clearance", "authoris", "authoriz", "complete response", " crl",
    "pdufa", "adcomm", "advisory committee", "accelerated approval", "priority review",
    "breakthrough", "fast track", "orphan", "bla ", "nda ", "marketing authorisation",
    "positive opinion", "chmp", "recommended for approval", "green light", "label expansion",
    "indication"
  ]},
  { name: "Clinical trial", terms: [
    "phase 1", "phase 2", "phase 3", "phase i", "phase ii", "phase iii", "clinical trial",
    "topline", "readout", "enrol", "endpoint", "pivotal", "interim", "cohort", "study met",
    "study results", "trial results", "first patient", "dosed"
  ]},
  { name: "Regulatory / Policy", terms: [
    "fda", "ema", "mhra", "who", "ich", "cioms", "regulator", "regulatory", "guidance",
    "guideline", "regulation", "policy", "draft", "consultation", "legislation", "law",
    "framework", "rule", "notice", "reflection paper", "q&a", "inspection", "warning letter",
    "483", "compliance", "gmp", "gcp", "gvp"
  ]},
  { name: "Deals / Business", terms: [
    "acqui", "merger", "merge", "buyout", "licensing", "license deal", "deal", "funding",
    "financing", "ipo", "layoff", "restructur", "partnership", "collaborat", "raise",
    "series a", "series b", "series c", "million", "billion", "stock", "shares", "earnings",
    "revenue", "q1", "q2", "q3", "q4"
  ]}
];

function classify(title, src) {
  const t = (" " + (title || "").toLowerCase() + " ");
  // Journal article titles routinely mention "adverse events", "deaths", etc.; the priority
  // flag is reserved for actionable safety news, so it is not applied to journals.
  const priority = src.tier !== "journal" && PRIORITY_KEYWORDS.some((k) => t.includes(k));
  if (src.category) return { priority, category: src.category };
  let category = src.defaultCategory || "General";
  for (const rule of CATEGORY_RULES) {
    if (rule.terms.some((term) => t.includes(term))) { category = rule.name; break; }
  }
  return { priority, category };
}

// --- Tiny XML helpers ----------------------------------------------------
function stripCdata(s) { return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"); }
function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
function clean(s) {
  if (!s) return "";
  return decodeEntities(stripCdata(s)).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
function firstMatch(block, regexes) {
  for (const re of regexes) { const m = block.match(re); if (m && m[1]) return m[1]; }
  return "";
}

function parseItems(xml) {
  const out = [];
  const rssItems = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of rssItems) {
    const title = clean(firstMatch(block, [/<title[^>]*>([\s\S]*?)<\/title>/i]));
    const link = clean(firstMatch(block, [/<link[^>]*>([\s\S]*?)<\/link>/i, /<guid[^>]*>([\s\S]*?)<\/guid>/i]));
    const date = clean(firstMatch(block, [
      /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i, /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i,
      /<(?:\w+:)?published[^>]*>([\s\S]*?)<\/(?:\w+:)?published>/i,
      /<(?:\w+:)?issued[^>]*>([\s\S]*?)<\/(?:\w+:)?issued>/i,
      /<(?:\w+:)?updated[^>]*>([\s\S]*?)<\/(?:\w+:)?updated>/i,
      /<(?:\w+:)?modified[^>]*>([\s\S]*?)<\/(?:\w+:)?modified>/i
    ]));
    if (title && link) out.push({ title, link, date, block });
  }
  const atomEntries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const block of atomEntries) {
    const title = clean(firstMatch(block, [/<title[^>]*>([\s\S]*?)<\/title>/i]));
    const linkAlt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
    const linkAny = block.match(/<link[^>]*href=["']([^"']+)["']/i);
    const link = clean((linkAlt && linkAlt[1]) || (linkAny && linkAny[1]) || "");
    // Prefer <published>: <updated> changes whenever a page is edited (e.g., GOV.UK alerts).
    const date = clean(firstMatch(block, [/<published[^>]*>([\s\S]*?)<\/published>/i, /<updated[^>]*>([\s\S]*?)<\/updated>/i]));
    if (title && link) out.push({ title, link, date, block });
  }
  return out;
}

// Crossref REST API (JSON) -> same {title, link, date} shape as parseItems().
function parseCrossref(text) {
  const items = (JSON.parse(text).message || {}).items || [];
  return items.map((w) => {
    const pub = w["published-online"] || w.published || {};
    const parts = (pub["date-parts"] && pub["date-parts"][0]) || [];
    const date = parts[0]
      ? new Date(Date.UTC(parts[0], (parts[1] || 1) - 1, parts[2] || 1)).toISOString()
      : ((w.created && w.created["date-time"]) || "");
    return { title: clean((w.title || [])[0] || ""), link: w.URL || "", date };
  }).filter((it) => it.title && it.link);
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; reg-pv-training-newsbot/1.2; +github actions; educational)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*"
      }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.text();
  } finally { clearTimeout(t); }
}

// Parse non-RFC dates some feeds use, e.g. Drupal's "Fri, 10/09/2026 - 14:30" or
// "October 9, 2026 10:30am". Returns a Date or null. Time zone is not known, so UTC is
// assumed; only the day is shown in the app.
function parseLooseDate(d) {
  let m = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D+(\d{1,2}):(\d{2}))?/);
  if (m) return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2], +(m[4] || 0), +(m[5] || 0)));
  m = d.match(/([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})/);
  if (m) { const t = new Date(m[1] + " " + m[2] + ", " + m[3] + " UTC"); if (!isNaN(t)) return t; }
  return null;
}

function isoOrEmpty(d) {
  if (!d) return "";
  let t = new Date(d);
  if (isNaN(t)) t = parseLooseDate(d);
  if (!t || isNaN(t)) return "";
  // Some feeds stamp items with future dates; never show a date later than now.
  return (t.getTime() > Date.now() ? new Date() : t).toISOString();
}
function tooOld(iso) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() > MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

async function run() {
  const all = [];
  const summary = [];
  for (const src of SOURCES) {
    let collected = [];
    for (const url of src.feeds) {
      try {
        const text = await fetchText(url);
        const parsed = src.type === "crossref" ? parseCrossref(text) : parseItems(text);
        const items = parsed.map((it) => {
          const { priority, category } = classify(it.title, src);
          return {
            source: src.source, tier: src.tier,
            title: it.title, link: it.link, date: isoOrEmpty(it.date),
            category, priority
          };
        });
        collected = collected.concat(items);
        console.log("[" + src.source + "] " + items.length + " items from " + url);
        const undated = parsed.filter((it) => !isoOrEmpty(it.date));
        if (undated.length) {
          // Help diagnose feeds that use an unexpected date element.
          const tags = undated[0].block ? [...new Set((undated[0].block.match(/<([\w:]+)[\s>]/g) || []).map((t) => t.slice(1, -1)))] : [];
          console.warn("[" + src.source + "] " + undated.length + " items without a usable date"
            + (undated[0].date ? "; sample raw date: \"" + undated[0].date + "\"" : "")
            + (tags.length ? "; item tags: " + tags.join(", ") : ""));
        }
      } catch (e) {
        console.warn("[" + src.source + "] FAILED " + url + ": " + e.message);
      }
    }
    const seen = new Set();
    collected = collected
      .filter((it) => it.link && !seen.has(it.link) && seen.add(it.link))
      .filter((it) => !tooOld(it.date))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, MAX_PER_SOURCE);
    summary.push(src.source + "=" + collected.length);
    all.push(...collected);
  }

  all.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return new Date(b.date || 0) - new Date(a.date || 0);
  });
  const items = all.slice(0, MAX_TOTAL);

  const payload = {
    generated: new Date().toISOString(),
    sources: SOURCES.map((s) => s.source),
    categories: ["Safety / PV", "Approval", "Clinical trial", "Regulatory / Policy", "Deals / Business", "General"],
    count: items.length,
    items
  };

  console.log("Per-source kept: " + summary.join(", "));

  if (items.length === 0) {
    console.error("No items fetched from any source. Leaving existing news.json unchanged.");
    process.exit(1);
  }

  writeFileSync("news.json", JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log("Wrote news.json with " + items.length + " items (" + items.filter((i) => i.priority).length + " priority).");
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
