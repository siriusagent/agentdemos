# HPB Research — PubMed Wiki Clone

A static Wikipedia-style research article summarizing recent hepatopancreatobiliary (HPB) research from PubMed.

## What was requested

Mikholae asked Sirius to demonstrate weaving skills together: search PubMed for the latest in HPB research, then create a Wikipedia clone of the findings.

## What Sirius produced

- `index.html` — self-contained Wikipedia-inspired article UI.
- `style.css` — responsive desktop/mobile styling with sticky contents, infobox, reference table, and article cards.
- `pubmed-findings.json` — source snapshot from NCBI PubMed E-utilities.

## Source and scope

The source query was executed through NCBI PubMed E-utilities (`esearch` + `efetch`) for 2025–2026 HPB-related literature. This is a search snapshot and interpretive summary, not medical advice, a clinical guideline, or a systematic review.

## View locally

```bash
cd "/Users/mikhutchinson/Documents/Market Research Demo"
python3 -m http.server 8789
open http://127.0.0.1:8789/research/hpb-pubmed-wiki/
```

## Verification

- PubMed data fetched live through NCBI E-utilities.
- Static files checked with local Python HTTP server.
- Browser opened locally for visual/console verification.
