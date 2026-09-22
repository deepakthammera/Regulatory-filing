// scripts/fetch-news.mjs
// Fetches official regulator RSS/Atom feeds and writes news.json.
// Stores ONLY: source, headline (title), publication date, link, and (if present) a short category.
// It deliberately does NOT store article body text — links point back to the original source,
// which is the intended use of RSS/Atom feeds.
//
// Runs on Node 20+ (global fetch available). No external npm dependencies.

import { writeFileSync } from "node:fs";

// --- Sources -------------------------------------------------------------
// Each source lists one or more feed URLs. If one URL fails, others still run.
// GOV.UK pages expose an Atom feed by appending `.atom` to the page URL.
const SOURCES = [
  {
    source: "FDA",
    feeds: [
      "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml",
      "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drugs/rss.xml"
    ]
  },
  {
    source: "EMA",
    feeds: [
      // EMA "What's new" / news feed. If EMA changes the path, update here.
      "https://www.ema.europa.eu/en/rss.xml",
      "https://www.ema.europa.eu/en/news.xml"
    ]
  },
  {
    source: "MHRA",
    feeds: [
      // GOV.UK Atom feeds (append .atom to the listing page).
      "https://www.gov.uk/drug-safety-update.atom",
      "https://www.gov.uk/drug-device-alerts.atom"
    ]
  },
  {
    source: "WHO",
    feeds: [
      // WHO news RSS.
      "https://www.who.int/rss-feeds/news-english.xml"
    ]
  }
];

const MAX_PER_SOURCE = 15;     // keep the feed tidy
const MAX_AGE_DAYS = 120;      // drop very old items
const TIMEOUT_MS = 20000;

// --- Tiny XML helpers (regex-based; good enough for RSS/Atom titles/links/dates) ---
function stripCdata(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}
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
  for (const re of regexes) {
    const m = block.match(re);
    if (m && m[1]) return m[1];
  }
  return "";
}

function parseItems(xml) {
  const out = [];
  // RSS <item> ... </item>
  const rssItems = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of rssItems) {
    const title = clean(firstMatch(block, [/<title[^>]*>([\s\S]*?)<\/title>/i]));
    const link = clean(firstMatch(block, [/<link[^>]*>([\s\S]*?)<\/link>/i, /<guid[^>]*>([\s\S]*?)<\/guid>/i]));
    const date = clean(firstMatch(block, [/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i, /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i]));
    const category = clean(firstMatch(block, [/<category[^>]*>([\s\S]*?)<\/category>/i]));
    if (title && link) out.push({ title, link, date, category });
  }
  // Atom <entry> ... </entry>
  const atomEntries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const block of atomEntries) {
    const title = clean(firstMatch(block, [/<title[^>]*>([\s\S]*?)<\/title>/i]));
    // Atom link is an attribute: <link href="..."/>
    let link = "";
    const linkAlt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
    const linkAny = block.match(/<link[^>]*href=["']([^"']+)["']/i);
    link = clean((linkAlt && linkAlt[1]) || (linkAny && linkAny[1]) || "");
    const date = clean(firstMatch(block, [/<updated[^>]*>([\s\S]*?)<\/updated>/i, /<published[^>]*>([\s\S]*?)<\/published>/i]));
    const category = clean(firstMatch(block, [/<category[^>]*term=["']([^"']+)["']/i]));
    if (title && link) out.push({ title, link, date, category });
  }
  return out;
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "reg-pv-training-newsbot/1.0 (+github actions; educational)" }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function isoOrEmpty(d) {
  if (!d) return "";
  const t = new Date(d);
  return isNaN(t) ? "" : t.toISOString();
}

function tooOld(iso) {
  if (!iso) return false; // keep items with no date
  const ageMs = Date.now() - new Date(iso).getTime();
  return ageMs > MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

async function run() {
  const all = [];
  for (const src of SOURCES) {
    let collected = [];
    for (const url of src.feeds) {
      try {
        const xml = await fetchText(url);
        const items = parseItems(xml).map((it) => ({
          source: src.source,
          title: it.title,
          link: it.link,
          date: isoOrEmpty(it.date),
          category: it.category || ""
        }));
        collected = collected.concat(items);
        console.log(`[${src.source}] ${items.length} items from ${url}`);
      } catch (e) {
        console.warn(`[${src.source}] FAILED ${url}: ${e.message}`);
      }
    }
    // de-duplicate by link, drop very old, sort newest-first, cap per source
    const seen = new Set();
    collected = collected
      .filter((it) => it.link && !seen.has(it.link) && seen.add(it.link))
      .filter((it) => !tooOld(it.date))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, MAX_PER_SOURCE);
    all.push(...collected);
  }

  // Final sort newest-first across all sources
  all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const payload = {
    generated: new Date().toISOString(),
    sources: SOURCES.map((s) => s.source),
    count: all.length,
    items: all
  };

  // If everything failed, don't clobber a good file with an empty one.
  if (all.length === 0) {
    console.error("No items fetched from any source. Leaving existing news.json unchanged.");
    process.exit(1);
  }

  writeFileSync("news.json", JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`Wrote news.json with ${all.length} items.`);
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
