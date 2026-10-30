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

const file = process.argv[2] || path.join(__dirname, "..", "index.html");
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

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
