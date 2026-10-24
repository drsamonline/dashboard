'use strict';
/**
 * Structure test for the system console.
 *
 * The console's layout is a contract the owner cares about: the VISUALS come
 * first and the LISTS come after, and every list can COLLAPSE. That is easy to
 * lose in a reorder, so it is asserted here rather than remembered.
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

// 1. the visual block comes before every list
const visuals = doc.querySelector(".sec + .charts");
ok("a Visuals block exists, right after a section heading", !!visuals);
const visualTop = visuals ? visuals.compareDocumentPosition(doc.querySelector("#repos")) & 4 : 0;   // 4 = FOLLOWING
const listIds = ["needsBody", "automation", "roadmap", "paused", "repos"];
ok("Visuals comes before the lists (" + listIds.join(", ") + ")", (() => {
  if (!visuals) return false;
  const v = visuals.getBoundingClientRect ? 0 : 0;   // jsdom has no layout; compare document order instead
  return listIds.every((id) => {
    const el = doc.getElementById(id);
    if (!el) return false;
    return !!(visuals.compareDocumentPosition(el) & 4);   // el FOLLOWS visuals
  });
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

// 4. the summary is what you click to collapse
ok("every <details> has a <summary>", [...doc.querySelectorAll("details")].every((d) => d.querySelector("summary")));

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
