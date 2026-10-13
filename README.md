# Ambassador Atlas

Every Tableau Ambassador from the 2024, 2025 and 2026 classes on one page. It shows who they are, where they live, what they talk about and who came back.

Live: https://ankurnapa.github.io/tableau-ambassador-atlas/

## What is on the page

- A constellation of the current class, grouped by programme. Solid dots are returning ambassadors and rings are new ones. Click any dot to read the bio.
- A world map with circles sized by headcount. Click a country to filter the directory.
- Patterns: who stayed from one class to the next, class size by region over three years, programme mix, languages and the "talk to me about" topics.
- A searchable directory with filters for programme, region, country, language and returning ambassadors. Each card opens the full bio, user groups and links.

Filters live in the URL, so a filtered view can be shared as a link.

## Data

The data comes from the public Tableau Ambassador vizzes on Tableau Public by Britton Staniar (2025 and 2026 classes) and the 2024 class viz. It was read on 14 October 2026 through the Tableau Embedding API (`tools/extract.html`). The 2023 viz does not allow data access, so it is left out.

To refresh, serve `tools/extract.html?v=<workbook>/<view>` locally, wait for `window.__out`, then rebuild `data.js`.

## Stack

Static HTML, CSS and one script. d3 and topojson-client load from jsDelivr with integrity hashes. There is no build step.

Unofficial and fan-made. I'm a Tableau Ambassador (unpaid). Views are my own.
