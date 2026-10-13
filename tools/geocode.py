#!/usr/bin/env python3
"""Geocode every ambassador location in data.js into geo.json.

Same approach as the Beverage-AI Radar (scripts/build_geocode.py there): Photon
over OpenStreetMap, one lookup per distinct place, cached so a rerun only looks
up new places. Countries are geocoded too, as the fallback when a city fails.

Run: python3 tools/geocode.py
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "geo.json"
UA = "tableau-ambassador-atlas/1.0 (github.com/AnkurNapa/tableau-ambassador-atlas)"
RATE_S = 0.5


def loc(a: dict) -> str:
    # Must match a.loc in app.js.
    state = a["s"] if a["s"] and a["s"] != a["c"] else ""
    return ", ".join(p for p in (a["c"], state, a["k"]) if p)


def places() -> set[str]:
    rows = json.loads((ROOT / "data.js").read_text()[len("window.AMB="):-1])
    found = {a["k"] for a in rows if a["k"]}
    found |= {loc(a) for a in rows if a["c"] and a["k"]}
    return found


def lookup(place: str):
    url = "https://photon.komoot.io/api/?" + urllib.parse.urlencode({"q": place, "limit": 1, "lang": "en"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        hits = json.load(r)["features"]
    if not hits:
        return None
    lng, lat = hits[0]["geometry"]["coordinates"]
    return [round(lat, 4), round(lng, 4)]


def main() -> int:
    cache = json.loads(OUT.read_text()) if OUT.exists() else {}
    todo = sorted(p for p in places() if p not in cache)
    print(f"{len(cache)} cached, {len(todo)} to look up")
    misses = []
    for i, place in enumerate(todo, 1):
        try:
            cache[place] = lookup(place)
        except Exception as e:  # network blip: leave it out so the next run retries
            print(f"  error {place!r}: {e}", file=sys.stderr)
            continue
        if cache[place] is None:
            misses.append(place)
        if i % 25 == 0:
            OUT.write_text(json.dumps(cache, sort_keys=True, ensure_ascii=False))
            print(f"  {i}/{len(todo)}")
        time.sleep(RATE_S)
    OUT.write_text(json.dumps(cache, sort_keys=True, ensure_ascii=False))
    print(f"done, {len(misses)} unresolved (they fall back to their country): {misses[:20]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
