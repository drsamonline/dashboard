'use strict';
/**
 * Structure test for the system console.
 *
 * The console's layout is a contract the owner cares about: the STATISTICS come
 * first and the LISTS come after, every list can COLLAPSE, and the statistics
 * block collapses too. That is easy to lose in a reorder, so it is asserted
 * here rather than remembered.
 *
 * 2026-10-30: the owner's own upload on 2026-10-28 (c01a3e6) folded the charts
 * into a collapsible "Statistics" <details> and moved the press/controls block
 * above them. The charts are still there and still come first - what changed is
 * that they are now behind a summary, not under a bare "Visuals" heading. The
 * assertions below follow that contract; they are not relaxed, they are moved
 * onto what the page actually promises.
 */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// The dashboard has one page: the app at docs/play/. A root index.html existed until
// the 2026-11-05 page audit deleted it, and this default kept pointing at it - so the
// layout test was reading a file that was not there. Ask the repo where its page is.
const fs_ = require("fs");
function resolvePage() {
  if (process.argv[2]) return process.argv[2];
  const root = path.join(__dirname, "..");
  const declared = path.join(root, "PAGES.json");
  if (fs_.existsSync(declared)) {
    try {
      const pages = JSON.parse(fs_.readFileSync(declared, "utf8"));
      if (pages.app) return path.join(root, pages.app);
    } catch (e) { /* fall through to the last resort below */ }
  }
  return path.join(root, "docs", "play", "index.html");
}
const file = resolvePage();
const html = fs.readFileSync(file, "utf8");
// Parse WITHOUT running scripts: this is a layout test, not a runtime test.
const doc = new JSDOM(html).window.document;

let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? (pass++, console.log("PASS  " + name)) : (fail++, console.log("FAIL  " + name)); };

// 1. the statistics block exists, is collapsible, and comes before every list
const charts = doc.querySelector(".charts");
ok("the statistics grid (.charts) exists", !!charts);

const statsDetails = (() => {
  let p = charts;
  while (p) { if (p.tagName === "DETAILS") return p; p = p.parentElement; }
  return null;
})();
ok("the statistics block is collapsible (inside <details>)", !!statsDetails);
ok("the statistics block has a <summary> you can click",
   !!statsDetails && !!statsDetails.querySelector("summary"));
ok("the statistics summary names what is inside it",
   !!statsDetails && /statistics|chart|activity|health/i.test(statsDetails.querySelector("summary").textContent));

const listIds = ["needsBody", "automation", "roadmap", "paused", "repos"];
// "Needs you" is deliberately ABOVE the statistics: it is the one thing on the
// page that is asking for a decision, so it is not below a fold. Everything
// else - the automation, the roadmap, the paused register, the repositories -
// still comes after the statistics.
const afterStats = ["automation", "roadmap", "paused", "repos"];
ok("the statistics come before the lists (" + afterStats.join(", ") + ")", (() => {
  if (!charts) return false;
  return afterStats.every((id) => {
    const el = doc.getElementById(id);
    if (!el) return false;
    return !!(charts.compareDocumentPosition(el) & 4);   // el FOLLOWS the statistics
  });
})());

// 1b. a section heading still introduces the block above it
ok("a section heading (.sec) still precedes the statistics", (() => {
  if (!charts) return false;
  let p = charts;
  while (p) {
    if (p.classList && p.classList.contains("sec")) return true;
    if (p.previousElementSibling) {
      let q = p.previousElementSibling;
      while (q) { if (q.classList && q.classList.contains("sec")) return true; q = q.previousElementSibling; }
    }
    p = p.parentElement;
  }
  return false;
})());

// 2. every list is inside a collapsible <details>
listIds.forEach((id) => {
  const el = doc.getElementById(id);
  let p = el, inside = false;
  while (p) { if (p.tagName === "DETAILS") { inside = true; break; } p = p.parentElement; }
  ok("the '" + id + "' list is collapsible (inside <details>)", !!el && inside);
});

// 3. the console's own hooks are all still there (a reorder must not drop one)
["cards","planPanel","communityPanel","trafficPanel","needsBody","controls","ideaBox",
 "activity","trend","lb","specgap","runlog","conf","cats","quota","automation","roadmap",
 "feed","paused","repos","q","cat"].forEach((id) => ok("hook #" + id + " still exists", !!doc.getElementById(id)));

// 3b. a long panel must not stretch the row it shares (the Visuals grid bug:
//     no align-items meant the tallest panel - System health - set the height of
//     every panel beside it).
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
ok("the charts grid does NOT stretch its panels (align-items:start)", /\.charts\{[^}]*align-items:\s*start/.test(css));
ok("the System health panel is capped so it cannot own the row", /\.panel\.capped\{[^}]*max-height/.test(css) && /class="panel capped"/.test(html));

// 4. the summary is what you click to collapse
ok("every <details> has a <summary>", [...doc.querySelectorAll("details")].every((d) => d.querySelector("summary")));

// 5. THE APP IS THE SITE; THE ROOT IS AN ALIAS. The owner's decision of 2026-11-06
//    (restated 2026-11-09) was that docs/play/index.html is the entry point and the
//    root has no page, so a sweep could not restore docs/index.html as a "missing
//    landing". That produced a different bug: the root answered 404, and GitHub's
//    "Visit site" button, the deployments panel and every old bookmark point at the
//    root - so the owner kept landing on a 404 for a site that was working.
//    2026-11-20: the root may exist, but ONLY as a redirect. This asserts the
//    declaration, the redirect, and that the page carries no content of its own, so
//    a future restore that grows the root into a second page fails here instead.
const root = path.join(__dirname, "..");
const declared = JSON.parse(fs.readFileSync(path.join(root, "PAGES.json"), "utf8"));
const rootPage = path.join(root, "docs", "index.html");
const rootHtml = fs.existsSync(rootPage) ? fs.readFileSync(rootPage, "utf8") : "";
ok("PAGES.json declares the root as the landing alias", declared.landing === "docs/index.html", "landing = " + JSON.stringify(declared.landing));
ok("PAGES.json declares the console as the app", declared.app === "docs/play/index.html", declared.app);
ok("PAGES.json names the entry URL", /\/play\/$/.test(declared.entry || ""), declared.entry);
ok("the root exists", fs.existsSync(rootPage));
ok("the root redirects to the console (meta refresh)",
   /http-equiv="refresh"[^>]*url=\.\/play\//i.test(rootHtml));
ok("the root redirects to the console (script)", /location\.replace\("\.\/play\/"\)/.test(rootHtml));
ok("the root canonical points at the console", /rel="canonical" href="https:\/\/drsamonline\.github\.io\/dashboard\/play\/"/.test(rootHtml));
ok("the root is noindex (it is an alias, not a page)", /name="robots" content="noindex"/.test(rootHtml));
ok("the root has no navigation of its own", !/<nav|<header|<h1/i.test(rootHtml));
ok("the root carries no console markup", !/communityPanel|kiln|repoCount|data\.json/.test(rootHtml));
ok("the 404 page sends the reader to the console, not back to the 404",
   /href="\.\/play\/"/.test(fs.readFileSync(path.join(root, "docs", "404.html"), "utf8")));

// 6. KILN PUBLISHES ITS GATES, SO THE DASHBOARD READS THEM. The panel exists
//    because KILN is the only project in the estate that emits its own gate
//    results as data. Two things must stay true: it reads the published feed
//    (not a re-derivation), and it has a fallback that says which source it used.
//    A panel that silently shows nothing is worse than no panel.
const kilnPanel = doc.getElementById("kiln");
ok("the KILN gates panel exists", !!kilnPanel);
ok("the KILN panel reads KILN's published status feed",
   /raw\.githubusercontent\.com\/drsamonline\/KILN\/status\/status\.json/.test(html));
ok("the KILN panel falls back to the badge file on Pages",
   /drsamonline\.github\.io\/KILN\/docs\/badge\.json/.test(html));
ok("the KILN panel says which source it read",
   /Read from \" \+ source/.test(html) && /the badge file on Pages/.test(html));
ok("the KILN panel names the skipped gates, not just the passes",
   /Skipped gates/.test(html));
ok("the KILN panel links the status page when both feeds fail",
   /KILN\/docs\/status\.html/.test(html));
// A number without its age is the failure this console exists to prevent, and KILN's
// feed is the first one that carries a timestamp. Past 48 hours the daily republish has
// stopped, and every figure has to be read as historical.
ok("the KILN panel shows how old the measurement is",
   /row\("Measured"/.test(html) && /function age\(stamp\)/.test(html));
ok("the KILN panel marks a feed older than 48 hours",
   /hrs > 48/.test(html) && /more than 48 hours old/.test(html));

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
