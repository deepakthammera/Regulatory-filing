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
// NOTE: RAPS retired its native RSS and now publishes via FetchRSS (URL taken from the
// live "RSS Feed" link on raps.org/news-insights/regulatory-focus.html). CIOMS is a
// WordPress site, so /feed/ is the standard feed. ICH has no reliable public RSS, so we
// try a couple of candidates; it may return nothing on a given week.
const SOURCES = [
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
  { source: "Endpoints", tier: "industry", feeds: [
    "https://endpts.com/feed/",
    "https://endpts.com/feed"
  ]},
  { source: "BioPharma Dive", tier: "industry", feeds: [
    "https://www.biopharmadive.com/feeds/news/",
    "https://www.biopharmadive.com/feeds/news"
  ]},
  { source: "RAPS", tier: "industry", feeds: [
    "https://fetchrss.com/feed/1w2Af33Ym6mQ1wCHDT7rBDVj.rss",
    "https://fetchrss.com/feed/1w2Af33Ym6mQ1w2Ah02uB5hb.rss"
  ]},
  { source: "Drug Safety", tier: "journal", feeds: [
    "https://link.springer.com/search.rss?query=&facet-journal-id=40264",
    "https://link.springer.com/search.rss?facet-journal-id=40264&channel-name=Drug+Safety"
  ]}
];

const MAX_PER_SOURCE = 15;
const MAX_TOTAL = 120;
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

function classify(title) {
  const t = (" " + (title || "").toLowerCase() + " ");
  const priority = PRIORITY_KEYWORDS.some((k) => t.includes(k));
  let category = "General";
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
    const date = clean(firstMatch(block, [/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i, /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i]));
    if (title && link) out.push({ title, link, date });
  }
  const atomEntries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const block of atomEntries) {
    const title = clean(firstMatch(block, [/<title[^>]*>([\s\S]*?)<\/title>/i]));
    const linkAlt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
    const linkAny = block.match(/<link[^>]*href=["']([^"']+)["']/i);
    const link = clean((linkAlt && linkAlt[1]) || (linkAny && linkAny[1]) || "");
    const date = clean(firstMatch(block, [/<updated[^>]*>([\s\S]*?)<\/updated>/i, /<published[^>]*>([\s\S]*?)<\/published>/i]));
    if (title && link) out.push({ title, link, date });
  }
  return out;
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
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
      }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.text();
  } finally { clearTimeout(t); }
}

function isoOrEmpty(d) {
  if (!d) return "";
  const t = new Date(d);
  return isNaN(t) ? "" : t.toISOString();
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
        const xml = await fetchText(url);
        const items = parseItems(xml).map((it) => {
          const { priority, category } = classify(it.title);
          return {
            source: src.source, tier: src.tier,
            title: it.title, link: it.link, date: isoOrEmpty(it.date),
            category, priority
          };
        });
        collected = collected.concat(items);
        console.log("[" + src.source + "] " + items.length + " items from " + url);
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
