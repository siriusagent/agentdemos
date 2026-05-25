# AGENTS.md

Instructions for Sirius and other AI agents working in this repository.

## Repository Purpose

`siriusagent/agentdemos` is the public publishing repository for agent-made
demos, receipts, static pages, screenshots, videos, and public writeups created
with SiriusAgent.

This repository is not the Sirius source-code repository. Treat it as a public
display and distribution surface.

## When To Publish Here

Publish here when Mikholae explicitly asks for any of the following:

- "publish this demo"
- "put this in agentdemos"
- "make a public receipt"
- "push the agent-made artifact"
- "update GitHub Pages"
- "make this visible under siriusagent"
- "ship the demo/readme/site"

If the instruction clearly says to publish here, execute the publishing task.
Do not stop at a plan unless Mikholae asks for a plan.

If Mikholae says he likes an artifact in a publishing context, treat that as a
signal to preserve the artifact's shape and prepare it for public presentation.
Do not rewrite it into generic marketing copy or keep iterating on the core
artifact unless he asks for changes.

If the instruction is ambiguous about whether private source code should become
public, stop and ask one concise question before pushing.

## Account Boundary

Push this repository to `siriusagent/agentdemos`.

Do not push this repository to `mikhutchinson` unless Mikholae explicitly asks
for that owner. The `mikhutchinson` account may be active on the machine for
other tools, but this repository belongs under the `siriusagent` public account.

When using GitHub CLI automation, prefer an explicit `siriusagent` token or an
explicit owner/repo target over ambient account assumptions.

## Public/Private Boundary

Allowed:

- public demo files
- static sites and GitHub Pages content
- generated screenshots, videos, and public visual assets
- public receipts explaining what an agent did
- minimal metadata needed to view, verify, or release a demo

Forbidden unless Mikholae explicitly says otherwise:

- Sirius app source code
- private customer, client, research, or workspace source code
- raw local transcripts, memory dumps, runtime logs, terminal captures, or debug
  output
- `.env` files, tokens, keys, Keychain exports, signing identities, provisioning
  profiles, or API credentials
- internal implementation docs copied from private repos
- generated dependency/build folders such as `node_modules`, `.build`, `.venv`,
  DerivedData, or package caches

When in doubt, publish the demo result and its public explanation, not the
private inputs that produced it.

## Mikholae's Working Preferences

Mikholae prefers direct execution when the task is bounded. If he has already
said to publish, update, push, or ship, do the work end to end and verify it.

He does not want noisy marketing copy or fake open-source posture. Be accurate,
specific, and comfortable saying what is public and what is private.

He wants authorship handled plainly:

- Mikholae created and directs SiriusAgent.
- Demos may advertise that they were made by agents running in Sirius when that
  is true.
- Do not hide agent provenance.
- Do not erase Mikholae's role.

He values receipts. A good demo writeup should say what was requested, what was
produced, what was verified, and where to view the final artifact.

He is sensitive to wasted motion. Search the repository first, make scoped
edits, and avoid unrelated refactors or decorative churn.

## Demo Directory Contract

Use this structure for substantial demos:

```text
demos/YYYY-MM-DD-short-slug/
  README.md
  receipt.md
  index.html              # optional
  assets/                 # optional
```

The demo `README.md` should include:

- title
- short public summary
- what Mikholae asked Sirius to do
- what the agent produced
- how to view the artifact
- verification performed
- provenance and limitations

The `receipt.md` should be concise and evidence-oriented:

- inputs used, described without leaking private material
- major steps taken
- checks run
- known caveats
- final public URLs after push

## GitHub Pages

If asked to publish a static page, use plain static HTML/CSS/JS unless the demo
already requires a build tool. Keep build output deterministic and commit only
public files.

Before enabling or changing Pages settings, verify the repository state with
GitHub and report the resulting URL.

## Verification Before Commit

Before committing:

1. Run `git status --short`.
2. Confirm every changed file is public-safe.
3. Open or render the artifact locally when possible.
4. Run any lightweight checks relevant to the artifact.
5. Confirm no private source, logs, tokens, or generated dependency folders are
   staged.

Before calling work published:

1. Push to `siriusagent/agentdemos`.
2. Verify the remote repo has the commit.
3. Verify any GitHub Pages or artifact URL that the user is expected to open.

## Commit Style

Use short, descriptive commits such as:

- `Add interactive receipt demo`
- `Publish market research demo receipt`
- `Update demo index`

Do not bundle unrelated demos into one commit unless Mikholae asks for a batch.

## If Something Looks Risky

Stop before pushing if the diff includes source code, secrets, private logs, or
files whose public status is unclear.

Ask one concise question that identifies the exact risk. Do not ask broad
process questions when the safe next step is obvious.
