# Animorio animation engineering study

Research date: **18 November 2026 · Asia/Tehran**. Source: [Animorio's public catalog](https://animorio.com/en/animations/). This is a documentation and learning track for future portfolio work; it does not build a website.

The full catalog has been inventoried. **Ten representative standalone scripts have been read**, with relevant HTML and CSS inspected. This is an initial source study and curriculum, not a claim that every animation has been understood or reproduced.

## Start here

1. Read [the phased learning plan](ROADMAP.md) for the order, exercises and completion gates.
2. Use [the ten implementation reviews](SOURCE-REVIEW.md) to understand mechanisms and integration risks.
3. Work through [the original code notes](FOUNDATIONS.md): coordinate spaces, progress, damping, looping and cleanup.
4. Continue with [Lesson 1: pointer geometry and springs](01-pointer-and-springs.md), including original code, interaction states and executable checks.
5. Consult [browser observations](BROWSER-CHECKS.md) before treating a source-level finding as tested behavior.
6. Search [catalog.csv](catalog.csv) for future candidates. [evidence.json](evidence.json) records URLs, source hashes and review scope.

The foundations and first pointer/spring exercise are documented and checked. [Lesson 1 results](pointer-lesson-validation.json) concern our original snippets in a local browser fixture; they do not extend the live Animorio browser-coverage count. The next lesson is sticky positioning and scroll progress. Real-device and assistive-technology checks remain open.

## What the inventory contains

| Dimension                                                  |            Count |
| ---------------------------------------------------------- | ---------------: |
| Unique entries in the captured catalog                     |            1,957 |
| Animations / components                                    |        970 / 987 |
| Easy / medium / advanced, according to catalog labels      | 52 / 1,215 / 690 |
| Selected for this first study                              |               12 |
| Complete standalone JavaScript implementations read        |               10 |
| Selected implementations with incomplete access (HTTP 503) |                2 |
| Other entries: metadata only                               |            1,945 |

Technology tags overlap: GSAP **1,943**, CSS **1,238**, Canvas **390**, WebGL **118**. Category tags also overlap: hover **1,085**, transitions **553**, SVG **552**, physics **489**, text **476**, scroll **216**, images **149**, 3D **143**, WebGL **115**, backgrounds **75**, intro **71**. The two WebGL counts describe different metadata fields.

These counts describe the captured listing, not every page that could exist on the domain. All entries carry the catalog's `gratis` access label. That does not establish an open-source license. Technology labels are navigation aids: **Projects with elastic lines** is tagged CSS but implements springs in a substantial JavaScript animation loop.

The sampled detail pages provide standalone HTML/CSS/JS demos and show React/Vue options. They are not, by themselves, GitHub repositories. No linked GitHub repository was established for these samples. Framework adapter implementations have not been reviewed.

## Evidence and reproducibility

The inventory uses public card metadata and was cross-checked against the page's JSON-LD ItemList. CSV rows retain original tag spellings (`testo`, `transizioni`, `fisica`, `immagini`, `sfondi`); kind and difficulty are translated to English. `review_status` is one of:

- `catalog-only`: title, URL and tags inspected; no implementation claim.
- `script-reviewed`: complete standalone script read; relevant markup/styles inspected.
- `source-access-incomplete-503`: selected, but source access was incomplete; not a completed implementation review.

Source hashes identify the bytes reviewed on the research date. Live URLs can change. Source, guide text, artwork and fonts remain outside this repository; hashes are provenance, not a vendored backup. Browser checks have their own scope and results and do not upgrade every catalog row to “tested.”

## Reuse boundary

[Animorio's license](https://animorio.com/en/license/) permits using and changing animations on personal and client websites, while prohibiting publishing the animations in code collections, templates or competing libraries under that license. Accordingly this repository contains **original analysis, factual metadata, links and independently written teaching primitives**. It does not mirror Animorio's implementations, ZIPs, assets or explanatory prose.

Before directly incorporating an Animorio implementation into a future product, check its then-current terms and the licenses of dependencies and assets. The learning plan here does not depend on copying that implementation.

## How this supports the portfolio studies

The [portfolio case studies](../../portfolio-case-studies/README.md) explain composition and whole-site behavior. This track isolates reusable engineering concepts. A successful exercise explains why motion improves navigation or reading, how it behaves under interruption, and how content remains usable without that motion. Visual polish alone is not the completion criterion.
