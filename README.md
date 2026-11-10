# ACDC project website

Research website for **Agentic Aerial Cinematography: From Dialogue Cues to Cinematic Trajectories**, University of Toronto. A buildless, dependency-free GitHub Pages site.

## Preview

Open `index.html` directly in a browser. Data is a local JavaScript asset, so the comparison works without a server. For HTTP playback and development:

```sh
node scripts/preview.mjs
```

Visit http://127.0.0.1:8000. The server supports byte-range requests for seeking; set `PORT` to change the port. Desktop, mobile, and full-page screenshots are in `.preview/` (not published).

## Presentation and interactions

- **Defined = structured; agent-directed = dynamic.**
- Selection order is Scene → Model → Prompt, with thumbnail scene buttons, four model buttons, and two prompt cards per scene. Scene changes remember the last prompt; the model stays fixed.
- Four models and six tasks select 24 matched pairs, covering all 48 current final runs.
- Native video controls, play/pause both, restart, a shared percentage scrubber, and actual CSV speed/path plots. A paired statistics table reports duration, peak sampled speed, and speed-limit episodes. Download links are omitted; run limitations remain in a disclosure.
- Playback uses original timing. Scrubbing aligns percentage progress, not locations or absolute time; different routes are not frame-aligned.
- The paper's refinement experiment is separate from the workflow follow-up. Author information and research-code release status are retained.
- Keyboard controls, a skip link, reduced-motion support, responsive layouts, and no-JavaScript default playback.

## Sources and claims

The manuscript was copied from `../corl_v2/main.pdf` during this revision; that folder subsequently became `../corl26_v2/`. The rebuild script supports both names. The poster drafts informed the narrative. The method was cross-checked against `../deep_drone_cinematography` and the two instructions in `../results-full/_harness`.

Every comparison uses `../results-full/{structured,dynamic}-{model}/runs/{task}/final`. Older archived baselines and original example tours are not substituted. Figure 1 and the refinement figure are retained. The `../corl26_v2/figure_tools` folder contains editable sources, and its manuscript PDF is hash-identical to the copy linked by the site.

`static/data/provenance.json` records source paths, CSV SHA-256 hashes, thumbnail timestamps, and encoding settings. CSVs are unchanged. Videos are web encodes of actual renders (H.264 CRF 27, same 960×540, 24 fps, framing, and timing), with faststart for playback. No illustrative synthetic footage is used.

Speed is recomputed using the nonuniform three-point position derivative, matching NumPy's default gradient, with one-sided endpoints. Contiguous samples strictly above 1 m/s count as episodes. All 48 hashes and counts match `poster/merged-70-30-42x36/reference/four-model-speed-audit.json`: 59 episodes / 24 defined runs, 0 / 24 agent-directed runs. Display downsampling preserves bucket extrema. This is a sampled diagnostic, not a continuous-time safety certificate.

The site discloses unequal refinement budgets, renderer changes, inconsistent clearance definitions, and task coverage limitations. It does not claim a controlled equal-budget ablation or universal workflow superiority. Poster defect-rate aggregates without their underlying evaluation files are omitted.

## Rebuild results

With the original sibling source folders available:

```sh
node scripts/build-results.mjs
node scripts/optimize-videos.mjs
```

The first script copies originals, creates thumbnails/data, and verifies hashes. The second creates smaller web encodes. Both use the installed Jellyfin FFmpeg path; update it for another machine. Source research files are never modified.

## Interactive refinement figure

Section 04 is a static SVG chart that automatically plays once from 0 to 100 when it scrolls into view, then holds at 100 until interaction. It also supports client-side replay, pause/reset, a keyboard-accessible 0–100 comparison slider, and selection among seven initializations. Reduced-motion preferences disable continuous animation. The complete SVG and image links remain available without JavaScript; no server or build step is required.

`static/data/refinement.js` contains 101 points per curve, recovered directly from the seven vector paths in the original manuscript figure using its printed linear axes. These are figure-derived values, not raw experiment CSVs. The original figure is retained at `static/pdfs/preference-refinement-source.pdf`; its SHA-256 and extraction notes are in the data asset.

The four PNGs in `static/images/refinement/` are extracted from the source PDF at their native 720×405 pixels without resampling. Each before/after pair is displayed separately and supports full-size viewing. The source does not identify a correspondence between the two example pairs and the seven traces, so image selection is independent of graph selection.

## Validation

With HTTP preview running:

```sh
node scripts/validate.mjs
node scripts/render-preview.mjs
```

Validation checks local references, 48 CSV hashes, media formats, timing, plot values, and HTTP range responses. The render helper uses installed Chrome headlessly, writes screenshots, and runs `.preview/qa.html` across all model/task choices and five viewport widths. These Windows-specific helpers need executable paths adjusted on another OS. The website itself needs no dependencies.

No publication, Git push, or hosting changes were made. The supplied website folder has no `.git` metadata. Original HTML/CSS/JS backups are in `.preview/before/`.

## Attribution

Originally based on [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template), adapted from [Nerfies](https://nerfies.github.io/). Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
