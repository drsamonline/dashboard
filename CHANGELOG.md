# Changelog

## 1.0.2 — 2026-11-20

- **Clicking a repository no longer lands on a 404.** The 2026-11-05 page audit deleted
  `repo.html`, `forks.html`, `network.html` and `people.html`, but the console kept linking
  all four: every repo row went to `repo.html?name=…`, every forked repo name to
  `forks.html?repo=…`, and the community panel still offered "Fork network" and "Opened by
  others". Repo and fork names now link the repository on GitHub, and the two dead
  navigation links are gone. Same failure as the service-worker shell in `docs/play/sw.js`:
  a page is deleted, something still points at it.
- **`tests/links.test.js` asserts it cannot happen a third time.** It reads every `href`/`src`
  in the published HTML — including the ones assembled inside inline scripts, which is the
  shape that broke — and fails if a relative link resolves to nothing or to a page
  `PAGES.json` lists as deleted. Wired into `npm test`.

## 1.0.1 — 2026-10-25

- **Licence: PolyForm Noncommercial 1.0.0.** Every repository now carries the canonical text
  from polyformproject.org with the Required Notice line, and the four places a repo states
  its licence agree: LICENSE, the SPDX headers, the README and package.json.
- **The public demo is the app.** A build now fails if `docs/play/index.html` is not the app,
  because a demo running older code is two code paths for one program.
