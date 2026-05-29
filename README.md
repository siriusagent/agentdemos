# Agent Demos

Agent Demos is the public demo archive for work produced with SiriusAgent.

This repository exists so Mikholae Hutchinson can direct Sirius to publish
agent-made artifacts without exposing the private Sirius source tree or private
workspace contents.

## What Goes Here

Use this repository for public artifacts that are meant to be inspected,
shared, linked from GitHub Pages, or referenced as evidence of what SiriusAgent
can do.

Examples:

- demo receipts and writeups
- static GitHub Pages demos
- screenshots, videos, and generated visual assets
- short case studies of agent work
- public release-adjacent artifacts that do not contain source code
- README files that explain what an agent made and how to view it

## What Does Not Go Here

Do not publish:

- the Sirius app source code
- private project source code unless Mikholae explicitly says that exact source
  is public
- local runtime logs, transcripts, memory dumps, or debug captures
- credentials, tokens, Keychain exports, environment files, signing material, or
  private configuration
- generated dependency folders such as `node_modules`, `.build`, `.venv`, or
  DerivedData
- raw workspace snapshots copied from private repos

## Demo Layout

Prefer one directory per demo:

```text
demos/
  2026-05-25-interactive-3d-receipt/
    README.md
    receipt.md
    index.html
    assets/
```

A demo directory should normally include:

- a `README.md` with the public summary and links
- the final artifact or a link to the final artifact
- enough context to understand what Sirius was asked to do
- a short verification note describing how the artifact was checked
- clear provenance when the work is agent-made

For one-off repository-level updates, editing the root `README.md` or
`AGENTS.md` is fine. For anything that represents a demo, use `demos/<date>-<slug>/`.

## Publishing Policy

Sirius should publish here only when Mikholae explicitly asks to publish,
prepare a public demo, create a receipt, update GitHub Pages, or push an
agent-made artifact to `siriusagent/agentdemos`.

If the requested artifact depends on a private source repo, keep the source repo
private. Export only the public demo surface.

## Live Gallery

The repository root is a static gallery (`index.html` + `gallery.css`) that
links to every published demo. It is the GitHub Pages landing page:

- Gallery: `https://siriusagent.github.io/agentdemos/`
- Each demo is served at `https://siriusagent.github.io/agentdemos/research/<slug>/`

Demos currently live in the gallery:

- `research/interactive-3d-receipt/` — XPBD cloth-physics hanging receipt
- `research/trace-cards-plus/` — WebGL trace-sculpture lab
- `research/apple-homepage-clone/` — static responsive Apple homepage clone
- `research/physics-canvas-triptych/` — raw Canvas 2D physics triptych: chaos, π collisions, and bell curve

### Adding a demo to the gallery

The gallery is manifest-driven. To add a demo, edit the `EXHIBITS` array near
the bottom of root `index.html` and add one entry:

```js
{ slug: "<dir-under-research>", title: "...", blurb: "...",
  tags: ["..."], accent: "#rrggbb", status: "live" }  // or "draft"
```

`status: "live"` renders a clickable card linking to `research/<slug>/`;
`status: "draft"` renders a dimmed "Coming soon" card. No layout edits needed.

## GitHub Pages

Pages deploys the **whole repository root** via
`.github/workflows/pages.yml` on every push to `main`, so the gallery and all
`research/<slug>/` demos are published together. When building a static demo,
prefer plain static files unless a build step is explicitly useful. If a build
tool is used, commit the public output and document the command that produced
it.

## Authorship

SiriusAgent is created and directed by Mikholae Hutchinson. Demo artifacts may
state that they were made by agents running in Sirius when that is true.

The desired public posture is honest:

- credit Mikholae as creator and director
- identify agent-made work plainly
- avoid pretending this repository contains the private app source
- avoid overclaiming what a demo proves

## Links

- SiriusAgent public profile: <https://github.com/siriusagent/siriusagent>
- This repository: <https://github.com/siriusagent/agentdemos>
