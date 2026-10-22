#!/usr/bin/env python3
"""Reference generator for dashboard/data.json.

Run by the Forge agent on a schedule (it holds a token with read access to the
private registry and knowledge repos). Writes data.json; the static index.html
renders it. No PAT is required from the owner — the agent already has access.

Usage:
    GITHUB_TOKEN=... python generate.py > data.json

It is deliberately small and dependency-free so it can run anywhere.
"""
import json, os, sys, urllib.request

OWNER = "drsamonline"
TOKEN = os.environ.get("GITHUB_TOKEN", "")
API = "https://api.github.com"

# Repos that are tooling, not products (kept off the fleet table).
META = {"drsamonline", "drsamonline.github.io", "app-builder", "skills",
        "profile-kit", "forge", "registry", "knowledge", "dashboard"}


def api(path):
    req = urllib.request.Request(API + path, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "drsamonline-dashboard",
        **({"Authorization": "Bearer " + TOKEN} if TOKEN else {}),
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main():
    repos, page = [], 1
    while True:
        batch = api(f"/users/{OWNER}/repos?per_page=100&page={page}&sort=pushed")
        if not batch:
            break
        repos += batch
        if len(batch) < 100:
            break
        page += 1

    rows = []
    for r in repos:
        if r["name"] in META or r.get("fork"):
            continue
        rows.append({
            "name": r["name"],
            "description": r.get("description") or "",
            "pushed_at": r.get("pushed_at"),
            "homepage": r.get("homepage") or "",
            "html_url": r.get("html_url"),
            "download": "",
            "status": "",
            "status_tone": "",
        })

    out = {
        "generated": __import__("datetime").date.today().isoformat(),
        "reckoning": f"{len(rows)} projects tracked.",
        "cards": [
            {"title": "Repos", "value": f"{len(rows)} tracked", "tone": ""},
            {"title": "Store", "value": "Matneo — live", "tone": "ok"},
        ],
        "repos": rows,
        "links": {
            "store": "https://drsamonline.github.io/Matneo/",
            "forge": "https://github.com/drsamonline/forge",
            "registry": "https://github.com/drsamonline/registry",
            "knowledge": "https://github.com/drsamonline/knowledge",
        },
    }
    json.dump(out, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
