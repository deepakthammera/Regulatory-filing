// scripts/fetch-news.mjs
// Fetches official + reputable regulatory / pharmacovigilance feeds and writes news.json.
// Stores ONLY: source, headline (title), publication date, link, plus derived tags
// (category, priority flag). It deliberately does NOT store article body text — links
// point back to the original source, which is the intended use of RSS/Atom feeds.
//
// Runs on Node 20+ / 24 (global fetch available). No external npm dependencies.

import { writeFileSync } from "node:fs";

// --- Sources -------------------------------------------------------------
// Each source lists one or more feed URLs. If one URL fails, the others still run.
// GOV.UK pages expose an Atom feed by appending `.atom` to the page URL.
// tier: "regulator" (primary authority) or "industry" (trade/news).
const SOURCES = [
  { source: "FDA",   tier: "regulator", feeds: [
    "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml",
    "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drugs/rss.xml"
  ]},
  { source: "EMA",   tier: "regulator", feeds: [
    "https://www.ema.europa.eu/en/rss.xml",
    "https://www.ema.europa.eu/en/news.xml"
  ]},
  { source: "MHRA",  tier: "regulator", feeds: [
    "https://www.gov.uk/drug-safety-update.atom",
    "https://www.gov.uk/drug-device-alerts.atom"
  ]},
  { source: "WHO",   tier: "regulator", feeds: [
    "https://www.who.int/rss-feeds/news-english.xml"
  ]},
  { source: "Health Canada", tier: "regulator", feeds: [
    "https://recalls-rappels.canada.ca/en/feed/all.atom",
    "https://recalls-rappels.canada.ca/en/feed/health-product.atom"
  ]},
  { source: "TGA",   tier: "regulator", feeds: [
    "https://www.tga.gov.au/rss/safety-alerts.xml",
    "https://www.tga.gov.au/news/rss.xml"
  ]},
  { source: "Federal Register (FDA)", tier: "regulator", feeds: [
    "https://www.federalregister.gov/documents/search.rss?conditions%5Bagencies%5D%5B%5D=food-and-drug-administration"
  ]},
  { source: "ICH",   tier: "regulator", feeds: [
    "https://www.ich.org/feed",
    "https://www.ich.org/rss.xml"
  ]},
  { source: "CIOMS", tier: "regulator", feeds: [
    "https://cioms.ch/feed/"
  ]},
  { source: "RAPS",  tier: "industry", feeds: [
    "https://www.raps.org/rss",
    "https://www.raps.org/news-and-articles/news-articles.rss"
  ]}
];

const MAX_PER_SOURCE = 12;
const MAX_TOTAL = 120;
const MAX_AGE_DAYS = 120;
const TIMEOUT_MS = 20000;

// --- Prioritization & categorization -------------------------------------
const PRIORITY_KEYWORDS = [
  "pharmacovigilance", "recall", "safety alert", "safety warning", "boxed warning",
  "black triangle", "withdrawal", "withdrawn", "suspension", "suspended", "contraindication",
  "serious risk", "urgent", "field safety", "falsified", "contaminated", "substandard",
  "shortage", "prac", "referral", "signal", "rems", "risk minimisation", "risk minimization",
  "direct healthcare professional", "dhpc", "psusa", "adverse reaction", "adverse event",
  "death", "fatal", "hepatotoxicity", "cardiotoxicity"
];

const CATEGORY_RULES = [
  { name: "Safety alert",      terms: ["recall", "safety alert", "safety warning", "boxed warning", "black triangle", "withdrawal", "withdrawn", "suspension", "suspended", "contraindication", "field safety", "falsified", "contaminated", "substandard", "dhpc", "direct healthcare professional", "adverse reaction", "adverse event", "hepatotox", "cardiotox", "death", "fatal"] },
  { name: "Pharmacovigilance", terms: ["pharmacovigilance", "prac", "signal", "psusa", "rems", "risk minimisation", "risk minimization", "periodic safety", "pbrer", "psur", "dsur"] },
  { name: "Shortage",          terms: ["shortage", "supply", "discontinuation", "out of stock"] },
  { name: "Approval",          terms: ["approv", "authoris", "authoriz", "marketing authorisation", "recommended for approval", "chmp", "positive opinion", "cleared", "licence", "license"] },
  { name: "Guidance / Policy", terms: ["guidance", "guideline", "consultation", "draft", "policy", "regulation", "rule", "notice", "framework", "reflection paper", "q&a"] }
];

function classify(title) {
  const t = (title || "").toLowerCase();
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
    .replace(/&amp;/g, "&");
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
      headers: { "User-Agent": "reg-pv-training-newsbot/1.1 (+github actions; educational)" }
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
    categories: ["Safety alert", "Pharmacovigilance", "Shortage", "Approval", "Guidance / Policy", "General"],
    count: items.length,
    items
  };

  if (items.length === 0) {
    console.error("No items fetched from any source. Leaving existing news.json unchanged.");
    process.exit(1);
  }

  writeFileSync("news.json", JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log("Wrote news.json with " + items.length + " items (" + items.filter((i) => i.priority).length + " priority).");
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
