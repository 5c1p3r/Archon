# INITIAL — Cost-tier routing: make the cheap tiers stop burning Claude quota

Supersedes the "Model routing & cost tiers" section of
`C:\Users\karam\.claude\claude-projects\agentic-research-2026\BUILD-ORDER.md`, which targeted
Hermes/OpenClaw rather than Archon (explicit user decision, 2026-08-15). Pre-work and the
OmniRoute toolshed verdict are recorded in `HANDOFF.md` at this repo root.

## FEATURE:

**Goal:** agent work stops consuming weekly Claude Code subscription quota for the work that
does not need Claude, without silently degrading the work that does.

**The framing in `HANDOFF.md` is wrong in a way that changes the scope.** It proposes giving
Archon "its own logic to decide, per task, whether to route to a cheap/free model or full
Claude." Every fact below was re-measured on 2026-08-16 against this `dev` checkout — not
inherited from `HANDOFF.md` — and the measurement says: **Archon already has that mechanism,
it is already load-bearing, and the thing that is actually missing is much smaller.**

What exists today:

- A three-tier model abstraction — `small` / `medium` / `large` plus `@custom` aliases —
  classified by `resolveModelSpec()` at `packages/workflows/src/model-validation.ts:207` and
  layered by `buildAiProfile()` at `:139` (built-in defaults → global → repo → per-user DB).
- **31 nodes across the bundled default workflows already declare a tier** (11 `small`,
  11 `medium`, 9 `large`). The authoring convention is established, documented in
  `.archon/workflows/defaults/archon-workflow-builder.yaml:212` ("Prefer `model: small` for
  simple classification tasks to save cost"), and consumed at
  `packages/workflows/src/dag-executor.ts:967`.
- Write surfaces for the tier map already exist at every layer: `~/.archon/config.yaml`,
  the `archon ai tier` CLI, and `PATCH /api/config/tiers`.

So the routing decision is already being made — by the workflow author, per node, at authoring
time. **The defect is not that nothing decides. It is that every tier terminates at Claude.**
`C:\Users\karam\.archon\config.yaml` currently pins all three:

```yaml
tiers:
  small: { provider: claude, model: claude-haiku-4-5 }
  medium: { provider: claude, model: claude-sonnet-5 }
  large: { provider: claude, model: claude-opus-5 }
```

A node that dutifully declares `model: small` still draws on the same weekly subscription
quota as `large`. It buys a cheaper _token_ price inside a budget that is not denominated in
tokens. That is the entire bug, and it is a config-layer bug, not an engine one.

Three workstreams:

**1. Make a non-Claude backend reachable at all.** Today none is. Verified 2026-08-16:
`ANTHROPIC_API_KEY`, `CLAUDE_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`, and `OPENROUTER_API_KEY` are
all unset (subscription mode, per M1's requirement — preserve this), and
`C:\Users\karam\.pi\agent\models.json` **does not exist**. OmniRoute is live and
OpenAI-compatible — `GET http://localhost:20128/v1/models` returned HTTP 200 with
`auto/best-coding` and `auto/best-reasoning` (context 1048576, `tool_calling: true`,
`reasoning: true`). Reach it through the **Pi** provider's custom-provider path, which is
explicitly designed for this case: `packages/providers/src/community/pi/provider.ts:469-481`
handles "LM Studio, ollama, llamacpp, custom OpenAI-compatible endpoints" by logging
`pi.auth_missing` and continuing rather than failing. **No engine code is required to reach
OmniRoute.** This workstream is a `models.json` file plus a tier binding.

**2. Rebind `small` — and only `small` — to OmniRoute.** With a backend reachable, `small`
points at OmniRoute instead of `claude-haiku-4-5`. **11 nodes change cost class with no YAML
edit** — that is the leverage, and it is why the tier seam is the right one. `medium` and
`large` stay on Claude (settled at sign-off; see OTHER CONSIDERATIONS). `small` is the right
first target because its declared workload is exactly the quota-wasteful kind — routing, glue,
classification, mechanical checks — where a free model's failure mode is visible and cheap.

**3. The "decide per task" layer — and the argument for _not_ building it as an engine router.**
This needs stating explicitly because `HANDOFF.md` asks for it and the PRP should not
quietly drop it. An engine-level router that overrides a node's declared tier is inadmissible
under Archon's own Workflow Language Constitution, on three independent counts:

- _"New per-provider capabilities default to provider config / tier-alias presets, not new node
  fields"_ — the constitution names the tier seam as the sanctioned answer to exactly this.
- _"Implicit behaviors need the same scrutiny as new fields: documented, individually
  defeatable, fail-safe — or not added."_ A silent re-route fails all three.
- It would break the invariant `~/.archon/config.yaml` states about itself: _"9 bundled
  workflows already reference `large` … these must stay HONEST — mapping large -> sonnet would
  silently downgrade them all."_

And empirically the value is low: with 31 of the tier-bearing nodes already declaring intent,
an auto-router would spend most of its time overriding an explicit authored decision — the one
thing the constitution forbids. If a per-task decision is genuinely wanted for _undeclared_
nodes, the constitutional expression is a `script:` node that computes the choice plus `when:`
on its structured output, or a workflow-level default — never a new engine field.
**Settled at sign-off: the router is dropped.** The PRP implements workstreams 1–2 and records
this reasoning as the rationale; it does not build a router, not even opt-in.

**Done when:** a workflow node declaring `model: small` executes against OmniRoute and
completes successfully; `x-omniroute-response-cost` or the OmniRoute dashboard confirms the
call did not bill Anthropic; `medium` still resolves to `claude-sonnet-5` and `large` to
`claude-opus-5`, both provably untouched; and a real `repo-build` dispatch through the M1.5
registry still passes its validation contract end to end.

## EXAMPLES:

Everything to mirror is in-tree. Cite by path; do not invent conventions.

- **`C:\Users\karam\.archon\config.yaml`** — the file being edited. Mirror its existing
  commenting discipline exactly: every pin carries the reason it is pinned. Note its own
  warning that `archon ai tier set` **rewrites this file in flow style and drops comments** —
  so make tier changes by hand-editing, not via the CLI, or expect to restore the header.

- **`packages/providers/src/community/pi/provider.ts:370-483`** — the credential and model
  resolution path a custom provider actually takes. Read before writing `models.json`. Three
  behaviors matter: `parsePiModelRef` requires `<provider-id>/<model-id>` (`:370`);
  `modelRegistry.find()` misses are deferred, not fatal (`:407`); and an unmapped provider id
  gets `pi.auth_missing` + continue (`:469-481`). A `models.json` load error surfaces only as
  a **warning** via `modelRegistry.getError()` (`:411`) — a malformed file degrades quietly,
  so verify the registry actually resolved the model rather than trusting an absent error.

- **`packages/providers/src/community/pi/pi-vendor-map.generated.ts`** — the vendor→env-var
  bridge. **Do not edit it** (auto-generated; `bun run check:pi-vendor-map` fails CI on drift).
  Read it only to confirm that a custom `omniroute` provider id is _absent_ from
  `PI_PROVIDER_ENV_VARS`, which is what routes it down the unmapped-provider branch above.

- **`packages/workflows/src/model-validation.ts:62-66`** — `TIER_FALLBACK`. Read before
  changing any tier: an _unset_ tier does not error, it silently resolves to a sibling
  (`small` → `medium` → `large`). Deleting a tier to disable it would therefore route small
  work to **opus**. Rebind tiers; never unset them.

- **`C:\Users\karam\.archon\workflows\repo-build.yaml`** — the M1.5 home-scoped build workflow
  (`provider: claude`, workflow-level `model: medium`). The natural acceptance target: it is
  user-owned, dispatchable at every Class A registry row, and not upstream's to break.

- **`.archon/workflows/defaults/archon-fix-github-issue.yaml`** — the densest real mix of tiers
  in one graph (`small` at `:30`, `:113`, `:304`; `large` at `:184`). Use it to reason about
  blast radius. **Do not edit any file under `.archon/workflows/defaults/`** — this checkout
  tracks upstream `coleam00/Archon`.

- **`PRPs/initials/archon-m1-migration.md`** and **`PRPs/1-archon-m15-system-wide-engine.md`** —
  the two applied milestones. M1's 15 gotchas were measured on this machine and most still
  bind; M1.5's execution report records six more. Read both before writing the PRP; do not
  re-derive.

## DOCUMENTATION:

- In-repo authority (this `dev` checkout is ahead of the published site):
  - `CLAUDE.md` §_Model Validation_ (tier/alias resolution order), §_Configuration Priority_
    (workflow YAML > config defaults > SDK defaults), §_Home-scoped workflows_
  - `packages/docs-web/src/content/docs/reference/workflow-language-constitution.md` — the
    admissibility test quoted in workstream 3. **Cite it in the PRP's design section.**
  - `packages/docs-web/src/content/docs/reference/provider-capabilities.md` — the generated
    capability matrix (regenerate with `bun run generate:capability-matrix`; never hand-edit)
  - `packages/docs-web/src/content/docs/getting-started/ai-assistants.md` — Pi setup, backend
    refs, extension config
  - `.claude/skills/archon/references/parameter-matrix.md` — which field is valid on which node
    type, plus the silent-failure catalog (unknown YAML keys **warn, not error**)
- Pi model-ref format: `packages/providers/src/community/pi/model-ref.ts:17` — note the model
  id may itself contain slashes (`openrouter/qwen/qwen3-coder`).
- OmniRoute: local dashboard + `GET http://localhost:20128/v1/models`. Read cost from the
  `x-omniroute-response-cost` response header — **not** the `omniroute cost` CLI, which crashes
  (see `HANDOFF.md` Dead Ends).
- `C:\Users\karam\.claude\CLAUDE.md` — the `0-`/`1-` binary-state convention governing the PRP
  this INITIAL produces, and the ROADMAP/PROJECTS update rules.

## OTHER CONSIDERATIONS:

**Routing a tier to OmniRoute routes it to Pi, and Pi is not capability-equivalent to Claude.**
This is the single largest risk and the PRP must gate on it. From
`packages/providers/src/community/pi/capabilities.ts` (verified 2026-08-16):

| Capability                                     | Pi              | Consequence for a rebound tier                                                                                                                                              |
| ---------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `structuredOutput`                             | `'best-effort'` | Not SDK-enforced. Prompt-augment + validate + re-ask ×3, then **fail the node**. Any node with `output_format` on the rebound tier gets less reliable, not silently wrong.  |
| `mcp`                                          | `false`         | Node-level `mcp:` config is **ignored** (dag-executor warns)                                                                                                                |
| `hooks`                                        | `false`         | Claude-only anyway; a rebound node loses them                                                                                                                               |
| `agents`                                       | `false`         | Inline sub-agent definitions ignored                                                                                                                                        |
| `costControl`                                  | `false`         | **`maxBudgetUsd` does not apply** — no per-node spend ceiling                                                                                                               |
| `containerExec`                                | `false`         | Fails the container preflight (`collectContainerIncompatibleProviders`, `dag-executor.ts:7437`). Irrelevant for worktree isolation; blocking for folder-project containers. |
| `fallbackModel` / `sandbox` / `settingSources` | `false`         | Ignored                                                                                                                                                                     |

Audit which of the **11 `model: small` nodes** also declare `output_format`, `mcp`, `agents`,
or `maxBudgetUsd` **before** rebinding — those are the nodes that change behavior, and the
dag-executor's ignored-capability warning is the only thing that will tell the user. Scoping
to `small` bounds this audit to 11 nodes instead of 31; that containment is the main reason
`small`-only was chosen.

**Decisions settled at sign-off (2026-08-16) — the PRP implements these, does not revisit them:**

1. **No engine-level auto-router**, not even opt-in and default-off. Rationale in workstream 3:
   inadmissible under the constitution's implicit-behavior rule, and low-value against 31
   nodes that already declare intent. Rejected alternatives: a full router (breaks the
   config's own "tiers must stay HONEST" invariant) and a stretch-goal router firing only on
   undeclared nodes (still an engine change, still needs a defeat switch, for a case that
   `script:` + `when:` already covers).
2. **`small` only.** `medium` and `large` keep resolving to Claude. Rejected: `small` +
   `medium` (22 nodes; `medium` carries implementation/execution work in `repo-build.yaml` and
   `archon-piv-loop.yaml`, where Pi's best-effort structured output is a real quality risk) and
   all three (contradicts the honesty invariant the config documents about itself). Widening to
   `medium` is a _later_ decision to be made on measured evidence from this milestone, and the
   PRP should say what evidence would justify it.

**Pi is `builtIn: false`** (`packages/providers/src/community/pi/registration.ts:23`) — a
community provider registered separately from `registerBuiltinProviders()`. Confirm it is
actually registered and resolvable in this install _before_ pointing a tier at it; a tier whose
`provider` is unregistered fails workflow load with `Unknown provider '<id>'`.

**Never unset a tier to disable it.** `TIER_FALLBACK` (above) makes an unset `small` resolve to
`medium`, then `large`. The failure mode is a cost _increase_ that looks like a cost decrease
in the config diff.

**Credential mode must stay subscription.** All four relevant keys are unset today and M1
required this. A stray `ANTHROPIC_API_KEY` silently converts every Claude-tier build to metered
billing — the opposite of this feature's goal. **Do not create `C:\Users\karam\archon\.env`.**
If OmniRoute needs an API key value for its own OpenAI-compatible auth, it must land in
`models.json` or a Pi-scoped var, never in a var Claude or Codex reads.

**This checkout tracks upstream `coleam00/Archon` on `dev`, and is Class D
(`blocked:upstream-no-push`) in the M1.5 registry.** `INITIAL.md`, `HANDOFF.md`, and `PRPs/`
here are deliberately untracked and must never enter a commit to upstream. Do not edit
`.archon/config.yaml` (upstream's dogfooding config) or anything under
`.archon/workflows/defaults/`. **All configuration for this feature lands in `~/.archon/` and
`~/.pi/`, both outside any git repo** — which also means it has no backup; record the final
`models.json` and tier block verbatim in the PRP's execution report so it can be retyped.

**Verify the free path is actually free, per-call and not once.** `HANDOFF.md` records
`x-omniroute-response-cost: 0.0000000000` on a real response, but that was a direct curl
against a pinned `:free` model, not a Pi-mediated agentic run with tool calls. OmniRoute's
`auto/*` models are a **combo router** (`owned_by: "combo"`) that may select a paid backend.
Pin an explicit free model for the rebound tier rather than relying on `auto/`, or accept and
measure the variance — do not assume the `auto/` alias preserves the zero-cost result.

**Measure against a real baseline.** M1's one measured Archon build cost **$1.6642**. The PRP's
acceptance step should run the _same_ workflow before and after rebinding and report both
numbers plus quota impact, rather than asserting a saving.

**Scope discipline.** This is a config-layer binding plus its verification. It is **not** the
place to build an engine-level auto-router (see workstream 3), add a new provider package,
touch `pi-vendor-map.generated.ts`, or promote Pi to `builtIn: true`. Note them; do not build
them.

**Bookkeeping this feature owes, once the design is real** (from `HANDOFF.md`, still
outstanding):

- Add a "superseded" pointer at `BUILD-ORDER.md`'s "Model routing & cost tiers" section
  (~line 143), and correct its now-stale assumption that "no free option available."
- Promote this out of `ROADMAP.md`'s `## Later` when it actually starts — it is currently
  behind Kern, and `HANDOFF.md` is the only pointer to it.
