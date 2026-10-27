# DATA CONTRACTS — what every number on the dashboard means

**Read this before quoting any figure on the page.** The dashboard's problem has never been that its
numbers were wrong; it is that several of them answer a different question from the one a reader assumes.
Two of this estate's dashboards once disagreed (15 vs 2) and **both were right** — they were counting
different things. This file is the contract that makes that impossible to repeat silently.

`data.json` is written by `dashboard/refresh.yml`, which runs `drsoam.py` against the live estate. Every
field below names what it counts, what it does **not** count, and where the same question is answered
differently somewhere else.

---

## Freshness

| Field | Meaning |
|---|---|
| `generated` | the date the run started, `YYYY-MM-DD` |
| `generated_at` | the ISO-8601 instant the run started |
| `degraded` | **a list of things this run could not measure.** A degraded entry means the number beside it is *unknown*, not zero. Never read a zero that has a `degraded` line as a measurement. |

The page renders its own age and marks itself stale past the refresh interval (`#ago.stale`). **If
`generated_at` is older than one refresh interval, every number on the page is a historical figure** —
which is F-04, and why the timestamp is the most important field in the file.

---

## The headline cards

| Card | Field | What it counts | What it does **not** count |
|---|---|---|---|
| **Products** | `summary.products` | repositories that are products (a working app, not a kit or a tool) | planned apps; anything in `QUEUE/` |
| **Kits** | `summary.kits` | repositories with `role: kit`, excluding META — the owner's definition, decided 2026-10-27 (F-18) | repositories whose *name* ends `-kit`; that older rule is published beside it as `summary.kits_name_matched`, and five of those are `kit-source` repos, not kits |
| **Avg conformance** | `summary.avg` | the mean of five metadata booleans per repository: has a description, a licence, a homepage, Pages, is not archived | **build status, test results, deployment** — a repository whose build failed on its latest run still scores 5/5 (F-15) |
| **Pushes** | `summary.pushes` | push events in the window, from `summary.byrepo` | commits; a push of three commits counts once |

`stats.conformance` is the histogram behind `summary.avg` — `{"5": n, "4": n, "3": n}`.

**"Conformance" is a bad name and it is being renamed.** It measures metadata completeness. Until the
rename lands (F-15), read every 4.8/5 as *"the repositories are well-described"*, never as *"the products
work"*.

---

## Health

| Field | Meaning |
|---|---|
| `health` | `ok` or `bad` |
| `health_detail.state` | the same verdict, with its counts |
| `health_detail.failing` | automations whose most recent run failed |
| `health_detail.cancelled` | **excluded from the verdict** — a superseded push is intended behaviour, not a fault (F-14) |
| `health_detail.unobservable` | automations this run could not read at all. **These are unknown, not healthy** |
| `health_detail.total` | automations in scope |

`health: ok` with `unobservable: 3` means *"everything I could see is fine, and three things I could not
see"*. That is the honest reading, and the field is shaped to make it say so.

---

## Plan and build status

| Field | Meaning |
|---|---|
| `plan.planned` | apps in `APP_MASTER_LIST.md` |
| `plan.built` | apps that meet the **measured** definition: a working app, a working release, a landing page, and a live demo where applicable (F-16) |
| `plan.unbuilt` | `planned - built` |
| `plan.live_products` | products with a live page |
| `plan.live_not_planned` | live products that are not in the master list |
| `plan.link` | the machine-readable source, `registry/plan.json` |

The older definition was **name matching** — a repository whose name resembled a master-list entry. It is
still published beside the measured one, labelled `name_matched`, and the two numbers are not
interchangeable. `plan.json`'s `agreement` block compares this file against the registry and records it
when they differ.

---

## Everything else

| Field | Meaning |
|---|---|
| `cards` | the rendered headline tiles, `{title, value, tone}`; `tone` is presentation only |
| `activity` | pushes per day over the window, `{date, count}` |
| `attention` | items needing a human. An empty list means nothing was flagged, **not** that nothing is wrong |
| `controls` | links to the workflows a human can dispatch by hand |
| `quota` | plan and Actions minutes. `billing_api_error` means the quota is unknown, not unlimited (F-80: the billing API returns `410 Gone`) |
| `changes` | the recent change feed, `{type, repo, when, text}` |
| `automation` | every automation with its schedule and last state |
| `roadmap` | milestone lines, including the kit list |
| `paused` | queue items deliberately not being built |
| `leaderboard` | `{error}` when the source failed — an error object, never an empty board |
| `community` | forks, external repos, open issues/PRs |
| `traffic` | clone/view counts, `available: false` where the API will not give them |
| `repos` | per-repository rows: name, description, homepage, push time, status |
| `links` | canonical URLs for the store, hub, forge, registry, knowledge and Actions |
| `history` | one row per previous run, so a trend can be read without a time-series database |

---

## Known disagreements, recorded rather than hidden

**Each is a definition difference, not a bug in one of the two numbers.**

| Question | Dashboard says | Registry says | Why they differ |
|---|---|---|---|
| How many apps are built? | **2** (`plan.built`) | **1** (`plan.json → reconciled.built`) | same definition, measured at different instants against a live estate. `plan.json` publishes `agreement: {agrees: false}` and names both |
| How good is the estate? | **4.8/5** | — | five metadata booleans (F-15). It is not a quality score and no other field should be read as one |

### Resolved 2026-10-27: the kit count

The dashboard used to publish **18** kits by the *name* rule while the registry published **13** by `role`.
Both were true and neither said which question it answered. The dashboard now uses `role: kit` excluding
META — the owner's definition — which reproduces the registry's thirteen exactly, and publishes the old
number beside it as `summary.kits_name_matched`, with `summary.kits_definition` naming which rule produced
`kits`. The `reckoning` line says it in words: *"13 kits (role)"*.

**The five repositories the name rule added and the role rule does not are `kit-source`** — the apps a kit
was extracted from. They look like kits, they are not, and that is the finding in one line.

If `registry/repos.json` cannot be read, the count falls back to the name rule **and the fallback is
recorded in `degraded`** — never silently, because a silent fallback would publish the old definition under
the new label.

**If you are quoting a number and this table has a row for it, say which definition you are using.**
That sentence is the whole point of the file.
