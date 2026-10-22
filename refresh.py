#!/usr/bin/env python3
"""Regenerate the dashboard's data.json from the public repo list.

Runs in GitHub Actions on a schedule (no PAT needed — it reads public data, and
the runner's token raises the rate limit). Dependency-free.

    GH_TOKEN=... python3 refresh.py
"""
import json, os, urllib.request, datetime

OWNER = "drsamonline"
META = {"drsamonline", "drsamonline.github.io", "app-builder", "skills", "profile-kit",
        "forge", "registry", "knowledge", "dashboard"}


def fetch(url):
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "forge-dashboard",
    })
    tok = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if tok:
        req.add_header("Authorization", "Bearer " + tok)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def score(r):
    return sum([
        bool(r.get("description")),
        bool(r.get("license")),
        bool(r.get("homepage")),
        bool(r.get("has_pages")),
        not r.get("archived"),
    ])


def main():
    repos = fetch("https://api.github.com/users/%s/repos?per_page=100&sort=pushed" % OWNER)
    rows = []
    for r in repos:
        if r["name"] in META or r.get("fork"):
            continue
        s = score(r)
        home = r.get("homepage") or ("https://drsamonline.github.io/%s/" % r["name"] if r.get("has_pages") else "")
        rows.append({
            "name": r["name"],
            "description": r.get("description") or "",
            "pushed_at": r.get("pushed_at"),
            "homepage": home,
            "html_url": r.get("html_url"),
            "download": "",
            "status": "%d/5" % s,
            "status_tone": "ok" if s >= 4 else ("warn" if s >= 3 else "bad"),
        })
    rows.sort(key=lambda x: (x["pushed_at"] or ""), reverse=True)
    total = len(rows)
    avg = round(sum(int(x["status"].split("/")[0]) for x in rows) / total, 1) if total else 0.0
    data = {
        "generated": datetime.date.today().isoformat(),
        "reckoning": "%d projects · avg conformance %s/5 · updated automatically." % (total, avg),
        "cards": [
            {"title": "Projects", "value": str(total), "tone": ""},
            {"title": "Avg conformance", "value": "%s/5" % avg, "tone": "ok" if avg >= 4 else "warn"},
            {"title": "Store", "value": "Matneo — live", "tone": "ok"},
            {"title": "Forge", "value": "live", "tone": "ok"},
        ],
        "repos": rows,
        "links": {
            "store": "https://drsamonline.github.io/Matneo/",
            "forge": "https://github.com/drsamonline/forge",
            "registry": "https://github.com/drsamonline/registry",
            "knowledge": "https://github.com/drsamonline/knowledge",
        },
    }
    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print("wrote data.json:", total, "projects, avg", avg)


if __name__ == "__main__":
    main()
