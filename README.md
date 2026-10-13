# Ambassador Atlas

Every Tableau Ambassador from the 2024, 2025 and 2026 classes and every Tableau Visionary since 2012 on one page. It shows who they are, where they live, what they talk about and who came back.

Live: https://ankurnapa.github.io/tableau-ambassador-atlas/

## What is on the page

- A constellation of the current class, grouped by programme. Solid dots are returning ambassadors and rings are new ones. Click any dot to read the bio.
- A world map with one pin per ambassador at their city, clustered until you zoom in (the same Leaflet build as the Beverage-AI Radar). Click a cluster to filter the directory to that country.
- Patterns: who stayed from one class to the next, class size by region over three years, programme mix, languages and the "talk to me about" topics.
- Visionaries since 2012: a loom of every person by class year, class size split into returning and new, how long runs last, the named 2026 class and a searchable list. Anyone who is also an ambassador links to their full profile.
- A searchable directory with filters for programme, region, country, language and returning ambassadors. Each card opens the full bio, user groups and links.

Filters live in the URL, so a filtered view can be shared as a link.

## Data

The data comes from the public Tableau Ambassador vizzes on Tableau Public by Britton Staniar (2025 and 2026 classes) and the 2024 class viz. It was read on 14 October 2026 through the Tableau Embedding API (`tools/extract.html`). The 2023 viz does not allow data access, so it is left out. Visionaries from 2012 to 2025 come from Kevin Flerlage's Tableau Visionary Collection viz. For 2026, Tableau's announcement (18 March 2026) gives the class size and nine names. City coordinates are in `geo.json`, built by `tools/geocode.py` with Photon.

To refresh, serve `tools/extract.html?v=<workbook>/<view>` locally, wait for `window.__out`, then rebuild `data.js`.

## Stack

Static HTML, CSS and one script. d3 loads from jsDelivr and Leaflet with markercluster from cdnjs, all with integrity hashes. There is no build step.

Unofficial and fan-made. I'm a Tableau Ambassador (unpaid). Views are my own.
