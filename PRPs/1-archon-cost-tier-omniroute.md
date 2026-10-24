name: "Cost-tier routing — rebind `small` to OmniRoute via Pi"
description: |
A CONFIG-LAYER milestone. Archon already has a per-node model-tier abstraction that 10
bundled nodes use; the defect is that all three tiers terminate at Claude, so `model: small`
buys a cheaper token price inside a budget that is not denominated in tokens. This PRP makes
a non-Claude backend reachable (a `~/.pi/agent/models.json` custom provider pointed at the
already-running OmniRoute server) and rebinds `small` — and only `small` — to it. No engine
code changes. No auto-router (rejected under the Workflow Language Constitution; rationale
recorded in the Design section, not silently dropped).

## Purpose

Give an implementing agent everything needed to land this in one pass: the exact file contents,
the measured behavior of every seam it crosses, the eight places the source INITIAL was
optimistic or wrong, and validation gates that actually distinguish "it worked" from "it looked
like it worked."

## Core Principles

1. **Context is King** — every claim below was re-measured against this `dev` checkout on
   2026-08-16. Where a measurement contradicts `INITIAL.md`, the correction is stated explicitly
   in _Corrections to the INITIAL_ rather than quietly applied.
2. **Validation Loops** — four gates, each executable, each falsifiable.
3. **Information Dense** — real paths, real line numbers, real HTTP responses.
4. **Progressive Success** — reachability → probe → rebind → real dispatch → bookkeeping.
5. **Global rules** — follow `CLAUDE.md` (repo) and `C:\Users\karam\.claude\CLAUDE.md` (user).

---

## Goal

**End state.** A workflow node that declares `model: small` executes against the local OmniRoute
server through Archon's Pi provider, on a pinned free OpenRouter-backed model, and completes
successfully — while `medium` still resolves to `claude/claude-sonnet-5` and `large` to
`claude/claude-opus-5`, both provably untouched.

**Everything this milestone writes lives outside git:**

```
C:\Users\karam\.pi\agent\models.json          CREATE  the custom OmniRoute provider (does not exist today)
C:\Users\karam\.archon\config.yaml            MODIFY  tiers.small only; assistants.pi added
C:\Users\karam\.archon\workflows\tier-probe.yaml  CREATE  the cheap acceptance probe
```

Plus three bookkeeping edits under `C:\Users\karam\.claude\claude-projects\` and this PRP's own
`0-` → `1-` rename.

**Zero changes to Archon source.** This checkout is Class D (`blocked:upstream-no-push`).

## Why

- **The measured defect.** `C:\Users\karam\.archon\config.yaml:23-32` pins all three tiers to
  Claude. A node that dutifully declares `model: small` still draws the same weekly subscription
  quota as `large`. The routing decision is _already_ being made — by the workflow author, per
  node, at authoring time — it just has nowhere cheap to land.
- **The leverage is the tier seam.** 10 bundled nodes change cost class with **no YAML edit**
  (see _Corrections_ C1 — the INITIAL said 11). One three-line config change moves all of them.
- **The workload matches.** The `small` tier's declared job — routing, glue, classification,
  mechanical checks — is exactly the quota-wasteful kind where a free model's failure mode is
  visible and cheap.
- **`small`-only bounds the blast radius** to 10 nodes instead of 30, which is the whole reason
  that scope was chosen at sign-off.

## What

### User-visible behavior

- `bun run cli ai tier list --json` reports `small.effective = { provider: "pi", model: "omniroute/…" }`
  and leaves `medium`/`large` on Claude.
- A `model: small` node's `node_started` event carries the OmniRoute model ref; its
  `dag_node_started` log line carries `provider: "pi"`.
- The OmniRoute dashboard shows one request per `small` node execution, at $0.
- Nothing else changes. No new CLI flag, no new YAML field, no new engine behavior.

### Success Criteria

- [ ] `~/.pi/agent/models.json` exists, parses, and `ModelRegistry` resolves the pinned model
      (proved by the ABSENCE of `pi.model_not_in_static_catalog_deferring` in the run log — see
      Gotcha 4, a load error is only a _warning_).
- [ ] `bun run cli ai tier list --json` → `small.effective.provider == "pi"`,
      `medium.effective == {claude, claude-sonnet-5}`, `large.effective == {claude, claude-opus-5}`.
- [ ] `tier-probe.yaml` completes: its `model: small` node returns schema-valid structured output
      AND a downstream node successfully reads `$probe-classify.output.verdict` (strict field
      access — this is the real integration risk, not the model call itself).
- [ ] The probe's run log shows `provider: "pi"` on the small node and **no** `⚠️` capability or
      model-provider-conflict message.
- [ ] Cost of the small node verified $0 — via the OmniRoute **dashboard** or a non-streaming
      probe, **NOT** the streaming `x-omniroute-response-cost` header (Correction C3).
- [ ] A real `repo-build` dispatch against a Class A registry row (`fpv-aim-trainer`) still
      passes its validation contract end to end — the regression check, not the cost measurement
      (Correction C7).
- [ ] A cost A/B on a workflow that actually _uses_ `small`, run before and after the rebind,
      with both numbers reported.
- [ ] `~/.archon/config.yaml`'s comment header survives intact (never use `ai tier set`).
- [ ] `models.json` and the final `tiers:` block are recorded verbatim in the execution report —
      both live outside any git repo and have no backup.
- [ ] Bookkeeping: BUILD-ORDER.md superseded pointer + stale-claim correction; ROADMAP.md
      promotion; PROJECTS.md entry; `git mv 0-…` → `1-…`.

---

## All Needed Context

### Documentation & References

```yaml
# ══════════════════ MUST READ ══════════════════

- file: C:\Users\karam\archon\INITIAL.md
  why: This PRP's source. Its two sign-off decisions (no auto-router; small-only) are SETTLED
       and are implemented, not revisited. Read `Corrections to the INITIAL` below FIRST —
       eight of its factual claims were re-measured and five needed changing.

- file: C:\Users\karam\archon\PRPs\1-archon-m1-migration.md
  why: GOTCHA 1 (a stray API key silently converts to metered billing — still binding),
       GOTCHA 9 (never edit this repo's .archon/config.yaml), GOTCHA 10 (pin the model),
       and Task 1's RECORDED CLI invocation form — `archon` is NOT on PATH (Correction C5).

- file: C:\Users\karam\archon\PRPs\1-archon-m15-system-wide-engine.md
  why: The registry (`~/.archon/projects.md`) + guard that Task 8's real dispatch goes through.
       Its execution report items 4-5 matter here: `workflow list --json` carries no `source`
       field, and `workflow run --detach --json` returns NO runId — recover it from the
       detached child's log (`workflow_starting` event's `workflowRunId`).

- file: C:\Users\karam\.archon\config.yaml
  why: THE FILE BEING EDITED. Mirror its commenting discipline: every pin carries its reason.
       Its own header warns that `archon ai tier set` rewrites it in flow style and DROPS
       COMMENTS. Hand-edit only.

- file: packages\providers\src\community\pi\provider.ts:362-483
  why: The credential + model resolution path a custom Pi provider takes. Four behaviors:
       (1) `parsePiModelRef` splits on the FIRST '/' — provider must match /^[a-z][a-z0-9-]*$/
       (2) `ModelRegistry.create(authStorage)` with no path → `~/.pi/agent/models.json`
       (3) a models.json load error is a WARNING (`pi.model_registry_load_error`), not a throw
       (4) an unmapped provider id with no credential → `pi.auth_missing` + CONTINUE

- file: packages\providers\src\community\pi\provider.ts:794-813
  why: [LOOKUP-2]. If the model is still unresolved AFTER bindExtensions(), the run THROWS
       "Pi model not found" — and the error text blames a missing extension, which will be a
       red herring here. A malformed models.json surfaces as THAT message, not a JSON error.

- file: packages\providers\src\community\pi\model-ref.ts:21-32
  why: `parsePiModelRef` in full. The model id may itself contain slashes AND colons —
       `omniroute/openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` parses to
       provider=`omniroute`, modelId=`openrouter/nvidia/nemotron-3-ultra-550b-a55b:free`.

- file: packages\providers\src\community\pi\capabilities.ts
  why: PI_CAPABILITIES verbatim. structuredOutput:'best-effort', mcp/hooks/agents/costControl/
       containerExec/fallbackModel/sandbox/settingSources all false; toolRestrictions,
       envInjection, sessionResume, skills, effortControl, thinkingControl, nativeTools true.

- file: packages\providers\src\community\pi\pi-vendor-map.generated.ts
  why: DO NOT EDIT (auto-generated; `bun run check:pi-vendor-map` fails CI on drift). Read only
       to confirm `omniroute` is ABSENT from PI_PROVIDER_ENV_VARS — VERIFIED absent 2026-08-16.
       That absence is what routes it down the unmapped-provider branch above.

- file: packages\providers\src\community\pi\config.ts:118-162
  why: `parsePiConfig` — the shape of `assistants.pi` in config.yaml. Accepts model, env,
       maxConcurrent, enableExtensions, interactive, extensionFlags, nodes.<id>. INVALID FIELDS
       ARE DROPPED SILENTLY (never throws). enableExtensions defaults to TRUE.

- file: packages\workflows\src\model-validation.ts:62-66
  why: TIER_FALLBACK. An UNSET tier does not error — `small` silently resolves to `medium`,
       then `large`. Deleting a tier to disable it would route small work to OPUS. Rebind
       tiers; never unset them.

- file: packages\workflows\src\model-validation.ts:139-179
  why: `buildAiProfile` — the exact layering (`tier defaults → global → repo → per-user DB`)
       that `ai tier list --json` and the dag-executor BOTH consume. Same function, so the CLI
       readout is authoritative for what a run will resolve.

- file: packages\workflows\src\dag-executor.ts:965-1010
  why: Where the tier is resolved per node. THREE things matter:
       (1) a tier preset's `provider` OVERRIDES the node/workflow provider
       (2) `dag.model_provider_conflict` warns ONLY when NODE-level provider disagrees —
           workflow-level `provider: claude` produces NO warning (verified: the only three
           node-level `provider:` lines in bundled defaults are all paired with `model: large`)
       (3) `isRegisteredProvider` is checked HERE, at dispatch — not at load (Correction C8)

- file: packages\workflows\src\dag-executor.ts:1036-1077
  why: `capChecks` — the ignored-capability warning list. `output_format` / `structuredOutput`
       IS NOT IN IT. There is no warning when a node with output_format lands on a best-effort
       provider (Correction C2).

- file: packages\workflows\src\dag-executor.ts:490-496, 1467-1471, 2097-2190
  why: STRUCTURED_OUTPUT_MAX_REASKS = 3. Best-effort providers get a bounded validate-and-reask
       loop with a FRESH session per attempt; exhaustion FAILS the node. Loud, not silent.

- file: packages\workflows\src\loader.ts:642-660
  why: Load-time provider validation covers the literal `provider:` string only.

- docfile: packages\providers\node_modules\@earendil-works\pi-coding-agent\docs\models.md
  why: THE models.json schema reference. Provider fields (baseUrl/api/apiKey/headers/authHeader/
       models/modelOverrides), model fields + defaults, apiKey value-resolution syntax
       ($ENV / !command / literal / $$ / $!), and the `compat` matrix for partial
       OpenAI compatibility. Read this before writing the file, not after.

- doc: packages\docs-web\src\content\docs\reference\workflow-language-constitution.md
  section: "The admissibility test" (line 34) + "the implicit-behavior budget" (line 138)
  critical: The three-count argument against an engine auto-router. CITE IT in the Design
            section — this PRP's most important non-code deliverable is the recorded reasoning.

- doc: packages\docs-web\src\content\docs\reference\provider-capabilities.md
  why: The GENERATED capability matrix. Never hand-edit; regenerate with
       `bun run generate:capability-matrix`. Not touched by this PRP.

- doc: .claude\skills\archon\references\parameter-matrix.md
  why: Which field is valid on which node type + the silent-failure catalog. Unknown YAML keys
       WARN, they do not error — relevant when authoring tier-probe.yaml.

- url: http://localhost:20128/v1/models
  why: OmniRoute's OpenAI-compatible catalog. VERIFIED live 2026-08-16: HTTP 200, 1080 models,
       35 free. Owners: openrouter 965, combo 38 (the `auto/*` router — AVOID), auggie 28,
       theoldllm 26, opencode 6, duckduckgo-web 6, felo-web 5, veoaifree-web 4, others 2.

- file: C:\Users\karam\.archon\projects.md
  why: The M1.5 registry. Class A (dispatchable) rows: sextant, kent, fpv-aim-trainer.
       `archon` itself is Class D. Task 8 dispatches against fpv-aim-trainer.

- file: C:\Users\karam\.claude\CLAUDE.md
  why: The 0-/1- binary-state convention governing THIS file, and the ROADMAP/PROJECTS rules
       (## Now holds exactly ONE item — promotion is not automatic).
```

### Corrections to the INITIAL (re-measured 2026-08-16)

The INITIAL is unusually accurate — but eight claims were re-checked and five need changing.
**These corrections supersede the INITIAL where they conflict.** None of them touch the two
sign-off decisions (no router; `small` only), which stand.

**C1 — The node counts are 30/10/10/9, not 31/11/11/9.** Measured with
`grep -rnE "^\s*model:\s*['\"]?(small|medium|large)" .archon/workflows/defaults/`: **29 tier
declarations in bundled defaults (10 small, 10 medium, 9 large)**, plus one home-scoped
workflow-level `model: medium` in `~/.archon/workflows/repo-build.yaml` = 30. The
`archon-workflow-builder.yaml:212` hit the INITIAL likely counted is prose _inside a prompt
body_ ("Prefer `model: small` for simple classification tasks"), not a declaration. **The
leverage claim becomes "10 nodes change cost class with no YAML edit."** The argument is
unaffected; the number in the execution report must be right.

The ten `small` nodes, in full — this is the entire blast radius:

| #   | File                            | Line | `output_format`? | `allowed_tools` | Node kind                |
| --- | ------------------------------- | ---- | ---------------- | --------------- | ------------------------ |
| 1   | `archon-adversarial-dev.yaml`   | 310  | no               | —               | prompt, `context: fresh` |
| 2   | `archon-create-issue.yaml`      | 52   | **yes**          | `[]`            | prompt                   |
| 3   | `archon-fix-github-issue.yaml`  | 30   | **yes**          | —               | **`command:`** node      |
| 4   | `archon-fix-github-issue.yaml`  | 113  | **yes**          | `[]`            | prompt                   |
| 5   | `archon-fix-github-issue.yaml`  | 304  | **yes**          | `[]`            | prompt, `context: fresh` |
| 6   | `archon-ralph-dag.yaml`         | 24   | no               | —               | prompt                   |
| 7   | `archon-remotion-generate.yaml` | 128  | no               | `[Read]`        | prompt                   |
| 8   | `archon-smart-pr-review.yaml`   | 48   | **yes**          | `[]`            | prompt                   |
| 9   | `archon-validate-pr.yaml`       | 120  | **yes**          | `[]`            | prompt                   |
| 10  | `archon-workflow-builder.yaml`  | 74   | **yes**          | `[]`            | prompt                   |

Zero of them declare `mcp`, `agents`, `hooks`, `skills`, or `maxBudgetUsd` — verified by grep
across the whole defaults directory (`maxBudgetUsd`: no hits at all; the single `mcp:` is
`archon-smart-pr-review.yaml:126`, a _different_ node from the small one at `:48`; `hooks:` only
in `archon-architect` / `archon-refactor-safely`). **So the only capability that actually
changes class is `structuredOutput`.**

**C2 — 7 of 10 is the number that matters, and nothing warns about it.** The INITIAL asks you to
"audit which of the 11 nodes also declare `output_format` … the dag-executor's ignored-capability
warning is the only thing that will tell the user." Both halves need correcting:

- **7 of 10** `small` nodes declare `output_format` — 70%, not a fringe subset. `output_format`
  is the dominant idiom for a `small` node, because "classify and emit JSON" is what the tier is
  _for_.
- **There is no warning.** `dag-executor.ts:1036-1057`'s `capChecks` array covers
  `allowed_tools/denied_tools, hooks, mcp, skills, agents, effort, thinking, maxBudgetUsd,
fallbackModel, sandbox, settingSources, env`. **`output_format` / `structuredOutput` is not in
  the list.** `validator.ts:479-560`'s load-time capability warnings are keyed on the _explicit_
  `provider:` (still `claude`), so they say nothing either. A node with `output_format` moving
  from enforced to best-effort produces **no warning at any level**.

  The failure mode is still loud — `STRUCTURED_OUTPUT_MAX_REASKS = 3` then the node FAILS
  (`dag-executor.ts:2097-2190`), never silently-wrong output — but it is loud _at run time, in
  the middle of a build_, not at authoring or dispatch time. **This is the single largest risk in
  the milestone and it is why Level 2's probe must exercise `output_format` + strict
  `$node.output.field` access, not just "did a model reply."**

**C3 — `x-omniroute-response-cost` is unusable as a per-call cost signal on streaming responses.**
Measured on two real calls to `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free`:

| Request            | `content-type`      | `x-omniroute-tokens-in` | `tokens-out` | `x-omniroute-response-cost` |
| ------------------ | ------------------- | ----------------------- | ------------ | --------------------------- |
| default (streamed) | `text/event-stream` | `0`                     | `0`          | `0.0000000000`              |
| `"stream": false`  | `application/json`  | `18`                    | `12`         | `0.0000000000`              |

Response headers are flushed **before** the body, so on a streamed response the cost and token
counters are always zero — they prove nothing. **Pi always streams.** The INITIAL's acceptance
criterion ("`x-omniroute-response-cost` … confirm the call did not bill Anthropic") therefore
cannot be satisfied by reading that header off an Archon run. Use the **OmniRoute dashboard**, or
a separate non-streaming curl against the _same pinned model id_, which is what actually
demonstrates the model's price. (The non-streaming reading above is the real evidence: real token
counts, cost `0.0000000000`.)

**C4 — OmniRoute needs no auth, so no key has to land anywhere.** An unauthenticated
`POST http://localhost:20128/v1/chat/completions` returned **HTTP 200** with a complete
response. The INITIAL's contingency ("if OmniRoute needs an API key value … it must land in
`models.json` or a Pi-scoped var") does not arise. `models.json` still gets a **dummy literal**
`apiKey`, because pi treats a model as unavailable until _some_ auth is configured
(`ModelRegistry.hasConfiguredAuth`, and `docs/models.md`: "keyless local servers should keep a
dummy value"). A literal is not an env var and is not a secret — it never leaves the file.

**C5 — `archon` is not on PATH on this machine.** `which archon` → not found. Every command in
this PRP is `bun run cli …` executed from `C:\Users\karam\archon`, or M1's recorded form
`bun C:/Users/karam/archon/packages/cli/src/cli.ts <args> --cwd <target>`. Do not write an
`archon …` command into any script or doc produced here.

**C6 — `C:\Users\karam\.pi` does not exist at all.** Not the file, not the directory, not the
parent. Task 2 creates `~/.pi/agent/` before writing `models.json`. (`PI_CODING_AGENT_DIR` is
also unset, so pi's `getAgentDir()` resolves to `~/.pi/agent` — confirmed in
`pi-coding-agent/dist/config.js:412`.)

**C7 — `repo-build.yaml` has ZERO `small` nodes, so a repo-build before/after cannot show a
saving.** Its only tier is workflow-level `model: medium`. The INITIAL asks for the _same_
workflow run before and after "rather than asserting a saving" — correct instinct, wrong
workflow. Split it:

- `repo-build` before/after = the **regression check**. Expected result: identical cost, identical
  outcome. That is the point — it proves the rebind didn't leak into `medium`.
- The **cost A/B** runs `tier-probe.yaml` twice: once with `tiers.small` still on
  `claude-haiku-4-5`, once after the rebind. Same graph, same prompt, one variable.

**C8 — a bad tier `provider` fails at DISPATCH, not at load.** The INITIAL says "a tier whose
`provider` is unregistered fails workflow load with `Unknown provider '<id>'`." Measured:
`loader.ts:642-660` validates the literal `provider:` string on the workflow and on nodes; the
tier's _resolved_ provider is checked at `dag-executor.ts:1003`, i.e. after the run row exists
and (for an isolated run) after the worktree has been created. The mitigation the INITIAL
prescribes — confirm Pi is registered before pointing a tier at it — is still exactly right, just
for a worse reason than stated. **Verified 2026-08-16: `pi` IS registered** in this checkout
(`registry.ts:180` inside `registerCommunityProviders()`), `builtIn: false`,
`structuredOutput: 'best-effort'`.

### Measured facts about OmniRoute (2026-08-16, this machine)

```
GET  http://localhost:20128/v1/models          → HTTP 200, 1080 models, 35 with "free" in the id
POST http://localhost:20128/v1/chat/completions → HTTP 200 with NO Authorization header
     x-omniroute-version: 3.8.49
     x-omniroute-decision: strategy=single; provider=openrouter; latency_ms=2898
     x-omniroute-model: nvidia/nemotron-3-ultra-550b-a55b:free
```

Candidate free models (all `tool_calling: true`), measured from the catalog:

| Model id                                            | ctx       | max out | notes                                                                           |
| --------------------------------------------------- | --------- | ------- | ------------------------------------------------------------------------------- |
| `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` | 1,000,000 | 65,536  | **RECOMMENDED.** effort_tiers high/medium                                       |
| `openrouter/openai/gpt-oss-20b:free`                | 131,072   | 32,768  | fallback #1 — conventional OpenAI reasoning shape, effort_tiers high/medium/low |
| `openrouter/nvidia/nemotron-3-super-120b-a12b:free` | 262,144   | 262,144 | fallback #2                                                                     |
| `openrouter/google/gemma-4-31b-it:free`             | 262,144   | 32,768  | fallback #3, vision                                                             |
| `auto/best-free`, `auto/coding:free`                | 1,048,576 | 384,000 | **DO NOT USE** — `owned_by: "combo"`, a router that may select a paid backend   |

Two behavioral probes against the recommended model, both passed:

1. **JSON adherence.** Prompted for a bare object, no fences → returned exactly
   `{"issue_type":"bug","reasoning":"short"}`. Encouraging for the 7 `output_format` nodes,
   though a single one-shot is not proof; Level 2 is.
2. **Tool calling.** Sent an OpenAI `tools` array → returned a well-formed
   `tool_calls[0] = {name:"ls", arguments:"{\"path\":\".\"}"}`. The agentic path works through
   the proxy.

The model streams `reasoning` / `reasoning_details` deltas alongside content — see Gotcha 6.

### Current file tree (the parts this PRP touches)

```
C:\Users\karam\
├── .archon\
│   ├── config.yaml          MODIFY  33 lines, comment-rich, tiers at :23-32
│   ├── projects.md          read-only  the M1.5 registry
│   └── workflows\
│       └── repo-build.yaml  read-only  home-scoped, `model: medium`
├── .pi\                     DOES NOT EXIST  (Correction C6)
├── archon\                  Class D — source is read-only to this PRP
│   ├── INITIAL.md           untracked, must never enter an upstream commit
│   ├── HANDOFF.md           untracked
│   └── PRPs\
│       ├── 0-archon-cost-tier-omniroute.md   THIS FILE
│       ├── 1-archon-m1-migration.md
│       ├── 1-archon-m15-system-wide-engine.md
│       └── initials\
└── .claude\claude-projects\
    ├── ROADMAP.md           MODIFY  the item is in `## Later` at :49
    ├── PROJECTS.md          MODIFY
    └── agentic-research-2026\BUILD-ORDER.md  MODIFY  §"Model routing & cost tiers" at :143
```

### Desired file tree

```
C:\Users\karam\
├── .pi\agent\
│   └── models.json              CREATE  Task 2 — the omniroute custom provider, one pinned model
├── .archon\
│   ├── config.yaml              MODIFY  Task 6 — tiers.small rebound; assistants.pi added
│   └── workflows\
│       └── tier-probe.yaml      CREATE  Task 4 — the cheap A/B + acceptance probe
└── archon\PRPs\
    └── 1-archon-cost-tier-omniroute.md   RENAMED from 0- in the final commit (Task 10)
```

### Known Gotchas of our codebase & Library Quirks

```yaml
# ══════════════════════════════════════════════════════════════════════════════
# GOTCHA 0 — CARRIED FORWARD FROM M1, UNCHANGED AND STILL BINDING.
#   A stray API key silently converts every Claude-tier run to metered billing —
#   the exact opposite of this feature's goal. RE-VERIFIED 2026-08-16: ANTHROPIC_API_KEY,
#   CLAUDE_API_KEY, CLAUDE_CODE_OAUTH_TOKEN, OPENROUTER_API_KEY, OMNIROUTE_API_KEY are ALL
#   unset, and C:\Users\karam\archon\.env does not exist. DO NOT CREATE IT.
#   OmniRoute needs no key at all (Correction C4), so there is nothing to tempt you.
#   M1 GOTCHA 9 also carries: NEVER edit C:\Users\karam\archon\.archon\config.yaml — that is
#   upstream's dogfooding config, not user configuration.
# ══════════════════════════════════════════════════════════════════════════════

# GOTCHA 1 — NEVER UNSET A TIER TO DISABLE IT.
#   TIER_FALLBACK (model-validation.ts:62-66) is
#     small:  ['small', 'medium', 'large']
#   so an unset `small` resolves to `medium`, then `large`. Deleting the small block to "turn
#   it off" routes small work to OPUS. The failure mode is a cost INCREASE that reads as a cost
#   decrease in the config diff. Rebind; never unset. Rollback = rebind back to
#   claude/claude-haiku-4-5, never `ai tier unset small`.

# GOTCHA 2 — `archon ai tier set` REWRITES ~/.archon/config.yaml IN FLOW STYLE AND DROPS EVERY
#   COMMENT. The file says so about itself at line 3. That file's comments are load-bearing —
#   they carry the "9 bundled workflows reference `large`, these must stay HONEST" invariant and
#   the M1 GOTCHA 10 pin rationale. HAND-EDIT ONLY.
#   `ai tier list --json` is READ-ONLY and is the correct verification tool. `ai tier set` and
#   `ai tier unset` are forbidden in this PRP.

# GOTCHA 3 — A MALFORMED models.json DEGRADES QUIETLY, THEN FAILS WITH A MISLEADING ERROR.
#   provider.ts:411 surfaces a load error only as a WARNING (`pi.model_registry_load_error`),
#   and only when the model ALSO isn't found. The run then continues to [LOOKUP-2]
#   (provider.ts:794-813) and throws:
#     "Pi model not found: provider='omniroute' model='...'. The model was not found in the
#      static catalog or via any installed extension. Ensure the provider extension is
#      installed (e.g. `pi install npm:pi-provider-kiro`) ..."
#   That message is a RED HERRING here — there is no extension involved. If you see it, the
#   cause is almost certainly a models.json schema error, a provider-id typo, or a model-id
#   mismatch. Verify the registry RESOLVED the model; do not trust an absent error.
#   Positive check: the run log should NOT contain `pi.model_not_in_static_catalog_deferring`.

# GOTCHA 4 — PROVIDER ID SYNTAX IS ENFORCED; MODEL ID IS NOT.
#   parsePiModelRef (model-ref.ts:28) requires the provider segment to match /^[a-z][a-z0-9-]*$/.
#   `omniroute` passes. `OmniRoute`, `omni_route`, `omni route` all FAIL, and the failure is a
#   thrown "Invalid Pi model ref" at dispatch. The model id is everything after the FIRST '/'
#   and may contain further slashes and colons — that is why the full ref is
#   `omniroute/openrouter/nvidia/nemotron-3-ultra-550b-a55b:free`.

# GOTCHA 5 — QUOTE THE MODEL REF IN YAML.
#   The ref ends in `:free`. A colon not followed by whitespace is legal in a YAML plain scalar,
#   so `model: omniroute/...:free` does parse — but it is one editing accident (`: free`) away
#   from becoming a nested map, and the resulting error would appear far from the cause.
#   Always write it quoted:  model: "omniroute/openrouter/nvidia/nemotron-3-ultra-550b-a55b:free"

# GOTCHA 6 — THE PINNED MODEL EMITS `reasoning` DELTAS. THIS IS THE #1 TUNING KNOB.
#   Measured: every content chunk carried `reasoning` + `reasoning_details` alongside `content`,
#   and the final chunk reported `reasoning_tokens: 53` for a 61-token completion.
#   Start with `"reasoning": false` in models.json — Archon's `small` nodes are classification,
#   not deliberation, and requesting no reasoning is both cheaper and simpler.
#   If a multi-turn / tool-using small node misbehaves (replay errors, dropped assistant
#   messages, malformed history), the remedies are model-level `compat` flags from
#   pi-coding-agent/docs/models.md §"OpenAI Compatibility", in this order:
#     compat.requiresThinkingAsText: true                       # convert thinking → plain text
#     compat.requiresReasoningContentOnAssistantMessages: true  # empty reasoning_content on replay
#     compat.thinkingFormat: "openrouter"                       # only if reasoning is re-enabled
#   Change ONE at a time and re-run Level 2. Do not shotgun the compat block.

# GOTCHA 7 — OPENROUTER FREE MODELS ARE RATE-LIMITED, AND ARCHON RUNS LAYERS CONCURRENTLY.
#   Independent nodes in the same topological layer dispatch in parallel. Several `small` nodes
#   in one layer against a free OpenRouter backend is a throttling risk that will surface as
#   node failures, not as a clear 429 message. Mitigation, already in the Task 6 config:
#     assistants.pi.maxConcurrent: 2
#   (parsePiConfig accepts it; the semaphore is process-wide — provider.ts:835-848.)

# GOTCHA 8 — `assistants.pi` SILENTLY DROPS FIELDS IT DOESN'T RECOGNIZE.
#   parsePiConfig (config.ts:118-162) never throws — a typo'd key is discarded with no message,
#   matching parseClaudeConfig/parseCodexConfig. After editing, verify the block took effect via
#   behavior (Level 1 gate), not by re-reading your own YAML.

# GOTCHA 9 — `--folder` IS THE CHEAP PROBE PATH, BUT NEVER ADD `--container`.
#   Workflow commands need a git repo; `--folder` is the escape hatch for a plain directory and
#   runs in place with no worktree — ideal for tier-probe. But Pi has `containerExec: false`
#   (capabilities.ts:35), so a folder-project CONTAINER run fails the preflight
#   (`collectContainerIncompatibleProviders`). Plain `--folder` is fine; `--container` is not.

# GOTCHA 10 — WORKTREES ARE CUT FROM origin/<base>, NEVER LOCAL HEAD (M1.5 GOTCHA 1).
#   Only bites Task 8's real repo-build dispatch: anything it needs must be COMMITTED AND
#   PUSHED. `~/.archon/` config is read from the host, not the worktree, so the tier rebind
#   itself is unaffected.

# GOTCHA 11 — `workflow run --detach --json` RETURNS NO runId (M1.5 execution report item 5).
#   You get `conversationId` and `logPath` only; the run row is created by the detached child.
#   Recover the id from the log's `workflow_starting` event (`workflowRunId` field).
#   Also M1 GOTCHA 3: `run --json` WITHOUT `--detach` is not machine-readable.

# GOTCHA 12 — NOTHING WARNS WHEN output_format MEETS A BEST-EFFORT PROVIDER (Correction C2).
#   Not at load (validator.ts keys on the explicit `provider:`), not at dispatch (`capChecks`
#   omits it). The only signal is 3 reasks then a FAILED node, mid-run. Level 2 exists
#   specifically to surface this before a real build does.

# GOTCHA 13 — THIS CHECKOUT IS CLASS D AND ITS PRPs ARE UNTRACKED BY DESIGN.
#   INITIAL.md, HANDOFF.md and PRPs/ must never enter a commit to upstream coleam00/Archon.
#   Do not edit .archon/workflows/defaults/ — read it, reason about it, leave it alone.
#   NEVER run `git clean -fd` anywhere near this checkout (repo CLAUDE.md).

# GOTCHA 14 — EVERYTHING THIS PRP WRITES IS OUTSIDE GIT AND HAS NO BACKUP.
#   ~/.pi/ and ~/.archon/ are not repositories. Record models.json and the final tiers block
#   VERBATIM in the execution report so they can be retyped from this file alone.
```

---

## Implementation Blueprint

### Design: why there is no auto-router (workstream 3, recorded not dropped)

`HANDOFF.md` asked for "logic to decide, per task, whether to route to a cheap/free model or full
Claude." **That mechanism already exists** — it is the tier seam, and the decision is made by the
workflow author, per node, at authoring time. What was missing was a cheap place for `small` to
land. An _engine-level_ router that overrides a node's declared tier is inadmissible under
Archon's Workflow Language Constitution
(`packages/docs-web/src/content/docs/reference/workflow-language-constitution.md`) on three
independent counts:

1. **The constitution names the tier seam as the sanctioned answer to exactly this.** "New
   per-provider capabilities default to provider config / tier-alias presets, not new node
   fields." This milestone _is_ the sanctioned form of the request.
2. **The implicit-behavior budget forbids it** (constitution line 138): every implicit behavior
   must be documented, **individually defeatable**, and fail-safe. A silent re-route of an
   author's declared tier fails all three — and the constitution's own guidance closes with
   "explicit beats implicit, loud beats silent."
3. **It would break an invariant the config states about itself.** `~/.archon/config.yaml:21-22`:
   "9 bundled workflows already reference `large` … these must stay HONEST — mapping large ->
   sonnet would silently downgrade them all." A router is that downgrade with extra steps.

Empirically the value is also low: **30 tier-bearing nodes already declare intent**, so a router
would spend most of its time overriding an explicit authored decision — the one thing the
constitution forbids. Applying the admissibility test (constitution line 34) to a hypothetical
`router:` field: (1) the engine does not need to see it to govern — it changes _which_ model runs,
not ordering/gates/joins; (2) it is evaluation, not declarative data; (3) a `script:` node that
computes the choice plus `when:` on its structured output expresses it today, with zero engine
support. **Rejected on all three.** Settled at sign-off: no router, not even opt-in and
default-off.

The constitutional expression, if a per-task decision is ever genuinely wanted for _undeclared_
nodes, is a `script:` node computing the choice + `when:` on its structured output, or a
workflow-level default. Never a new engine field.

### Data models and structure

The two artifacts are configuration files. Both are reproduced verbatim so the execution report
can copy them and so they can be retyped after a machine loss (Gotcha 14).

**`C:\Users\karam\.pi\agent\models.json`** — schema per
`pi-coding-agent/docs/models.md` §"Provider Configuration" / §"Model Configuration":

```json
{
  "providers": {
    "omniroute": {
      "baseUrl": "http://localhost:20128/v1",
      "api": "openai-completions",
      "apiKey": "omniroute-local-no-auth",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false,
        "maxTokensField": "max_tokens"
      },
      "models": [
        {
          "id": "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free",
          "name": "OmniRoute free (Nemotron 3 Ultra 550B)",
          "reasoning": false,
          "input": ["text"],
          "contextWindow": 1000000,
          "maxTokens": 65536,
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
        }
      ]
    }
  }
}
```

> **This exact JSON was validated against pi's own loader on 2026-08-16**, from a scratch copy
> via `ModelRegistry.create(authStorage, <path>)`:
>
> ```
> loadError: undefined
> found: true
> model: {"id":"openrouter/nvidia/nemotron-3-ultra-550b-a55b:free","provider":"omniroute",
>         "api":"openai-completions","baseUrl":"http://localhost:20128/v1","ctx":1000000,
>         "max":65536,"reasoning":false,
>         "compat":{"supportsDeveloperRole":false,"supportsReasoningEffort":false,
>                   "maxTokensField":"max_tokens"}}
> hasConfiguredAuth: true
> available: 1
> ```
>
> `hasConfiguredAuth: true` and `available: 1` are the two that matter — they prove the dummy
> `apiKey` literal satisfies pi's availability gate (Correction C4). Type it byte for byte.

Field-by-field rationale — do not change any of these without re-reading `docs/models.md`:

- `"omniroute"` — provider id. Lowercase, matches `/^[a-z][a-z0-9-]*$/` (Gotcha 4), and is
  **absent** from `PI_PROVIDER_ENV_VARS`, which is what routes it down the
  `pi.auth_missing`-and-continue branch (`provider.ts:469-481`) instead of a hard credential
  failure.
- `apiKey` — a **literal dummy**. OmniRoute needs no auth (Correction C4), but pi treats a model
  as unavailable until some auth is configured. A plain string is a literal (only `$VAR`,
  `${VAR}` and a leading `!` are special), so nothing is read from the environment and nothing
  leaks. It is also the models.json fallback consumed by
  `ModelRegistry.getApiKeyAndHeaders()` when `AuthStorage` has nothing — verified in
  `dist/core/model-registry.js`.
- `compat.supportsDeveloperRole: false` / `supportsReasoningEffort: false` — the standard
  posture `docs/models.md` prescribes for OpenAI-compatible proxies. Conservative: if the
  backend does support them, the cost is a slightly less precise system-prompt role, not a
  failure.
- `"reasoning": false` — see Gotcha 6. The single most likely field to need changing.
- `contextWindow` / `maxTokens` — mirror the catalog's `context_length: 1000000` and
  `max_output_tokens: 65536`. If omitted, pi defaults to 128000/16384 and would truncate.
- `cost` all zeros — this is what makes Archon's own cost accounting report $0 for the node.
  It is a _declaration_, not a measurement; Level 4 measures independently.

**The tier block in `C:\Users\karam\.archon\config.yaml`** — replacing lines 23-32, preserving
every existing comment and adding the reason for the new pin:

```yaml
# Model tiers. Workflows should reference `model: small|medium|large` rather than
# hardcoding a model id — the tier resolves per-install from here, so changing the
# cost profile is one edit instead of one per YAML.
# 9 bundled workflows already reference `large` (incl. archon-piv-loop, which M2 adopts),
# so these must stay HONEST — mapping large -> sonnet would silently downgrade them all.
tiers:
  small:
    # Rebound 2026-08-16 (PRPs/1-archon-cost-tier-omniroute.md). Routing, glue and
    # mechanical checks do not need Claude, and a cheaper TOKEN price does not help a
    # budget denominated in weekly subscription quota. Goes to the local OmniRoute
    # proxy (localhost:20128) via Pi -> a pinned FREE OpenRouter model, so these 10
    # bundled nodes cost $0 and consume no Claude quota.
    # Pinned, never `auto/*`: the auto router is owned_by "combo" and may pick a PAID
    # backend. Provider defined in ~/.pi/agent/models.json — that file and this pin are
    # a matched pair; neither works alone.
    # 7 of the 10 small nodes use `output_format`, which is BEST-EFFORT on Pi
    # (validate + reask x3, then the node FAILS). Loud, not silently wrong — but if
    # small nodes start failing schema validation, this pin is the first suspect.
    provider: pi
    model: 'omniroute/openrouter/nvidia/nemotron-3-ultra-550b-a55b:free'
  medium:
    provider: claude
    model: claude-sonnet-5 # implementation / execution
  large:
    provider: claude
    model: claude-opus-5 # planning, architecture, deep-context reasoning

# Pi is a COMMUNITY provider (builtIn: false) reached only through the tier above.
assistants:
  pi:
    # Free OpenRouter backends throttle, and Archon dispatches independent nodes in the
    # same DAG layer concurrently. Cap it — the semaphore is process-wide.
    maxConcurrent: 2
```

> **Placement note.** `assistants.pi` must be merged into the file's **existing** `assistants:`
> block (which already holds `claude:`), not appended as a second top-level `assistants:` key —
> a duplicate key silently discards the first in most YAML parsers.

**`C:\Users\karam\.archon\workflows\tier-probe.yaml`** — the acceptance probe. Deliberately
mirrors the _shape_ of the 7 at-risk nodes (prompt + `allowed_tools: []` + `output_format`) and
then consumes a field, because strict `$node.output.field` access through a best-effort provider
is the actual integration risk (Gotcha 12), not the model call:

```yaml
name: tier-probe
description: |
  Use when: verifying which backend the `small` tier resolves to, and whether a small-tier node
  can still satisfy a declared output_format contract.
  Does: one classification node at `model: small` with an output_format, then a bash node that
  reads a FIELD of its structured output (strict access — fails loudly if the schema wasn't met).
  NOT for: any real work. This is a measurement instrument.

provider: claude # workflow-level default; the `model: small` node overrides it via the tier

nodes:
  - id: probe-classify
    model: small
    allowed_tools: []
    prompt: |
      Classify the following sentence as exactly one of: bug, feature, question.

      Sentence: $ARGUMENTS

      Respond with the classification and a one-sentence reason.
    output_format:
      type: object
      properties:
        verdict:
          type: string
          enum: ['bug', 'feature', 'question']
        reasoning:
          type: string
      required: [verdict, reasoning]

  - id: probe-consume
    depends_on: [probe-classify]
    bash: |
      set -uo pipefail
      # NOTE the missing quotes — deliberate. In a bash node the engine substitutes
      # $node.output.field ALREADY SHELL-QUOTED (dag-executor.ts:708-730), and an empty
      # field substitutes to the literal two characters ''. Wrapping it in double quotes
      # would make `test -n` pass on an empty value — a silently broken assertion.
      VERDICT=$probe-classify.output.verdict
      echo "verdict=${VERDICT}"
      test -n "${VERDICT}"
```

The `enum` is not decoration: it mirrors the bundled idiom (`archon-create-issue.yaml:59-72` uses
`enum` + `required` on every property) and is a strictly harder test of a free model's schema
compliance than a bare `type: string`.

> **This exact YAML was validated against the real engine schema on 2026-08-16** —
> `workflowDefinitionSchema.safeParse(Bun.YAML.parse(...))` → `valid: true`, with
> `nodes[0].model === 'small'`. Note this is a _schema_ check only: the loader's graph-level
> pass (`validateDagStructure` — cycles, deps, `$nodeId.output` refs) runs separately at
> discovery, which Task 4's `workflow list --json` exercises.

### List of tasks to be completed, in order

```yaml
Task 0 — PRE-FLIGHT (no writes). Refuse to continue if any check fails.
  RUN:  printenv ANTHROPIC_API_KEY CLAUDE_API_KEY CLAUDE_CODE_OAUTH_TOKEN OPENROUTER_API_KEY
    - ALL must be empty (GOTCHA 0). If any is set: STOP, tell the user, do not proceed.
  RUN:  test ! -f C:/Users/karam/archon/.env  →  must pass. Never create it.
  RUN:  curl -s -o /dev/null -w "%{http_code}" http://localhost:20128/v1/models
    - Must be 200. If not, OmniRoute isn't running — start it before continuing.
  RUN:  cd C:/Users/karam/archon && bun run cli ai tier list --json
    - RECORD the BEFORE state verbatim into the execution report. This is the rollback target.
  VERIFY: `pi` appears in the provider registry (see Task 1).

Task 1 — CONFIRM Pi is registered and resolvable (Correction C8).
  RUN:
    bun -e "const m=await import('./packages/providers/src/index.ts'); \
            m.registerBuiltinProviders(); m.registerCommunityProviders(); \
            console.log(m.getRegisteredProviders().map(p=>p.id))"
  EXPECT: the array contains "pi".
  WHY: a tier whose provider is unregistered does NOT fail at load — it fails at dispatch,
       after the run row and worktree exist. Front-load the check.

Task 2 — CREATE C:\Users\karam\.pi\agent\models.json.
  MKDIR: C:\Users\karam\.pi\agent   (GOTCHA C6 — the whole tree is absent)
  CREATE: models.json exactly as given in `Data models and structure` above.
  VERIFY (all three, in order):
    a) bun -e "JSON.parse(await Bun.file('C:/Users/karam/.pi/agent/models.json').text())"
       — a parse error here is the ONLY place a malformed file fails loudly (GOTCHA 3).
    b) the provider key is lowercase `omniroute` (GOTCHA 4)
    c) the model `id` string is byte-identical to a `data[].id` from /v1/models

Task 3 — VERIFY the registry actually resolves the model (do not trust an absent error).
  RUN a direct ModelRegistry probe — the one check that distinguishes "file written" from
  "file understood". MUST run from packages/providers: the pi SDK is that package's dependency
  and does NOT resolve from the repo root (VERIFIED — root import errors "Cannot find module").
    cd C:/Users/karam/archon/packages/providers && bun -e "\
      const pi=await import('@earendil-works/pi-coding-agent'); \
      const r=pi.ModelRegistry.create(pi.AuthStorage.create()); \
      console.log('loadError:', r.getError?.()); \
      console.log('found:', !!r.find('omniroute','openrouter/nvidia/nemotron-3-ultra-550b-a55b:free')); \
      console.log('sanity:', !!r.find('anthropic','claude-sonnet-4-5'));"
  EXPECT: loadError: undefined  /  found: true  /  sanity: true
  REFERENCE READING taken 2026-08-16 BEFORE models.json existed — this is exactly the
  dangerous case GOTCHA 3 describes, and it is what a broken file also looks like:
      loadError: undefined   found: false   sanity: true
  `sanity: true` proves the registry itself loaded (built-in catalog intact), so a `found:
  false` alongside it isolates the fault to models.json — not to the probe.
  IF found is false: re-read pi-coding-agent/docs/models.md §Provider Configuration. Do NOT
    proceed to Task 6 — a false here becomes GOTCHA 3's misleading "install an extension" error
    in the middle of a real run.

Task 4 — CREATE C:\Users\karam\.archon\workflows\tier-probe.yaml (content above).
  VERIFY: bun run cli workflow list --json  lists `tier-probe`
    - home-scoped discovery is automatic; subfolders work 1 level deep only
    - per M1.5 execution report item 4, CLI `workflow list --json` carries no `source` field —
      confirm scope from the discovery log's `home_workflows_loaded` count instead

Task 5 — BASELINE the probe on the CURRENT (Claude/haiku) small tier. THE "BEFORE" HALF OF C7.
  MKDIR once: C:\Users\karam\archon-scratch\tier-probe   (a plain, non-git directory)
  RUN:  bun run cli workflow run tier-probe "the login button does nothing on Safari" \
          --cwd C:/Users/karam/archon-scratch/tier-probe --folder --detach --json
  NOTE: `--folder` is a BOOLEAN with no argument (verified via `workflow run --help`); the
    directory comes from `--cwd`. It REGISTERS that directory as a folder project — a
    persistent `remote_agent_codebases` row with kind='folder'. Harmless, but it is a real
    side effect: record it, and mention it in the rollback notes.
  RECOVER the run id from the returned logPath (`workflow_starting` → workflowRunId) — GOTCHA 11.
  RECORD: run cost, wall time, node outcome, and the resolved model on `probe-classify`.
  THIS IS THE ONLY TIME THIS PRP INTENTIONALLY SPENDS CLAUDE QUOTA. It is one haiku
  classification. Do not skip it — without it there is no A/B, only an assertion.

Task 6 — MODIFY C:\Users\karam\.archon\config.yaml. THE ACTUAL CHANGE.
  - HAND-EDIT ONLY. Never `archon ai tier set` / `ai tier unset` (GOTCHA 2).
  - FIND: the `tiers:` block at lines 23-32
  - REPLACE the `small:` entry with the commented block in `Data models and structure`
  - PRESERVE: the file header, the defaultAssistant comment, the assistants.claude pin and its
    GOTCHA-10 rationale, the tiers preamble including the "must stay HONEST" invariant, and the
    medium/large entries with their trailing comments — byte for byte
  - MERGE `pi:` into the EXISTING `assistants:` block. Do not add a second `assistants:` key.
  - DO NOT touch medium or large. DO NOT unset anything (GOTCHA 1).

Task 7 — ACCEPTANCE: re-run the probe on the rebound tier. THE "AFTER" HALF.
  Same command as Task 5, same argument string, same scratch dir.
  This is Validation Level 2 — see the Validation Loop for what must be true.

Task 8 — REGRESSION: a real repo-build dispatch through the M1.5 registry (Correction C7).
  TARGET: fpv-aim-trainer (Class A, `ok`) — NOT this checkout (Class D).
  RUN:  bun run cli workflow run repo-build "<a small, real change>" \
          --cwd C:/Users/karam/fpv-aim-trainer --detach --json
  EXPECT: identical behavior to before the rebind. repo-build has NO small nodes, so its cost
    and outcome must be UNCHANGED. That is the assertion — the rebind did not leak into medium.
  GOTCHA 10 applies: anything it needs must be committed AND pushed.

Task 9 — MEASURE cost honestly (Correction C3).
  DO NOT read x-omniroute-response-cost off an Archon run — Pi streams, and streamed responses
  carry cost=0 and tokens=0 in the headers regardless of the real price.
  DO:
    a) OmniRoute dashboard: request count delta and spend across Task 7's window
    b) an independent non-streaming curl against the SAME pinned model id, recording
       x-omniroute-tokens-in / -out / -response-cost (this is what actually prices the model)
    c) report Task 5 vs Task 7 side by side, with M1's measured $1.6642 Archon build as the
       standing reference point for scale

Task 10 — BOOKKEEPING. Not optional; it is the reason this milestone is findable later.
  a) MODIFY C:\Users\karam\.claude\claude-projects\agentic-research-2026\BUILD-ORDER.md
     - at §"Model routing & cost tiers" (line 143), add a superseded pointer to this PRP
     - CORRECT the now-stale claims in that section: "cheap tier means *a cheaper API bill*,
       not a free one" (~line 169) and "If free inference ever becomes the goal, that's a
       hardware purchase, not a config change" (~line 175). Both are falsified: free inference
       IS reachable as a config change, via OmniRoute + OpenRouter free models. Correct them;
       do not delete the original reasoning — note what changed and when.
  b) MODIFY C:\Users\karam\.claude\claude-projects\ROADMAP.md
     - the item is in `## Later` at line 49. `## Now` currently holds Kern and holds EXACTLY
       ONE item. Do NOT open a second lane. If Kern has not shipped or been given a verdict,
       this stays where it is and the line is updated to point at the PRP. Promotion to `## Now`
       happens only when Kern closes, in the same commit that closes it.
  c) MODIFY C:\Users\karam\.claude\claude-projects\PROJECTS.md
     - the Archon entry gains: the rebound small tier, the models.json location, the pinned
       model id, that both files live outside git with no backup, and the rollback line.
     - record MEASURED costs (Task 9), not estimates.
  d) git mv PRPs/0-archon-cost-tier-omniroute.md PRPs/1-archon-cost-tier-omniroute.md
     - IN THE SAME COMMIT as the work, per the 0-/1- convention. Grep for inbound references
       first. NOTE: PRPs/ is untracked in this Class D checkout — the rename is a plain `mv`
       here, and it must never enter a commit to upstream (GOTCHA 13).
  e) APPEND the execution report to this file: models.json verbatim, the final tiers block
     verbatim, both cost numbers, and anything that diverged from this plan.
```

### Per-task pseudocode with the critical details

```typescript
// ── Task 3: the check that actually matters ──────────────────────────────────
// GOTCHA 3 is the trap: a broken models.json produces a WARNING, not an error, and the
// eventual failure blames a missing extension. So probe the registry directly, out of band,
// before any run depends on it.
//
//   ModelRegistry.create(authStorage)            // no path arg → join(getAgentDir(), 'models.json')
//   getAgentDir()                                 // PI_CODING_AGENT_DIR ?? ~/.pi/agent  (unset here)
//   registry.getError()                           // undefined === the file parsed
//   registry.find('omniroute', '<modelId>')       // truthy === the model is addressable
//
// Both must hold. `getError() === undefined` alone is NOT sufficient — a file that parses but
// declares the wrong provider id passes it and still fails at dispatch.

// ── Task 6: what the resolution actually does at run time ────────────────────
// dag-executor.ts:965-1001, per node:
//   resolveModelSpec(aiProfile, 'small')
//     → isTierName('small') → resolveTierWithFallback(profile, 'small')
//     → TIER_FALLBACK.small = ['small','medium','large'] — first configured preset wins
//     → preset { provider: 'pi', model: 'omniroute/...' }
//     → provider = preset.provider          // THE TIER OVERRIDES THE WORKFLOW'S provider:
//     → node.provider set AND !== 'pi'?  → dag.model_provider_conflict warning to the user
//         (bundled defaults set provider: claude at WORKFLOW level, so NO warning — verified;
//          the only three node-level provider: lines are all paired with model: large)
//   isRegisteredProvider('pi')              // dag-executor.ts:1003 — dispatch-time, not load
//   capChecks                               // dag-executor.ts:1036 — output_format ABSENT (C2)
//
// Then in the Pi provider (provider.ts:362-483):
//   parsePiModelRef('omniroute/openrouter/nvidia/...:free')
//     → { provider: 'omniroute', modelId: 'openrouter/nvidia/...:free' }   // FIRST '/' only
//   modelRegistry.find('omniroute', modelId)                               // must hit here
//   PI_PROVIDER_ENV_VARS['omniroute']  === undefined                       // → unmapped branch
//     → getApiKey() misses → log 'pi.auth_missing' → CONTINUE (not a throw)
//     → the real key comes from models.json via getApiKeyAndHeaders()'s providerConfig fallback

// ── Task 7: what "it worked" looks like in the log, precisely ────────────────
// MUST be present:
//   dag_node_started        { nodeId: 'probe-classify', provider: 'pi' }
//   node_started event      { model: 'omniroute/openrouter/nvidia/...:free' }
// MUST be absent:
//   pi.model_registry_load_error                 → models.json is broken
//   pi.model_not_in_static_catalog_deferring     → the model id didn't match
//   'Pi model not found'                         → GOTCHA 3's misleading throw
//   dag.structured_output_reask                  → the model missed the schema (1 reask is a
//                                                  yellow flag; 3 then failure is the pin's verdict)
//   dag.unsupported_capabilities                 → expected NONE: the small nodes declare no
//                                                  mcp/agents/hooks/skills/maxBudgetUsd
//   dag.model_provider_conflict                  → expected NONE at workflow-level provider
// TOLERATED (informational, not a defect):
//   pi.auth_missing                              → the designed unmapped-provider breadcrumb
```

### Integration Points

```yaml
CONFIG (the entire change surface):
  - file: C:\Users\karam\.archon\config.yaml
    keys: tiers.small.{provider,model}  +  assistants.pi.maxConcurrent
    layering: built-in tier defaults → GLOBAL (this file) → repo .archon/config.yaml → per-user DB
    note: no repo-level tiers exist in this checkout's .archon/config.yaml, and no per-user DB
          row — so this file is the effective authority. Verify with `ai tier list --json`,
          which reports `configured` / `user` / `default` / `effective` per tier.

PI SDK:
  - file: C:\Users\karam\.pi\agent\models.json
    read by: ModelRegistry.create(authStorage) on EVERY sendQuery — edits take effect with no
             restart (provider.ts:377-379). Untouched by ARCHON_PI_AUTH_PATH, which redirects
             auth.json only.

WORKFLOWS:
  - file: C:\Users\karam\.archon\workflows\tier-probe.yaml  (home-scoped, load priority
          bundled < global < project)
  - unchanged: all 10 bundled `model: small` nodes. Zero YAML edits. That is the point.

NOT TOUCHED (say so explicitly in the report):
  - any file under C:\Users\karam\archon\packages\
  - C:\Users\karam\archon\.archon\config.yaml            (upstream's — M1 GOTCHA 9)
  - C:\Users\karam\archon\.archon\workflows\defaults\    (upstream's)
  - pi-vendor-map.generated.ts                            (generated; check:pi-vendor-map guards it)
  - provider-capabilities.md                              (generated; generate:capability-matrix)
```

---

## Validation Loop

### Level 1: Syntax, reachability, and resolution (no model spend)

```bash
cd C:/Users/karam/archon

# 1a. models.json parses
bun -e "JSON.parse(await Bun.file('C:/Users/karam/.pi/agent/models.json').text()); console.log('ok')"
# Expected: ok

# 1b. Pi's ModelRegistry loads it AND resolves the pinned model  ← the real gate (GOTCHA 3)
#     MUST run from packages/providers — the pi SDK does not resolve from the repo root.
cd C:/Users/karam/archon/packages/providers && bun -e "\
  const pi=await import('@earendil-works/pi-coding-agent'); \
  const r=pi.ModelRegistry.create(pi.AuthStorage.create()); \
  console.log('loadError:', r.getError?.()); \
  console.log('found:', !!r.find('omniroute','openrouter/nvidia/nemotron-3-ultra-550b-a55b:free')); \
  console.log('sanity:', !!r.find('anthropic','claude-sonnet-4-5'));"
cd C:/Users/karam/archon
# Expected: loadError: undefined   /   found: true   /   sanity: true
# `found: false` WITH `loadError: undefined` and `sanity: true` is the dangerous case — the file
# parsed but the provider or model id is wrong. Do not proceed.

# 1c. the tier map resolves as intended, and ONLY small moved
bun run cli ai tier list --json
# Expected: small.effective  = { provider: "pi",     model: "omniroute/openrouter/nvidia/...:free" }
#           medium.effective = { provider: "claude", model: "claude-sonnet-5" }
#           large.effective  = { provider: "claude", model: "claude-opus-5" }
# This command consumes buildAiProfile() — the SAME function the dag-executor uses — so it is
# authoritative for what a run will resolve, not an approximation.

# 1d. `pi` is registered (Correction C8 — dispatch-time check, front-loaded)
bun -e "const m=await import('./packages/providers/src/index.ts'); \
        m.registerBuiltinProviders(); m.registerCommunityProviders(); \
        console.log(m.getRegisteredProviders().map(p=>p.id).join(','))"
# Expected: contains "pi"

# 1e. the config header survived (GOTCHA 2)
head -5 C:/Users/karam/.archon/config.yaml
# Expected: the original comment block, intact. If it is gone, `ai tier set` was used —
# restore it by hand from this PRP before continuing.

# 1f. OmniRoute is reachable
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:20128/v1/models
# Expected: 200
```

### Level 2: The probe — the gate that catches the real risk

```bash
# Run tier-probe on the rebound tier. --folder avoids a worktree; NEVER add --container (GOTCHA 9).
# --folder is a boolean; the directory comes from --cwd. Same dir and same argument as Task 5.
bun run cli workflow run tier-probe "the login button does nothing on Safari" \
  --cwd C:/Users/karam/archon-scratch/tier-probe --folder --detach --json
# Recover the run id from the returned logPath: the `workflow_starting` event's workflowRunId.
```

Four things must ALL be true. Any one failing means the pin is wrong for the workload:

1. **`probe-classify` completes.** Not "returns text" — completes with schema-valid structured
   output. `output_format` is best-effort on Pi; validation happens regardless of provider.
2. **`probe-consume` completes.** This is the one that catches Gotcha 12: strict
   `$probe-classify.output.verdict` access FAILS the consuming node if the producer's output
   isn't schema-valid. It is the 7-of-10 nodes' failure mode, reproduced cheaply.
3. **The log shows `provider: "pi"`** on `dag_node_started` for `probe-classify`, and a
   `node_started` event whose `model` is the OmniRoute ref. This is the proof the call did not
   go to Anthropic.
4. **No `dag.structured_output_reask`.** One reask is a yellow flag (the model needed a
   correction); three then a failed node is the pin's verdict — switch to
   `openrouter/openai/gpt-oss-20b:free` and re-run before concluding the whole approach fails.

```bash
# Grep the detached log for the exact signals (adjust the path from the --json response)
grep -E "dag_node_started|node_started|pi\.|structured_output|unsupported_capabilities|model_provider_conflict" <logPath>
```

### Level 3: Real dispatch regression (Task 8)

```bash
bun run cli workflow run repo-build "<a small, real change>" \
  --cwd C:/Users/karam/fpv-aim-trainer --detach --json
```

- Expected: the run reaches `create-pr` and the `validate` node passes `.archon/validate.sh`.
- Expected: **no `pi` anywhere in the log.** repo-build is `model: medium` end to end.
- Expected: cost within noise of its pre-rebind cost. An unchanged number here is the whole
  assertion — it proves the rebind did not leak into `medium`.
- If the worktree step fails, re-read M1.5 GOTCHA 1 before assuming this PRP caused it — the
  cut is from `origin/<base>`, and an uncommitted or unpushed `validate.sh` fails the preflight.

### Level 4: Cost, measured not asserted (Task 9)

```bash
# The header is only meaningful on a NON-streaming request (Correction C3).
curl -s -D - -o /dev/null http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"openrouter/nvidia/nemotron-3-ultra-550b-a55b:free","stream":false,
       "messages":[{"role":"user","content":"Say OK"}],"max_tokens":50}' \
  | grep -i "x-omniroute-\(response-cost\|tokens-in\|tokens-out\|model\|provider\)"
# Reference reading (2026-08-16): tokens-in 18, tokens-out 12, response-cost 0.0000000000
```

Report a table, not a claim:

| Measurement                           | Before (small → haiku) | After (small → OmniRoute) |
| ------------------------------------- | ---------------------- | ------------------------- |
| `tier-probe` run cost                 | Task 5                 | Task 7                    |
| `tier-probe` wall time                | Task 5                 | Task 7                    |
| `repo-build` (fpv-aim-trainer) cost   | pre-rebind reference   | Task 8                    |
| Anthropic quota consumed by the probe | yes                    | **no**                    |
| OmniRoute dashboard: requests / spend | 0                      | Task 9a                   |

M1's measured Archon build cost **$1.6642** — carry it as the standing scale reference.

---

## Final Validation Checklist

- [ ] Level 1 (a–f) all pass, including `found: true` from the ModelRegistry probe
- [ ] Level 2: all four conditions true; probe log clean of the five MUST-be-absent signals
- [ ] Level 3: `repo-build` unchanged, no `pi` in its log
- [ ] Level 4: cost table filled with measured numbers, dashboard confirmation recorded
- [ ] `ai tier list --json` shows medium/large still on Claude — pasted into the report verbatim
- [ ] `~/.archon/config.yaml` header and every pre-existing comment survived byte for byte
- [ ] No `.env` created; all four credential env vars still unset (re-checked AFTER the work)
- [ ] Nothing under `packages/`, `.archon/config.yaml`, or `.archon/workflows/defaults/` modified
- [ ] `git status` in `C:\Users\karam\archon` shows no staged source changes
- [ ] Bookkeeping a–e complete, including the `0-` → `1-` rename
- [ ] `models.json` + final `tiers:` block recorded verbatim in the execution report (Gotcha 14)
- [ ] Rollback line written down and understood

---

## Rollback

One edit, ~4 lines, no state to unwind:

```yaml
tiers:
  small:
    provider: claude
    model: claude-haiku-4-5 # routing, glue, mechanical checks
```

- **Rebind — never `ai tier unset small`** (GOTCHA 1: an unset `small` falls through to `medium`
  then `large`, i.e. to **opus**).
- `~/.pi/agent/models.json` can stay. Inert without the tier pointing at it, and it costs nothing
  to leave in place for a retry.
- `tier-probe.yaml` can stay — it is a measurement instrument, useful next time.
- No migrations, no engine state. The **one** persistent side effect is the folder-project
  `remote_agent_codebases` row that `--folder` registers for the scratch directory; remove it
  with `DELETE /api/codebases/:id` if you want a clean slate, or leave it (harmless).
- Blast radius = one YAML block.

## What evidence would justify widening to `medium`

Recorded now so the next decision is made on data rather than enthusiasm. Widening is justified
only when ALL of:

1. **Zero `dag.structured_output_reask` events** across at least 20 real `small` node executions.
   `medium` nodes carry implementation and execution work in `repo-build.yaml` and
   `archon-piv-loop.yaml`; if the free model needs correcting on classification, it will not
   survive implementation.
2. **No `small`-node failures attributable to the model** over a week of ordinary use.
3. **A measured `medium` A/B on a non-destructive workflow** — same graph, both tiers, outputs
   compared by a human, not by "it completed."
4. **Confirmation that the free model's rate limits absorb `medium` volume** — `medium` nodes are
   longer and more tool-heavy, so the throttling exposure of Gotcha 7 grows.

Absent all four, `medium` stays on Claude. The honesty invariant in `~/.archon/config.yaml` is a
constraint on this milestone, not a formality.

## Explicitly out of scope (note them, do not build them)

- An engine-level auto-router, in any form including opt-in and default-off (Design section).
- A new provider package, or promoting Pi to `builtIn: true`.
- Editing `pi-vendor-map.generated.ts` — it is generated, and `check:pi-vendor-map` fails CI on
  drift. `omniroute`'s absence from it is load-bearing, not an oversight.
- Adding `structuredOutput` to the dag-executor's `capChecks` array. It is a real gap
  (Correction C2) and a legitimate upstream issue for `coleam00/Archon` — but this checkout is
  Class D and this PRP does not touch engine source. **File it; don't fix it here.**
- Any change to the 10 bundled `model: small` nodes. Not editing them is the entire leverage.

---

## Anti-Patterns to Avoid

- ❌ Don't use `archon ai tier set` — it rewrites the config in flow style and destroys the
  comments that carry this milestone's reasoning.
- ❌ Don't point the tier at `auto/best-free` or any `auto/*` id — `owned_by: "combo"` means a
  router that can select a paid backend. Pin an explicit free model.
- ❌ Don't unset a tier to disable it. It resolves upward, to opus.
- ❌ Don't trust an absent `models.json` error. The load error is a warning and the eventual
  failure blames a missing extension. Probe `registry.find()` directly.
- ❌ Don't read `x-omniroute-response-cost` off a streamed Archon run and call it a cost
  measurement. It is always zero.
- ❌ Don't conclude "it worked" from a model that returned text. The gate is schema-valid
  structured output plus a downstream node that consumes a field.
- ❌ Don't create `C:\Users\karam\archon\.env`, and don't set any `*_API_KEY` — subscription mode
  is a requirement, and OmniRoute needs no key anyway.
- ❌ Don't edit anything under `packages/`, `.archon/config.yaml`, or `.archon/workflows/defaults/`.
- ❌ Don't widen to `medium` "while you're in there."
- ❌ Don't open a second `## Now` lane in ROADMAP.md.

---

## Confidence Score: 9/10

**Why 9.** Every seam was executed, not inferred. **Both deliverable files were validated against
the real loaders before this PRP was written**: the `models.json` above loads through pi's own
`ModelRegistry` (`found: true`, `hasConfiguredAuth: true`, `available: 1`), and `tier-probe.yaml`
parses clean through `workflowDefinitionSchema`. OmniRoute answered a real unauthenticated
completion (HTTP 200) and a real tool call. `getAgentDir()`, `ModelRegistry.create()`'s default
path, the models.json→`getApiKeyAndHeaders` apiKey fallback, `TIER_FALLBACK`, the
tier-overrides-provider behavior, the `capChecks` omission, the `--folder` flag signature, the
bash-substitution quoting, and Pi's live registration were each read in source or run on this
machine. The change surface is two files outside git, with a four-line rollback and no engine
code, no schema, and no migration. Eight of the INITIAL's claims were re-measured and the five
that were wrong are corrected up front — including the two that would have produced a false
"it worked" (the streaming cost header, and repo-build having no `small` nodes).

**The missing point** is the one thing no amount of reading settles: whether a free 550B model
sustains schema-valid `output_format` across the 7 of 10 real `small` nodes over many runs. A
one-shot probe returned clean fenceless JSON and a well-formed tool call, and the failure mode is
loud (3 reasks, then the node fails) rather than silently wrong — but "loud" still means a build
stopping mid-flight, and the model choice may need one iteration through Gotcha 6's compat knobs
or a swap to `openrouter/openai/gpt-oss-20b:free`. Level 2 is designed to find that in a
$0 probe rather than in a real build.

---

## Execution Report (2026-08-16, Sonnet)

All ten tasks executed in order, no deviation from the plan except one bug found and fixed in
Task 4 (below). Every Level 1–4 validation gate passed on the first attempt after that fix.

### One divergence from the plan: a bug in the PRP's own literal YAML

`tier-probe.yaml`'s `probe-consume` bash comment, copied verbatim from this PRP's "Data models
and structure" section, contains the literal text `$node.output.field` as documentation. The
loader's `$nodeId.output` reference scanner (`loader.ts:414-460`) scans bash-node source
**verbatim, including comments** — no markdown stripping (that only applies to `prompt:` fields)
— so it matched `$node.output` and failed load with `Node 'probe-consume' references unknown
node '$node.output'`. This is exactly the gap Level 2's own docstring flagged ("this is a
_schema_ check only... the loader's graph-level pass... runs separately at discovery, which
Task 4's `workflow list --json` exercises") — the schema check that validated this file before
the PRP was written could not have caught it. Fixed by rewording the comment to
`$<nodeId>.output.<field>` (angle brackets break the regex's `[a-zA-Z_]` match immediately after
`$`), preserving the comment's meaning. Confirmed via `workflow list --json`: `errors: []`
after the fix. No other content changed from the PRP's literal blocks.

### Level 1 (a–f): all pass

- 1a: `models.json` parses.
- 1b: ModelRegistry probe → `loadError: undefined`, `found: true`, `sanity: true`.
- 1c: `ai tier list --json` → `small.effective = {provider: pi, model: "omniroute/openrouter/nvidia/nemotron-3-ultra-550b-a55b:free"}`, `medium.effective = {claude, claude-sonnet-5}`, `large.effective = {claude, claude-opus-5}`.
- 1d: registered providers include `"pi"`.
- 1e: `~/.archon/config.yaml` header (all 4 lines) survived byte-for-byte.
- 1f: OmniRoute `GET /v1/models` → 200.

### Level 2 (the probe): all four conditions true

Run `a9f23d989b4bd1f434dae54e7a9f2ea9` (after rebind), same args as the baseline:
`probe-classify` returned `{"verdict":"bug","reasoning":"The sentence describes a malfunction
where the login button fails to work on Safari, indicating a defect in the current
implementation."}` — schema-valid against the declared `enum`/`required`. `probe-consume`
completed (5s), `test -n` passed on the extracted verdict. Log carries `"nodeId":"probe-classify"
… "provider":"pi"` on `dag_node_started` and `pi.session_started` with
`modelId":"openrouter/nvidia/nemotron-3-ultra-550b-a55b:free"`. Grep for the five MUST-be-absent
signals (`model_registry_load_error`, `not_in_static_catalog`, `Pi model not found`,
`structured_output_reask`, `unsupported_capabilities`, `model_provider_conflict`) returned zero
hits. Only the tolerated `pi.auth_missing` breadcrumb is present.

### Level 3 (regression, Task 8): pass, with one behavioral note

Dispatched `repo-build` against `fpv-aim-trainer` (Class A) with a real, small, useful task
("add a README documenting install/run/test"). `preflight` → `implement` → `validate` →
`mechanical-checks` → `create-pr`, all 5/5 nodes completed, zero failures.
`.archon/validate.sh` passed (`uv run ... unittest discover tests` → 22 tests). `grep -c
"provider\":\"pi\""` over the full run log → **0**. Every node resolved `claude/claude-sonnet-5`
(the `medium` tier). This is the assertion Level 3 exists to prove: the `small` rebind did not
leak into `medium`.

**Behavioral note, not a defect of this PRP:** the `create-pr` node completed (did not fail) but
the agent ended its turn by asking "do you want me to push the branch and open a PR against
`main`?" instead of doing so autonomously. Verified via `gh pr list` and `gh api
repos/5c1p3r/fpv-aim-trainer/branches` — no PR was opened, no branch was pushed; the commit
exists only in the run's local worktree
(`~/.archon/workspaces/5c1p3r/fpv-aim-trainer/worktrees/archon/task-repo-build-1786908472184`).
This is `archon-create-pr`'s existing prompt behavior on a non-interactive `--detach` dispatch,
unrelated to the tier change (the node ran on Claude throughout, never touched Pi) and out of
scope for this Class-D, config-only PRP to fix. Left for the user to push manually if the README
is wanted, or to investigate separately as an `archon-create-pr` prompt issue.

### Level 4 (cost, measured)

| Measurement                           | Before (small → haiku)                                                                                                                                                                                                                                            | After (small → OmniRoute)                                                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tier-probe` run cost                 | $0.028089                                                                                                                                                                                                                                                         | $0 (Pi reports no `total_cost_usd`; independent non-streaming curl against the same pinned model: `tokens-in: 18, tokens-out: 12, response-cost: 0.0000000000`) |
| `tier-probe` tokens in/out            | 10 / 311                                                                                                                                                                                                                                                          | 574 / 121                                                                                                                                                       |
| `tier-probe` wall time                | 15s (19:24:14→19:24:29)                                                                                                                                                                                                                                           | 27s (19:26:04→19:26:31)                                                                                                                                         |
| `repo-build` (fpv-aim-trainer) cost   | not separately re-measured pre-rebind in this session (Correction C7: no `small` nodes in this workflow, so cost is not the assertion — see Level 3)                                                                                                              | $0.6897345                                                                                                                                                      |
| Anthropic quota consumed by the probe | yes                                                                                                                                                                                                                                                               | **no**                                                                                                                                                          |
| OmniRoute dashboard                   | not queried — `/`, `/dashboard`, `/api/stats` all require an authenticated browser session this agent doesn't have; the Level 4 gate accepts the non-streaming probe as an alternative ("via the dashboard **or** a non-streaming probe"), which was used instead | —                                                                                                                                                               |

M1's measured Archon build cost **$1.6642** stands as the scale reference; this milestone's
`repo-build` regression run ($0.6897) is a much smaller doc-only task, not a like-for-like
comparison to that figure.

### Verbatim artifacts (Gotcha 14 — both files live outside git, no backup)

**`C:\Users\karam\.pi\agent\models.json`:**

```json
{
  "providers": {
    "omniroute": {
      "baseUrl": "http://localhost:20128/v1",
      "api": "openai-completions",
      "apiKey": "omniroute-local-no-auth",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false,
        "maxTokensField": "max_tokens"
      },
      "models": [
        {
          "id": "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free",
          "name": "OmniRoute free (Nemotron 3 Ultra 550B)",
          "reasoning": false,
          "input": ["text"],
          "contextWindow": 1000000,
          "maxTokens": 65536,
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
        }
      ]
    }
  }
}
```

**Final `tiers:` + `assistants:` block in `C:\Users\karam\.archon\config.yaml`** (medium/large
entries and the file header are unchanged from before this PRP; reproduced here per Gotcha 14):

```yaml
assistants:
  claude:
    # Pinned deliberately. builder-loop's BASELINE.md recorded a global default
    # drifting opus -> sonnet inside one week; an unpinned build model changes
    # cost and behaviour silently.
    model: claude-sonnet-5
  pi:
    # Free OpenRouter backends throttle, and Archon dispatches independent nodes in the
    # same DAG layer concurrently. Cap it — the semaphore is process-wide.
    maxConcurrent: 2

# Model tiers. Workflows should reference `model: small|medium|large` rather than
# hardcoding a model id — the tier resolves per-install from here, so changing the
# cost profile is one edit instead of one per YAML.
# 9 bundled workflows already reference `large` (incl. archon-piv-loop, which M2 adopts),
# so these must stay HONEST — mapping large -> sonnet would silently downgrade them all.
tiers:
  small:
    # Rebound 2026-08-16 (PRPs/1-archon-cost-tier-omniroute.md). Routing, glue and
    # mechanical checks do not need Claude, and a cheaper TOKEN price does not help a
    # budget denominated in weekly subscription quota. Goes to the local OmniRoute
    # proxy (localhost:20128) via Pi -> a pinned FREE OpenRouter model, so these 10
    # bundled nodes cost $0 and consume no Claude quota.
    # Pinned, never `auto/*`: the auto router is owned_by "combo" and may pick a PAID
    # backend. Provider defined in ~/.pi/agent/models.json — that file and this pin are
    # a matched pair; neither works alone.
    # 7 of the 10 small nodes use `output_format`, which is BEST-EFFORT on Pi
    # (validate + reask x3, then the node FAILS). Loud, not silently wrong — but if
    # small nodes start failing schema validation, this pin is the first suspect.
    provider: pi
    model: 'omniroute/openrouter/nvidia/nemotron-3-ultra-550b-a55b:free'
  medium:
    provider: claude
    model: claude-sonnet-5 # implementation / execution
  large:
    provider: claude
    model: claude-opus-5 # planning, architecture, deep-context reasoning
```

### Divergences from the plan, summarized

1. Task 4's `tier-probe.yaml` bash comment needed a one-word-pattern reword to load (see above)
   — the only content change from the PRP's literal blocks anywhere in this execution.
2. Task 2 found `~/.pi/agent/` already containing an empty `auth.json` (`{}`), contradicting
   Correction C6's "the whole tree is absent" — harmless (an empty file, likely created by an
   earlier `AuthStorage`/registry probe on this machine between the PRP's research pass and
   execution) and did not block `mkdir -p` or the `models.json` write.
3. Task 8's `create-pr` node did not autonomously push/open a PR (see Level 3 note above) —
   observed, not fixed, as out of scope.
4. No pre-rebind `repo-build` cost baseline was captured in this session (Correction C7 already
   scoped `repo-build` to the regression check, not the cost A/B, so this does not weaken the
   milestone's cost claim — that claim rests on the `tier-probe` A/B).

### Final checklist

- [x] Level 1 (a–f) all pass, including `found: true` from the ModelRegistry probe
- [x] Level 2: all four conditions true; probe log clean of the five MUST-be-absent signals
- [x] Level 3: `repo-build` unchanged provider-wise, no `pi` in its log (PR-push note above)
- [x] Level 4: cost table filled with measured numbers; dashboard substituted with the accepted
      non-streaming-probe alternative (auth not available to this agent)
- [x] `ai tier list --json` shows medium/large still on Claude — pasted above verbatim
- [x] `~/.archon/config.yaml` header and every pre-existing comment survived byte for byte
- [x] No `.env` created; all four credential env vars still unset (re-checked after the work)
- [x] Nothing under `packages/`, `.archon/config.yaml` (Archon's own), or
      `.archon/workflows/defaults/` modified
- [x] `git status` in `C:\Users\karam\archon` shows no staged source changes (`PRPs/` is
      entirely untracked, per Gotcha 13)
- [x] Bookkeeping a–e complete, including the `0-` → `1-` rename
- [x] `models.json` + final `tiers:` block recorded verbatim above
- [x] Rollback line written down and understood (see PROJECTS.md entry and the Rollback section
      above)
