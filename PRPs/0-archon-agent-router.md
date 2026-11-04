name: "Agent router — one orchestrator, one agent per subtask"
description: |
Workflow-YAML milestone, three workstreams run in strict order with a verdict between each:
(0) measure five agents and the router on a fixed corpus, read-only; (1) promote the
single-task router out of experimental, with failures that fail; (2) a planner that splits a
job into subtasks and fans them out, one governed child run per subtask, each routed
independently. No engine field, no new `when:` operator, no provider, no Archon source edit.
Everything it builds lives under `C:\Users\karam\.archon\`, outside git.

Source INITIAL: `C:\Users\karam\archon\0-INITIAL-agent-router.md` (2026-10-21).
Written 2026-10-22 (Opus 5.5). **Execute with Sonnet** — switch models before `/execute-prp`.

## Purpose

Give an implementing agent everything it needs to land this in one pass: the decisions the
operator signed off, the places where the INITIAL was wrong about the engine (measured against
this `dev` checkout on 2026-10-22), complete drafts of every file, and validation gates that can
tell "it routed" apart from "it looked like it routed."

## Core Principles

1. **Measure before building.** Workstream 0 produces the route table. The table in the
   prototype is a hypothesis from three runs. Memory `measure-before-building`: counting first
   has reversed three milestones.
2. **YAML coordinates, code computes, agents judge.** The router node _judges_ (typed enum).
   `when:` _coordinates_. `bash:`/`script:` nodes _compute_ (bounds checks, collection,
   reporting). Nothing parses prose.
3. **Fail clearly.** A failed route fails its child run and the parent run, with the original
   error. The prototype's "exit 0 with a `REVIEWER FAILED` marker" trick is **banned** here.
   It made sense in a fan-to-all review, where one reviewer dropping out is survivable. In a
   router it is the silent fallback the INITIAL forbids.
4. **Global rules.** Follow `C:\Users\karam\archon\AGENTS.md` and `C:\Users\karam\.claude\CLAUDE.md`.

---

## Sign-off decisions (operator, 2026-10-22, do not relitigate)

| #   | Open question in the INITIAL                                        | Decision                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Who supplies the Workstream 0 corpus?                               | **The agent drafts 10 tasks, 2 per route, each with an expected route; the operator approves before any spend.** Some come from recent closed PR titles. PR titles alone would skew to code changes.                            |
| 2   | Hermes and Grok as `bash:` routes, or wait for the plugin contract? | **Keep them as `bash:` routes**, labelled `UNGOVERNED` in output, wrapped in `timeout`, failing on non-zero exit or empty output. WS0 decides whether the Grok CLI earns its route or OpenCode's xAI models replace it.         |
| 3   | Router model: haiku or the free `small` tier?                       | **The router node declares `model: small`.** WS0 runs the corpus through it as-is (free Pi/OmniRoute) and again with `--model small=claude/claude-haiku-4-5`. Haiku is pinned only if free fails the decision rule in Task 0.6. |
| 4   | Is Workstream 2 in this PRP?                                        | **Yes, gated.** WS2 starts only after WS1 has a passing verdict.                                                                                                                                                                |

Already settled in the INITIAL and repeated here so nobody reopens it: **no engine-level router**
(the cost-tier sign-off dropped it; it would override authored tiers and fails the
constitution), **no new YAML field, no new `when:` operator, no new provider.**

---

## Goal

**End state.**

```bash
# one task → one agent
bun run cli workflow run archon-route-task "<task>"
# one job → planner → N subtasks → N child runs, each routed → one report
bun run cli workflow run archon-orchestrate "<job>"
```

Both use Archon's default worktree. Every route except `hermes-free`/`grok-web` can edit files,
and `opencode-free` cannot be restricted (C13). `--no-worktree` hands the chosen agent your live
checkout; pass it only when that is what you want.

Both run from `C:\Users\karam\archon`, with
`PATH="$HOME/.archon/opencode-v1/node_modules/.bin:$PATH"` set for the OpenCode route.

**Every file this milestone writes is outside git:**

```
C:\Users\karam\.archon\workflows\route-pick\archon-route-pick.yaml      CREATE  router block (include target; runnable alone for WS0)
C:\Users\karam\.archon\workflows\route-task\archon-route-task.yaml      CREATE  single-task router (WS1)
C:\Users\karam\.archon\workflows\route-task\fixtures\*.stubs.yaml       CREATE  dry-run fixtures, one per route + failure cases
C:\Users\karam\.archon\workflows\orchestrate\archon-orchestrate.yaml    CREATE  planner + fan-out (WS2)
C:\Users\karam\.archon\workflows\orchestrate\fixtures\*.stubs.yaml      CREATE  dry-run fixtures up to the fan-out
C:\Users\karam\.archon\measure\ws0\                                     CREATE  WS0 harness, corpus, raw outputs, results (read-only measurement)
C:\Users\karam\.archon\prototypes\2026-10-21\archon-route-task.yaml     MOVE    from the repo's experimental/ (see C3)
```

Plus this PRP's appendix (the WS0 table), the `0-`→`1-` flips, and bookkeeping in
`C:\Users\karam\.claude\claude-projects\PROJECTS.md`.

## Why

- **The binding budget is weekly Claude quota.** A cheaper token price doesn't help a budget
  counted in quota. Work that doesn't need Claude should go to a free agent. Work that does
  need Claude should not be degraded to save quota.
- **Today the operator routes by hand**, or uses `archon-ask-all-agents`, which repeats every
  task on every agent: the anti-goal.
- **The prototype is not yet trustworthy.** No measurement backs its routes. Its
  `bash:` routes cannot fail visibly. It can't split a job. OpenCode's start path is pinned
  around CLI/SDK drift.

## What

### User-visible behavior

- `archon-route-task "<task>"`: the run's node list shows `pick__route` completed, **exactly one**
  of the five agent nodes completed with the other four `skipped`, and `collect` completed. The
  run's result starts with a header naming the agent, its governance class, and the router's
  reason, followed by the answer.
- `archon-orchestrate "<job>"`: `plan` emits 1–6 subtasks, `bound` validates them, `run-each`
  spawns one `archon-route-task` child per subtask **one at a time**, and `report` prints one
  report with a section per subtask. The run fails, after writing the report, if any child failed.
- Hermes and Grok sections are labelled `UNGOVERNED (bash: over <cli> — no Archon session,
approval or audit)`. Claude and OpenCode sections are labelled `governed`.

### Success Criteria (maps 1:1 to the INITIAL's acceptance list)

- [ ] **A1.** The WS0 appendix table is filled in. The route table in `archon-route-pick.yaml` is
      confirmed or revised from it, and the router model verdict is recorded (Task 0.6).
- [ ] **A2.** Five live runs of `archon-route-task`, one task per surviving route. Each shows one
      agent node completed and the rest `skipped`, with a non-empty, on-task answer. (If WS0
      drops a route, A2 covers the surviving routes, and the dropped one is recorded with its
      reason.)
- [ ] **A3.** One live `archon-orchestrate` run whose planner emits ≥3 subtasks. Each child is its
      own run with `parent_run_id` set to the parent and its own `total_cost_usd`, as shown by
      `workflow runs --json` and `workflow get <child> --json`.
- [ ] **A4.** A deliberately broken route (Task 2.5) fails the child, then the parent's `report`
      node, with the child's original error text in the parent's failure. No other agent node
      runs in that child.
- [ ] **A5.** `bun run cli workflow test archon-route-task` and `... archon-orchestrate` pass,
      with no provider spend. The route-task fixtures exercise every routing branch, and the
      Task 1.4 trace check shows exactly one agent node ran per route. These are operator-run
      checks, not committed validation (C12).
- [ ] **A6.** A bare `bun run cli workflow test` (every repo, global and bundled fixture) shows no
      failures beyond the baseline recorded in Task 0.0, and lists the new global fixtures as
      passing. Plain `bun run validate` is not the gate: it never runs fixtures (C12).

---

## All Needed Context

### Corrections to the INITIAL (measured 2026-10-22 against this `dev` checkout)

These change the build. Each is applied below, not quietly assumed.

**C1. There is no branch, no commit, and no PR.** The INITIAL says "branch from `dev`; do not
commit to `dev`." This checkout is `coleam00/Archon` with **no push permission** (Class D,
`PROJECTS.md` Archon entry; `git remote -v` → `origin https://github.com/coleam00/Archon.git`).
The cost-tier PRP hit the same wall and put its workflow under `~/.archon/workflows/`. The same
applies here, for a second reason too: Hermes and Grok are CLIs on this machine only, so a
workflow that shells out to them doesn't belong in a repo other installs read. **Nothing in this
PRP is staged in the Archon repo.**

**C2. A dry run never executes a `workflow:` node.** `packages/workflows/src/dry-run.ts:1225`
fails any reachable `workflow:` or compose-fan-out node with _"Dry-run does not execute reachable
… nodes"_. The CLI docs say the same (`reference/cli.md:388`, "Runtime `workflow:` sub-runs are
reported as unsupported"). So **acceptance 5 is fully achievable for `archon-route-task` only.**
For `archon-orchestrate`, the fixtures prove everything up to the fan-out (`plan`, `bound`) and
declare `expect: failed, fail-node: run-each` for that documented reason. The fan-out itself
is proved by the live run in A3. Don't try to make a stub "run" the fan-out. There's no
such mechanism, and inventing one is out of scope.

**C3. A repo workflow shadows a global one with the same filename.**
`guides/global-workflows.md:60,262`: repo-specific overrides global by exact filename. The
untracked prototype at `.archon/workflows/experimental/archon-route-task.yaml` would hide the
promoted global `archon-route-task.yaml` whenever a run starts from this repo. **Move it** to
`~/.archon/prototypes/2026-10-21/` (Task 1.0), a path discovery never scans. It is a
user-owned untracked file, so move it, never delete it. `archon-ask-all-agents.yaml` and
`archon-multi-agent-pr-review.yaml` stay where they are. They are separate tools, out of scope.

**C4. A fixture runs against every workflow beside it.** `fixture-runner.ts:163-188,559`: each
`fixtures/*.stubs.yaml` is checked against **every** sibling workflow YAML. So `route-pick`,
`route-task` and `orchestrate` each get **their own folder**. One shared folder would run the
route-task fixtures against the orchestrator. Discovery reaches one subfolder deep
(`MAX_DISCOVERY_DEPTH = 1`, `command-validation.ts:23`), so `~/.archon/workflows/<folder>/x.yaml`
is discovered. Global fixtures are discovered by `workflow test` (`fixture-runner.ts:464-467`
scans project, global, and bundled roots).

**C5. Windows argv and env-var limits shape the collector.** On Windows, a single command line and
a single environment variable are each capped at ~32 KB. Three consequences:

- An inline `script:` body runs as `bun --no-env-file -e '<code>'`
  (`guides/script-nodes.md:71`). Splicing an agent's answer into it can overflow argv. **Answers
  never go through a `script:` body or a `with:` env binding.**
- `bash:` node-output substitution **spills values over 32 KB to a file** and substitutes
  `$(cat '<path>')` (`authoring-workflows.md:565`). So the collector and the report are `bash:`
  nodes, and big text moves through files under `$ARTIFACTS_DIR`.
- `hermes -z PROMPT` has no prompt-file flag, so the prompt rides argv. The Hermes route checks
  the task's size and **fails** above 30 000 bytes. It does not truncate (the PR-review prototype
  truncated silently).

**C6. The router's measurement needs no duplicate router.** Put the route node in its own block
(`archon-route-pick`, `returns: route`) and `include:` it from `archon-route-task`. Then WS0
runs the block on its own (`workflow run archon-route-pick "<task>"`) and pays only for the
routing call, and there is one router prompt, not a hand-synced copy (AGENTS.md: "Two
declarations that must agree … are a present defect"). `include:` flattens at load: the node id
becomes `pick__route` and `$pick.output.agent` is rewritten to it
(`authoring-workflows.md:2447`). **Confirm the flattened stub key with `--stubs-init` (Task 1.3)
rather than trusting this spelling.**

**C7. Never fix the router model by rebinding the global `small` tier.** If WS0 rules that the
free router is not good enough, the fix is a literal pin **on the router node**
(`provider: claude`, `model: claude-haiku-4-5`). Rebinding `tiers.small` in
`~/.archon/config.yaml` would move the 10 bundled `small` nodes back onto Claude quota and undo
`PRPs/1-archon-cost-tier-omniroute.md`. Also: `--model small=…` is a per-run rebinding. It is
not assumed to reach a `workflow:` child (§governed-launch-ownership, and `--base` explicitly
doesn't propagate). WS0 measures the block directly, so this never matters.

**C8. Fan-out children share one checkout, so `max_parallel: 1`.** `archon-route-task` can write
to the checkout (a `claude-sonnet` code change), so it must **not** declare `mutates_checkout:
false`. With `max_parallel > 1`, the engine refuses the expansion before any child spawns
(`authoring-workflows.md:2195-2202`). `max_parallel: 1` is one of the three documented exits, and
it also removes two measured failure modes: OpenCode's embedded-server start failing when
several start at once, and the Pi semaphore (`assistants.pi.maxConcurrent: 2`). The cost is wall
time. A parent never blocks its own descendants on the path lock
(`authoring-workflows.md:1975`).

**C9. Choosing the parent's join.** The INITIAL left it open. With `join: all_success` the
parent fails, but the report node never runs, so the subtasks that succeeded have no report.
With the default `all_done`, failures arrive as `{ archon_failed: true, error, status }` slots
(`authoring-workflows.md:2081`). **Decision: `all_done` plus a `report` node that writes the full
report (including failed slots and their original error text), prints it, and then exits 1 if
any slot failed.** The operator gets both the report and a failed run. Every child runs to its
own terminal state either way (`:2085`). There is no early stop in either join.

**C10. "`archon workflow runs` shows the tree" — verify via JSON.** The docs say `parent_run_id`
"makes the run tree visible in `archon workflow runs`" (`authoring-workflows.md:1826`), but the
human table format isn't specified. Acceptance evidence is `workflow runs --json` (children
carry `parent_run_id`) plus `workflow get <childId> --json` (`total_cost_usd`). Record what the
human view actually shows. Don't claim a tree you didn't see.

**C11. Bash routes record their own cost or say they can't.** Provider nodes report `cost_usd`.
Bash nodes report nothing to the engine. Hermes has `--usage-file PATH` ("written even when the
run fails"), so the route writes `$ARTIFACTS_DIR/hermes-usage.json`. Grok's
`--output-format json` may carry usage. WS0 checks this (Task 0.3), and if it doesn't, the
report says "cost: not reported" rather than implying zero. Claude's `cost_usd` under a
subscription is **API-equivalent dollars, not quota**. Record it as such.

**C12. These fixtures are operator-run, not committed validation.** The INITIAL's acceptance 5
("part of the committed validation") and 6 (`bun run validate` runs the fixtures) cannot hold as
written. `workflow-fixtures` is `explicitOnly` in `scripts/validate.ts:104-108`, so a plain
`bun run validate` never runs any fixture, and AGENTS.md says not to run `validate` to finish a
change anyway. The files also live outside git (C1), so CI never sees them. The gate is
`bun run cli workflow test`. A bare run already includes global fixtures (checked 2026-11-04:
the `route-task/` and `orchestrate/` fixtures under `~/.archon/workflows/` appear in its results).
Record this in the appendix's divergences list. C1's "no push permission" premise predates the
`5c1p3r/Archon` fork. Whether to commit these workflows there, which would put the fixtures in
CI, is an operator decision outside this PRP.

**C13. OpenCode does not enforce `allowed_tools`/`denied_tools`.** The engine passes them to the
provider in `nodeConfig` (`packages/workflows/src/dag/provider-resolution.ts:452`). Claude, Pi
and Copilot translate them. Nothing under `packages/providers/src/community/opencode/` reads
them: the prompt body (`session.ts`, `createSessionPromptBody`) carries a `tools` map only from
an inline `agents:` entry. `capabilities.ts` still declares `toolRestrictions: true`, which
suppresses the "field ignored" warning. So a `denied_tools` line on `opencode-free` would be a
control that does nothing. **Do not add one.** The `opencode-free` route can edit files and run
commands, whatever its prompt says. The containment for this milestone is the checkout: every
live run (Tasks 1.5, 2.3, 2.5) uses Archon's default worktree, never `--no-worktree`. A worktree
keeps edits off your live checkout. It is not a security sandbox. Fixing the provider is an
engine change and out of scope (C1); file it separately.

### Documentation & References

```yaml
# MUST READ (in-repo; current, authoritative)
- file: packages/docs-web/src/content/docs/guides/authoring-workflows.md
  sections:
    - '432-538  `when:` syntax — fail-closed, whole-AI-output compare rejected at load, fielded ref OK'
    - '540-578  `$node.output` substitution — bash pre-quoting; NEVER double-quote (`var=$n.output`)'
    - '580-609  output_format — validated for every provider; Pi/Copilot reask x3 then FAIL'
    - '401-430  trigger_rule — `none_failed_min_one_success` admits condition-skips'
    - '1021-1061 reading across a skipped branch (`{from, if_skipped}`); bindings carry VALUES, not documents'
    - '1300-1365 include: — node config travels; mutates_checkout is run-owned (dropped with warning)'
    - '1728-1860 workflow: sub-runs — gates, failure (no `retry:` on workflow: nodes), cost roll-up'
    - '1965-2017 side-by-side sub-runs, path lock, mutates_checkout'
    - '2019-2272 fan_out: — four fields, join semantics, isolation refusal text, no gates inside'
    - '2366-2463 result contracts — `returns:`; a workflow: node may NOT declare output_format'
- file: packages/docs-web/src/content/docs/reference/cli.md
  sections:
    - '292     --model <tier>=<spec> (per-run rebinding; claude/<model> selects the claude agent)'
    - '300-305 --dry-run / --stubs / --stubs-init / --default-stubs / --exec-code'
    - '351-402 deterministic dry-run; strict stub coverage; trace states; all_done tolerance'
    - '513-552 workflow runs / workflow get (--json)'
- file: packages/docs-web/src/content/docs/reference/variables.md
  why: 'line 113 — $ARGUMENTS reaches bash/script as an ENV VAR, never spliced: read it as "$ARGUMENTS"'
- file: packages/docs-web/src/content/docs/guides/script-nodes.md
  why: "inline vs named; `runtime: bun` inline = `bun -e '<code>'` (argv-bound, see C5)"
- file: packages/docs-web/src/content/docs/guides/global-workflows.md
  why: '~/.archon/workflows/<folder>/ discovery; repo overrides global by filename (C3)'
- file: packages/workflows/src/fixture-runner.ts
  why: 'lines 1-30 fixture format (`fixture: {expect, fail-node, reached, inputs, resolved-text-contains}`, `exec-code`); 163-188 sibling matching (C4); 616-690 pass/fail rules'
- file: packages/workflows/src/dry-run.ts
  why: '1225 workflow: nodes fail in dry-run (C2); 1279/1371 a STUB always wins over --exec-code'
- file: packages/workflows/src/output-ref.ts
  why: "module doc: whole-text `$skipped.output` → '' (lenient); fielded ref to skipped/failed → THROW"
- file: packages/workflows/src/dag-executor.ts
  why: "12161-12207 a child's result = its `returns:` node, else first completed non-empty sink"
- file: .archon/workflow-language-constitution.md
  why: 'rows 71-95: workflow:/fan_out:/returns: case law; §governed-launch-ownership'
- file: .archon/direction.md
  why: "§community-plugins (lines 65-81): OpenCode is a bundled community provider — correctness fixes only, and C1 means we can't land one anyway"

# PATTERNS TO MIRROR
- file: .archon/workflows/experimental/archon-route-task.yaml
  mirror: 'route node output_format enum + one `when:` per branch; `timeout 600` wrapper; task text through $ARTIFACTS_DIR'
  do_not_copy: 'router model pin; the route list as source of truth (WS0 owns it); no failure semantics on bash routes'
- file: .archon/workflows/experimental/archon-multi-agent-pr-review.yaml
  mirror: 'packet-in-a-file; `2> $ARTIFACTS_DIR/<agent>.stderr.log`'
  do_not_copy: '`|| echo REVIEWER FAILED` (Principle 3); fanning every agent over one input'
- file: .archon/workflows/sdlc/triage/fixtures/close.stubs.yaml
  mirror: 'fixture shape — node stubs as YAML objects + `fixture:` block + `exec-code: true`'
- file: .archon/workflows/e2e-opencode-smoke.yaml
  why: "existing OpenCode smoke; WS0's start-reliability probe runs it 10x"
- file: PRPs/1-archon-cost-tier-omniroute.md
  mirror: 'measured-facts-first structure; out-of-git file placement; execution report appended at the end'

# EXTERNAL (CLIs change fast — re-capture `--help` at WS0 time, Task 0.1)
- cli: 'hermes 0.20.0 — `-z/--oneshot PROMPT` (prints ONLY final text), `--usage-file PATH`, `-t TOOLSETS` ("" = none), `-m MODEL`, `--ignore-rules` (skip AGENTS.md/memory injection), `--safe-mode`'
- cli: 'grok 1.0.62 — `-p/--single`, `--prompt-file`, `--permission-mode`, `--output-format plain|json|…`, `--max-turns N`, `--cwd`, `--disable-web-search`, `--json-schema`, `--no-subagents`, `-m`'
- cli: "opencode v2.0.32 on PATH (Archon can't start it); v1.19.3 pinned at ~/.archon/opencode-v1/node_modules/.bin/opencode"
- url: https://docs.claude.com/en/docs/claude-code/cli-reference
  why: 'WS0 Claude measurement: `claude -p --output-format json` returns total_cost_usd/duration_ms; `--permission-mode plan` keeps it read-only'
- url: https://opencode.ai/docs/cli/
  why: "`opencode run` flags (-m, --format json, --agent plan) for WS0; verify against the v1.19.3 binary's --help"
```

### Current tree (the parts this PRP touches)

```
C:\Users\karam\archon\                               (Class D — read, never commit)
├── 0-INITIAL-agent-router.md                        source INITIAL (untracked)
├── PRPs\0-archon-agent-router.md                    THIS FILE (PRPs/ is untracked)
└── .archon\workflows\experimental\
    ├── archon-route-task.yaml                       prototype — MOVES OUT (C3)
    ├── archon-ask-all-agents.yaml                   untouched
    └── archon-multi-agent-pr-review.yaml            untouched
C:\Users\karam\.archon\
├── config.yaml                                      tiers: small→pi/omniroute (free), medium→claude-sonnet-5, large→claude-opus-5 — UNTOUCHED
├── opencode-v1\node_modules\.bin\opencode           v1.19.3 pin (workaround, kept)
└── workflows\                                        phone-control*.yaml, repo-build.yaml, tier-probe.yaml (untouched)
```

### Desired tree

```
C:\Users\karam\.archon\
├── workflows\
│   ├── route-pick\archon-route-pick.yaml            block: route node only, returns: route
│   ├── route-task\
│   │   ├── archon-route-task.yaml                   include pick → 5 when-gated agents → collect
│   │   └── fixtures\
│   │       ├── route-claude-opus.stubs.yaml         one per route (5), each stubs ONE branch
│   │       ├── route-claude-sonnet.stubs.yaml
│   │       ├── route-opencode-free.stubs.yaml
│   │       ├── route-hermes-free.stubs.yaml
│   │       ├── route-grok-web.stubs.yaml
│   │       └── chosen-empty.stubs.yaml              chosen agent returns "" → collect fails
│   └── orchestrate\
│       ├── archon-orchestrate.yaml                  plan → bound → run-each (fan_out) → report
│       └── fixtures\
│           ├── plans-three.stubs.yaml               reaches plan+bound; fails at run-each (C2)
│           ├── plans-none.stubs.yaml                [] → bound fails
│           └── plans-too-many.stubs.yaml            7 → bound fails
├── measure\ws0\
│   ├── corpus.md                                    10 tasks + expected route (operator-approved)
│   ├── measure-agent.sh                             one (agent, task) → out/<agent>/<n>.{txt,meta}
│   ├── out\…                                        raw outputs + timing + cost per run
│   └── results.md                                   the table, copied into this PRP's appendix
└── prototypes\2026-10-21\archon-route-task.yaml     moved prototype (C3)
```

### Known Gotchas of our codebase & Library Quirks

```text
G1  ASSIGN, THEN QUOTE a node-output substitution in bash: `answer=$claude-opus.output`, then
    use "$answer" (reference/workflow-language.md:558-578). Never `"$x.output"`: the inline form
    is pre-quoted, so double quotes embed literal single quotes. Never a bare argument either
    (`printf '%s' $x.output`): past 32 KB the engine substitutes an UNQUOTED `$(cat '<path>')`,
    which drops every space and glob-expands `*`. The JSON still parses, so nothing fails.
    `validate workflows` warns on both forms; treat that warning as an error here.
    $ARGUMENTS is the OPPOSITE: it's an env var, so "$ARGUMENTS" (double-quoted) is correct
    (variables.md:170).

G2  A whole-text ref to a SKIPPED node resolves to '' (output-ref.ts module doc). That's what lets
    `collect` reference all five branches. A FIELDED ref to a skipped node THROWS — so `collect`
    references branches whole-text only, and the router via `$pick.output.agent` (it always runs).

G3  `when:` comparing a whole AI output to a literal is a LOAD ERROR. Compare the FIELD:
    `$pick.output.agent == 'x'`. Unparseable `when:` → fail-closed skip WITH A WARNING. So a typo
    in a branch's enum literal means that route silently never runs. The per-route fixtures (Task
    1.3) are what catch this. Keep the enum list, the five `when:` literals and the `case` arms in
    `collect` letter-identical; the fixtures enforce it.

G4  --exec-code runs a REACHABLE bash node that has NO stub (dry-run.ts:1279). An unstubbed,
    wrongly reached hermes-free/grok-web branch in a fixture would call the real CLI. Every
    route-task fixture therefore stubs BOTH bash branches (sentinel text "FIXTURE-SENTINEL: must
    not be reached"). Unused stubs are a warning, not a failure (fixture-runner.ts:457-459), and
    the Task 1.4 trace check catches a sentinel that shows up.

G5  output_format on Pi (the `small` tier) is BEST-EFFORT: validate + reask x3, then the node FAILS.
    Loud, not silently wrong. A schema-VALID wrong choice, though, is silent. That's why WS0
    measures agreement, not just schema success.

G6  `allowed_tools: []` disables all built-in tools on Claude and Pi. Absent ≠ []. On OpenCode
    it does nothing (C13).

G7  A `workflow:` node rejects `retry:` and `output_format:` at load. Fan-out `items` must resolve
    to a JSON ARRAY from an upstream dependency, or the node fails before any child exists.

G8  A gate inside a fan-out child FAILS the fan-out (authoring-workflows.md:2218-2244).
    archon-route-task must never gain an approval: node.

G9  A `node timeout:` didn't kill an orphaned hermes.exe (prototype, 2026-10-21). `timeout N` from
    Git Bash coreutils (/usr/bin/timeout 8.32) signals the direct child. Hermes is a venv launcher
    (Scripts\hermes.exe → python.exe), so a grandchild may still survive. Task 0.4 tests this. If
    orphans survive, record it in PROJECTS.md. There's no YAML fix.

G10 Grok in --permission-mode plan still EXPLORES THE REPO (>100s). For the web route, start it in an
    EMPTY cwd (`--cwd "$ARTIFACTS_DIR/grok-cwd"`) with a bounded `--max-turns`. It can't explore
    what isn't there. Hermes: `-t ""` (no tools) and `--ignore-rules` (don't inject this repo's
    AGENTS.md — a likely cause of the "slow on 20KB prompts" observation). Task 0.4 verifies both.

G11 OpenCode: Archon's SDK (@opencode-ai/sdk ^1.17.3, packages/providers/package.json:38) waits for
    `opencode server listening`; CLI v2.0.32 prints `server listening on …`. The PATH pin to
    v1.19.3 is the ONLY working start path. Launch every run with
    PATH="$HOME/.archon/opencode-v1/node_modules/.bin:$PATH". Do NOT change the global PATH (it
    would shadow the user's v2), and do NOT edit packages/providers (C1).

G12 `include:` drops the block's workflow-level `mutates_checkout`/`interactive`/`worktree` with a
    load warning (authoring-workflows.md:1344-1345). Don't declare them on archon-route-pick.

G13 Running from the repo: use `bun run cli …` in C:\Users\karam\archon (the checkout's code, which
    is what CI tests). Record `archon --version` vs the checkout once in Task 0.0 so a
    reader knows whether ~/.bun/bin/archon is the same build.

G14 The repo has UNRELATED untracked files (.hermes.md, .serena/, HANDOFF*.md, INITIAL.md, …). Never
    `git add` anything; never `git clean`. This PRP writes nothing in the repo except PRPs/ and the
    INITIAL's retirement (Task 3.2).

G15 Bash nodes run under Git Bash on Windows (resolveBashPath, dag-executor.ts:3831). `jq` is NOT
    installed. `bun` IS on PATH (/c/Users/karam/.bun/bin/bun 1.3.14). JSON in bash nodes goes
    through `bun -e` with file-path arguments, never with data spliced into the code (C5).

G16 A bash node's failure message is built from its OWN stderr. A CLI whose stderr is redirected to
    a file fails as `failed [exit N]: no diagnostic output` (checked 2026-11-04), so the original
    error never reaches the run, the parent's `{archon_failed, error}` slot, or the report. Every
    bash agent route therefore keeps the `|| { rc=$?; …; tail -c 4000 "$log" >&2; exit "$rc"; }`
    block. The CLI summary line shows only the first line of a failure; `workflow get <id> --json`
    holds the whole text, including the replayed tail. Task 1.4 proves the block with a fake CLI.
```

---

## Implementation Blueprint

### Design

```
archon-orchestrate (parent run)                               archon-route-task (child run, ×N, serial)
┌──────────────────────────────────────────────┐             ┌───────────────────────────────────────────────┐
│ plan    prompt, model: medium, read-only     │             │ pick__route  (include archon-route-pick)      │
│         output_format {subtasks: string[]}   │             │   model: small → typed {agent, reason}        │
│ bound   script (bun): 1 ≤ n ≤ 6, non-empty   │  item = $ARGUMENTS   │   │ when: $pick.output.agent == '<x>'     │
│         output_format: string[]              │ ──────────► │   ├─ claude-opus    provider (governed)       │
│ run-each workflow: archon-route-task         │             │   ├─ claude-sonnet  provider (governed)       │
│         fan_out {items: $bound.output,       │             │   ├─ opencode-free  provider (governed)       │
│                  max_parallel: 1}  join all_done           │   ├─ hermes-free    bash: hermes -z (UNGOV.)  │
│ report  bash: write report.md, print it,     │ ◄────────── │   └─ grok-web       bash: grok (UNGOV.)       │
│         exit 1 if any slot archon_failed     │  text result│ collect bash, none_failed_min_one_success,    │
└──────────────────────────────────────────────┘             │   returns: collect → header + answer          │
                                                             └───────────────────────────────────────────────┘
```

**Who decides what.** The router _judges_ (the agent, as a typed enum). `when:` _coordinates_.
`bound`, `collect` and `report` _compute_ deterministic checks. The planner never names an
agent. Routing has one owner, the router, so a planner choice and a router choice can never
disagree.

**Why the child returns text, not JSON.** The answer can exceed 32 KB, and the only spill-safe
channel is `bash:` substitution (C5). With no `jq`, a bash node can't JSON-encode a
multi-kilobyte answer without splicing it into `bun -e` code. The header line is for **humans
only**: nothing downstream parses it. The machine record of "which agent did what" is the
engine's own: the child's `pick__route` structured output, its node states, and its cost line.
That keeps it clear of AGENTS.md's "prose passed between nodes as a token to parse".

**Failure paths, all loud:**

| Failure                                             | Where it surfaces                                                                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Router output fails schema (after Pi reask x3)      | `pick__route` fails → branches & `collect` skip as upstream-failed → child fails → `run-each` slot `archon_failed` → `report` exits 1     |
| Chosen agent errors / times out (exit 124)          | that node fails with the agent's own error (bash routes replay their stderr tail, G16) → `collect` skipped (`none_failed…` blocks upstream failures) → child fails → same as above |
| Chosen agent exits 0 with empty/whitespace output   | `collect` exits 1: "route '<x>' completed with empty output"                                                                              |
| Hermes task > 30 000 bytes                          | `hermes-free` exits 1 before calling Hermes (C5)                                                                                          |
| Planner emits 0 or > 6 subtasks, or an empty string | `bound` exits 1 naming the count. No child is spawned.                                                                                    |
| A child fails                                       | its slot carries `{archon_failed, error, status}`. `report` writes every section, then exits 1 with each failed subtask's error on stderr |

Nothing reroutes. No node catches a failure and substitutes another agent.

### Data models — the files, in full (drafts; WS0 revises the router prompt text only)

**`~/.archon/workflows/route-pick/archon-route-pick.yaml`**

```yaml
name: archon-route-pick
description: |
  Picks exactly one agent for one task, as a typed enum. It does not do the task.
  Composed by archon-route-task (include:). Also runs on its own, which is how
  the route table is measured without paying for an agent:
    archon workflow run archon-route-pick --no-worktree "<task>"
  The route descriptions below come from the Workstream 0 table in
  C:\Users\karam\archon\PRPs\1-archon-agent-router.md (appendix). Change them there
  first, then here.
returns: route
nodes:
  - id: route
    # `small` is the tier for routing/glue. It resolves to a free model (no Claude quota).
    # If Workstream 0 rules the free router inadequate, pin THIS node to
    # provider: claude / model: claude-haiku-4-5. Never rebind the global `small` tier:
    # that would move every bundled small node back onto Claude quota.
    model: small
    allowed_tools: []
    idle_timeout: 60000
    output_format:
      type: object
      properties:
        agent:
          type: string
          enum: [claude-opus, claude-sonnet, opencode-free, hermes-free, grok-web]
        reason:
          type: string
      required: [agent, reason]
    prompt: |
      Choose which ONE agent should do the task below. Do not do the task.

      Pick the cheapest agent that will do it well. Free agents cost no Claude quota;
      Claude agents do. Cheapest first: hermes-free, opencode-free, grok-web,
      claude-sonnet, claude-opus.

      <<WS0: replace each line below with the scope the measurements support>>
      - hermes-free: free model, no tools, no repository access. Short, self-contained
        text work: rewrite, summarise, draft, simple factual Q&A, arithmetic.
      - opencode-free: free model that can read this repository. Low-stakes reading,
        exploration or explanation of code, where a mistake is cheap.
      - grok-web: needs current events or information from the web.
      - claude-sonnet: code changes, debugging, anything where precision matters, or
        when you are unsure between a free agent and Claude.
      - claude-opus: hard architecture, planning, security review, or ambiguous
        high-stakes work.

      If a free agent would plausibly do but a mistake would be costly, choose
      claude-sonnet. Give a one-sentence reason.

      Task:
      $ARGUMENTS
```

**`~/.archon/workflows/route-task/archon-route-task.yaml`**

```yaml
name: archon-route-task
description: |
  One task, one agent. archon-route-pick chooses the agent as a typed enum, and
  `when:` runs exactly that agent and skips the rest. Nothing is fanned out, and
  a failed agent fails this run; nothing falls back to another agent.

  Governed (Archon provider nodes; session, cost and audit recorded):
    claude-opus, claude-sonnet, opencode-free
  UNGOVERNED (bash: over a headless CLI; no Archon session, approval or audit;
  cost only in the artifacts they write): hermes-free, grok-web

  opencode-free needs the pinned 1.x CLI first on PATH:
    PATH="$HOME/.archon/opencode-v1/node_modules/.bin:$PATH"
  The chosen agent may edit the checkout: claude-* by design, opencode-free because
  OpenCode ignores allowed_tools/denied_tools (its "read-only" line is a request, not a
  control). So this workflow does NOT declare mutates_checkout: false, and runs in the
  default worktree. Never add an approval: node; archon-orchestrate fans this out.

  Usage: archon workflow run archon-route-task "<task>"
         (add --no-worktree only to let the agent work in your live checkout)
returns: collect
nodes:
  - id: pick
    include: archon-route-pick

  - id: claude-opus
    depends_on: [pick]
    when: "$pick.output.agent == 'claude-opus'"
    provider: claude
    model: claude-opus-5 # pinned: the route's identity IS this agent (PROJECTS.md: pin models)
    idle_timeout: 600000
    prompt: '$ARGUMENTS'

  - id: claude-sonnet
    depends_on: [pick]
    when: "$pick.output.agent == 'claude-sonnet'"
    provider: claude
    model: claude-sonnet-5
    idle_timeout: 600000
    prompt: '$ARGUMENTS'

  - id: opencode-free
    depends_on: [pick]
    when: "$pick.output.agent == 'opencode-free'"
    provider: opencode
    model: opencode/big-pickle # WS0 Task 0.1 confirms this is still listed and free
    idle_timeout: 600000
    # No denied_tools here: the OpenCode provider ignores it (C13). The line below is a request
    # to the model, not a control; the worktree is the containment.
    prompt: |
      $ARGUMENTS

      Read files as needed, but do not edit files or run commands that change anything.

  - id: hermes-free
    depends_on: [pick]
    when: "$pick.output.agent == 'hermes-free'"
    bash: |
      set -euo pipefail
      printf '%s' "$ARGUMENTS" > "$ARTIFACTS_DIR/task.txt"
      size=$(wc -c < "$ARTIFACTS_DIR/task.txt")
      # hermes -z has no prompt-file flag; the prompt rides argv (~32 KB cap on Windows).
      if [ "$size" -gt 30000 ]; then
        echo "hermes-free: task is $size bytes; hermes -z takes the prompt on the command line (limit ~30000). Route it elsewhere." >&2
        exit 1
      fi
      # -t "" = no toolsets; --ignore-rules = don't inject this repo's AGENTS.md (G10).
      # stderr goes to a file so it can't mix into the answer on stdout. On failure, replay its
      # tail to this node's stderr: that text is what the engine records as the node's error
      # and what reaches archon-orchestrate's failed slot (G16). Exit with the CLI's own code.
      log="$ARTIFACTS_DIR/hermes.stderr.log"
      timeout 600 hermes -z "$(cat "$ARTIFACTS_DIR/task.txt")" -t "" --ignore-rules \
        --usage-file "$ARTIFACTS_DIR/hermes-usage.json" 2> "$log" || {
        rc=$?
        echo "hermes-free: hermes exited $rc (124 = killed by timeout 600). stderr tail:" >&2
        tail -c 4000 "$log" >&2
        exit "$rc"
      }
    timeout: 700000

  - id: grok-web
    depends_on: [pick]
    when: "$pick.output.agent == 'grok-web'"
    bash: |
      set -euo pipefail
      mkdir -p "$ARTIFACTS_DIR/grok-cwd"   # empty on purpose: nothing to explore (G10)
      {
        printf '%s\n\n' "Answer from the web. There is no repository here; do not look for one."
        printf '%s' "$ARGUMENTS"
      } > "$ARTIFACTS_DIR/grok-prompt.txt"
      log="$ARTIFACTS_DIR/grok.stderr.log"   # same failure contract as hermes-free (G16)
      timeout 600 grok --permission-mode plan --cwd "$ARTIFACTS_DIR/grok-cwd" --max-turns 10 \
        --prompt-file "$ARTIFACTS_DIR/grok-prompt.txt" 2> "$log" || {
        rc=$?
        echo "grok-web: grok exited $rc (124 = killed by timeout 600). stderr tail:" >&2
        tail -c 4000 "$log" >&2
        exit "$rc"
      }
    timeout: 700000

  - id: collect
    depends_on: [pick, claude-opus, claude-sonnet, opencode-free, hermes-free, grok-web]
    # Four branches are condition-skipped. none_failed_min_one_success admits those skips but
    # NOT a failed branch, so a failed agent never reaches here and the run fails.
    trigger_rule: none_failed_min_one_success
    bash: |
      set -euo pipefail
      agent=$pick.output.agent
      reason=$pick.output.reason
      # Whole-text refs to skipped branches resolve to ''. Unquoted on purpose (G1).
      case "$agent" in
        claude-opus)   answer=$claude-opus.output;   governance='governed (Archon claude provider)' ;;
        claude-sonnet) answer=$claude-sonnet.output; governance='governed (Archon claude provider)' ;;
        opencode-free) answer=$opencode-free.output; governance='governed (Archon opencode provider)' ;;
        hermes-free)   answer=$hermes-free.output;   governance='UNGOVERNED (bash: over hermes CLI - no Archon session, approval or audit)' ;;
        grok-web)      answer=$grok-web.output;      governance='UNGOVERNED (bash: over grok CLI - no Archon session, approval or audit)' ;;
        *) echo "collect: router returned unknown agent '$agent'" >&2; exit 1 ;;
      esac
      if [ -z "${answer//[[:space:]]/}" ]; then
        echo "collect: route '$agent' completed with empty output; failing rather than reporting nothing" >&2
        exit 1
      fi
      printf '### %s: %s\nRoute reason: %s\n\n%s\n' "$agent" "$governance" "$reason" "$answer"
    timeout: 60000
```

**`~/.archon/workflows/orchestrate/archon-orchestrate.yaml`**

```yaml
name: archon-orchestrate
description: |
  Splits one job into 1-6 independent subtasks and runs each as its own governed
  archon-route-task child run, so each subtask gets exactly one agent, chosen
  for it alone. Children run one at a time in this run's checkout. Each has
  its own run record and cost line (see `archon workflow runs --json`).

  A failed subtask does not stop the others. The report includes every subtask,
  failed ones with their original error, and then this run FAILS if any subtask
  failed. Nothing is re-run on a different agent.

  opencode-free subtasks need the pinned 1.x CLI first on PATH:
    PATH="$HOME/.archon/opencode-v1/node_modules/.bin:$PATH"
  Use the default worktree when the job changes code; --no-worktree for read-only jobs.

  Usage: archon workflow run archon-orchestrate "<job>"
nodes:
  - id: plan
    model: medium
    allowed_tools: [Read, Grep, Glob]
    idle_timeout: 300000
    output_format:
      type: object
      properties:
        subtasks:
          type: array
          items: { type: string }
      required: [subtasks]
    prompt: |
      Split the job below into between 1 and 6 subtasks. Do not do any of them.

      Each subtask is given, alone, to an agent that sees only that subtask's text:
      not the job, not the other subtasks, not their results. So each one must be
      self-contained: name the files, the goal, and what done looks like. Subtasks
      must be independent of each other. If the job is one indivisible piece of
      work, return it as a single subtask. Do not say which agent should do a
      subtask; that is chosen separately.

      Job:
      $ARGUMENTS

  - id: bound
    depends_on: [plan]
    # A fan-out's cost scales with the item count, so the list is bounded here, in its
    # producer, not by max_parallel (authoring-workflows.md:2064-2070).
    script: |
      const raw = process.env.INPUTS_SUBTASKS;
      const subtasks = raw === undefined ? undefined : JSON.parse(raw);
      if (!Array.isArray(subtasks)) {
        console.error(`bound: planner output.subtasks is not an array: ${String(raw).slice(0, 200)}`);
        process.exit(1);
      }
      if (subtasks.length < 1 || subtasks.length > 6) {
        console.error(`bound: planner returned ${subtasks.length} subtasks; expected 1-6`);
        process.exit(1);
      }
      const blank = subtasks.findIndex(s => typeof s !== 'string' || s.trim() === '');
      if (blank !== -1) {
        console.error(`bound: subtask ${blank + 1} is empty`);
        process.exit(1);
      }
      console.log(JSON.stringify(subtasks));
    runtime: bun
    with:
      subtasks: $plan.output.subtasks
    output_format:
      type: array
      items: { type: string }

  - id: run-each
    depends_on: [bound]
    workflow: archon-route-task
    fan_out:
      items: '$bound.output'
      # 1, not more: children share this checkout and archon-route-task may write to it,
      # so concurrent children would be refused at spawn. Serial also avoids OpenCode's
      # concurrent-start failures and the Pi semaphore.
      max_parallel: 1
      # join: all_done (default). A failed child is a slot, not a stop; `report` fails the run.

  - id: report
    depends_on: [bound, run-each]
    bash: |
      set -euo pipefail
      # Through files, not code: the aggregate can exceed the Windows argv limit (C5).
      # Assign, then quote (G1). Past 32 KB the engine substitutes an unquoted $(cat '<path>');
      # a bare `printf '%s' $run-each.output` would then drop every space and glob-expand `*`
      # in the answers, and the JSON would still parse.
      subtasks=$bound.output
      results=$run-each.output
      printf '%s' "$subtasks" > "$ARTIFACTS_DIR/subtasks.json"
      printf '%s' "$results" > "$ARTIFACTS_DIR/results.json"
      bun -e '
        const [subtasksPath, resultsPath, reportPath] = process.argv.slice(1);
        const fs = require("node:fs");
        const subtasks = JSON.parse(fs.readFileSync(subtasksPath, "utf8"));
        const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
        const failed = r => r !== null && typeof r === "object" && r.archon_failed === true;
        const sections = subtasks.map((task, i) => {
          const r = results[i];
          const body = failed(r) ? `FAILED (${r.status}): ${r.error}` : String(r);
          return `## Subtask ${i + 1} of ${subtasks.length}\n> ${task}\n\n${body}\n`;
        });
        const bad = results.map((r, i) => [r, i]).filter(([r]) => failed(r));
        const head = `# Orchestrated job: ${subtasks.length} subtasks, ${bad.length} failed\n`;
        fs.writeFileSync(reportPath, [head, ...sections].join("\n"));
        console.log([head, ...sections].join("\n"));
        for (const [r, i] of bad) console.error(`subtask ${i + 1} failed (${r.status}): ${r.error}`);
        process.exit(bad.length > 0 ? 1 : 0);
      ' "$ARTIFACTS_DIR/subtasks.json" "$ARTIFACTS_DIR/results.json" "$ARTIFACTS_DIR/report.md"
    timeout: 120000
```

> Whether `bun -e '<code>' a b c` puts `a` at `process.argv[1]` is the kind of detail to check
> once (`bun -e 'console.log(process.argv)' x y`) before trusting it. Bun has shifted argv
> layout for `-e` before. Fix the `slice` index to what it prints.

### Fixture shapes

```yaml
# route-task/fixtures/route-hermes-free.stubs.yaml
# The router picks hermes-free. Only that branch and collect may complete; the other
# four are condition-skipped. Both bash branches are stubbed so --exec-code can never
# reach a real CLI (G4); the unchosen one is an unused stub (a warning, by design).
pick__route: # CONFIRM this key with --stubs-init (C6)
  agent: hermes-free
  reason: 'stub: short self-contained rewrite'
hermes-free: 'stub hermes answer'
grok-web: 'FIXTURE-SENTINEL: must not be reached'
fixture:
  expect: completed
  reached: [pick__route, hermes-free, collect]
  resolved-text-contains:
    collect: 'stub hermes answer'
exec-code: true # collect really runs: its case arm and empty check are under test
```

For the three provider routes the chosen branch stub is the answer, and both bash branches
carry the sentinel. `chosen-empty.stubs.yaml`: router → `claude-sonnet`, `claude-sonnet: ""`,
`expect: failed`, `fail-node: collect`.

```yaml
# orchestrate/fixtures/plans-three.stubs.yaml
# Dry-run never executes a workflow: node (dry-run.ts:1225), so this fixture proves the
# planner contract and the bound check, then stops at run-each by design. The fan-out
# itself is proved by the live run (A3).
plan:
  subtasks: ['stub subtask one', 'stub subtask two', 'stub subtask three']
fixture:
  expect: failed
  fail-node: run-each
  reached: [plan, bound]
exec-code: true # bound really runs
```

`plans-none` (`subtasks: []`) and `plans-too-many` (7 items) use `expect: failed`,
`fail-node: bound`.

### Tasks, in order. **STOP** lines are hard gates.

```yaml
# ─────────────── WORKSTREAM 0 — measure (read-only; nothing under workflows/route-task or orchestrate yet)
Task 0.0  BASELINE:
  - `cd C:\Users\karam\archon && git status --short > ~/.archon/measure/ws0/git-status-before.txt`
  - `bun run cli workflow test --json > ~/.archon/measure/ws0/workflow-test-baseline.json`. Expect
    pre-existing fixture failures (a Linux checkout on 2026-11-04 showed 55 passed / 3 failed);
    A6 compares against THIS, not against zero. Not `bun run validate`: it runs no fixtures (C12).
  - Record `archon --version` and `bun run cli --version` (G13).

Task 0.1  CAPTURE CLI FACTS:
  - `hermes --help`, `grok --help`, `~/.archon/opencode-v1/node_modules/.bin/opencode run --help`,
    `… opencode models | grep -E 'big-pickle|xai/'` → ws0/cli-help/*.txt.
  - If a flag this PRP uses (G10, the YAML above) no longer exists, adjust the YAML now and
    record the change in the appendix's "divergences" list.

Task 0.2  CREATE archon-route-pick.yaml exactly as drafted (route list = hypothesis).
  - `bun run cli validate workflows archon-route-pick` → must pass.

Task 0.3  CORPUS DRAFT → ws0/corpus.md: 10 tasks, 2 per route, each with: id, text, expected
  route, why. 3–4 derived from `gh pr list --repo coleam00/Archon --state closed --limit 30
  --json title` (say which). Code-change tasks are phrased as "produce the patch as a unified
  diff; do not edit files" so measurement stays read-only. At least one task deliberately sits on
  a route boundary (e.g. a code question a free agent might botch).
  ──── STOP: show the operator corpus.md. No spend before approval. ────

Task 0.4  AGENT HARNESS → ws0/measure-agent.sh <agent> <task-id>. Every agent runs READ-ONLY:
    claude-opus    claude -p --model claude-opus-5   --permission-mode plan --output-format json
    claude-sonnet  claude -p --model claude-sonnet-5 --permission-mode plan --output-format json
    opencode-free  <v1 opencode> run -m opencode/big-pickle --agent plan --format json
    opencode-xai   <v1 opencode> run -m <an xai/grok model from 0.1> --agent plan --format json   (grok-route alternative; record auth failure if it fails)
    hermes-free    hermes -z <task> -t "" --ignore-rules --usage-file out/…/usage.json
    grok-web       grok --permission-mode plan --cwd <empty tmp> --max-turns 10 --output-format json --prompt-file …
  Each run writes out/<agent>/<task>.txt (answer), .meta (exit code, wall seconds, cost or "not
  reported", bytes). Wrap every call in `timeout 600`. NEVER log credentials or env.
  Extra probes (run once each):
    - Orphans (G9): `timeout 5 hermes -z "<long essay prompt>" -t ""`, then
      `tasklist | grep -i -E 'hermes|python'` → record survivors.
    - OpenCode start reliability: 10 sequential runs of `bun run cli workflow run
      e2e-opencode-smoke --no-worktree` with the PATH pin → record N/10 started.
    - Grok JSON: does --output-format json carry usage/cost? (C11) → record the field names.
  SPEND CAP: stop when Claude `total_cost_usd` (API-equivalent) summed over WS0 reaches $8.
  Report what's done and ask before continuing.

Task 0.5  RUN 10 tasks × 6 columns (5 routes + opencode-xai). Grade each output: pass / fail,
  with a one-line reason (on-task? correct? complete?). Grade against the task, not the agent's
  confidence. Flag every grade you are unsure of; the operator spot-checks those.

Task 0.6  ROUTER RUN: for each task, twice:
    `bun run cli workflow run archon-route-pick --no-worktree "<task>"`                                   (free small)
    `bun run cli workflow run archon-route-pick --no-worktree --model small=claude/claude-haiku-4-5 "<task>"`
  Record chosen agent, schema failure (node failed), wall time. 40 calls total.

Task 0.7  VERDICT. Fill in the appendix with these rules, applied mechanically:
  ROUTE TABLE — best agent per task = the cheapest-first agent (hermes < opencode < grok <
    sonnet < opus) that PASSED. Rewrite each route's description in archon-route-pick to the
    scope its wins support. A route that won 0 tasks AND has no capability the others lack →
    drop it (remove from the enum, the when: branch, the collect arm and the fixtures,
    in the same edit).
  GROK — keep the grok-web route only if grok-web passed a web task that opencode-xai failed or
    couldn't run. Otherwise replace the grok-web branch with an OpenCode provider node on the
    xai model (governed: an improvement), or drop it.
  OPENCODE — keep the route iff the smoke started ≥ 9/10 AND it won ≥ 1 task.
  ROUTER MODEL — free `small` is ADOPTED iff, over both of its passes: 0 schema failures, AND 0
    under-routes (a task whose best agent is claude-* sent to a free agent), AND ≥ 8/10 agreement
    with the best agent in each pass. Else apply the same test to haiku. If haiku passes, pin the
    route node (C7). If neither passes → STOP and report; WS1 does not start.
  ──── STOP if any rule produced an ambiguous result (a tie, an ungradeable output, the spend
       cap hit). Otherwise continue. ────

# ─────────────── WORKSTREAM 1 — harden single-task routing
Task 1.0  MOVE the prototype: `mkdir -p ~/.archon/prototypes/2026-10-21 && mv
  C:/Users/karam/archon/.archon/workflows/experimental/archon-route-task.yaml
  ~/.archon/prototypes/2026-10-21/` (C3). Confirm `git status` shows it gone from the untracked
  list and nothing else changed.

Task 1.1  APPLY the WS0 verdict to archon-route-pick.yaml (route text, router pin if any).

Task 1.2  CREATE archon-route-task.yaml as drafted, minus any route WS0 dropped. Keep the enum,
  the `when:` literals and the collect arms letter-identical (G3).
  `bun run cli validate workflows archon-route-task` → pass, no warnings about unknown keys.

Task 1.3  FIXTURES: `bun run cli workflow run archon-route-task --dry-run --stubs-init
  "$TMP/scaffold.yaml"` (into the scratchpad, not the fixtures dir) and read the real stub key for
  the included route node. Then write one fixture per surviving route plus chosen-empty, as in
  "Fixture shapes".
  `bun run cli workflow test archon-route-task` → all pass.

Task 1.4  SKIP PROOF (A2's dry half). A fixture's `reached:` asserts only what ran, not that the
  other four branches were skipped, so this task is what proves "exactly one agent". Two catches:
  `--stubs` REFUSES a fixture file ("contains the fixture key 'fixture' … run it with
  'workflow test'"), and `workflow test --json` carries no per-node trace. So, for each route
  fixture:
    1. Copy it to the scratchpad WITHOUT its `fixture:` block and `exec-code:` line
       → "$TMP/<route>.stubs.yaml" (stubs only).
    2. `bun run cli workflow run archon-route-task --dry-run --exec-code --json
       --stubs "$TMP/<route>.stubs.yaml" "<any task>" > "$TMP/<route>.trace.json"`
       (`--dry-run` refuses `--no-worktree`; leave it off.)
    3. A scratchpad bun script over `.trace[]` (each entry has `nodeId`, `state`, `output`):
       exactly ONE of the five agent nodeIds has state `stubbed` or `completed` and the other
       four are `skipped`; `collect` is `completed`; no `output` contains "FIXTURE-SENTINEL".
  BASH FAILURE PROOF (G16), once per bash route: put a fake CLI first on PATH that writes
  "FAKE-CLI-ERROR" to stderr and exits 3 (`printf '#!/bin/sh\necho FAKE-CLI-ERROR >&2\nexit 3\n'`).
  Run the same dry-run with a stubs file that stubs `pick__route` to that route and does NOT stub
  the route itself, so `--exec-code` runs its real body against the fake. Expect: the route node
  `failed`, its recorded reason (`--json` output) contains "exited 3" AND "FAKE-CLI-ERROR",
  `collect` skipped, outcome `failed`. A FAILED dry-run prints a second JSON document
  (`{"ok": false, …}`) after the trace on stdout, so parse only the first. Both checks passed
  for the drafts above on 2026-11-04 (Linux, Bun 1.4.4); re-run them on Windows.
  Not committed: this is the evidence for G3, G4 and G16.

Task 1.5  LIVE (A2): one real run per surviving route, using that route's corpus task (or a new
  task that clearly belongs to it), with the PATH pin, in the DEFAULT WORKTREE (no
  `--no-worktree`: C13). For each: `workflow get <id> --json
  --verbose` → one agent node completed, others skipped, answer non-empty and on-task. Record run
  ids + cost in the appendix. If a run picks a different route than expected, that is a router
  finding: record it, then give that route one more task. Do not edit the router to force a pick.
  ──── STOP if any live run failed for a reason other than a deliberate test. ────

# ─────────────── WORKSTREAM 2 — subtask orchestration
Task 2.1  CREATE archon-orchestrate.yaml as drafted. First check the bun -e argv index (see the
  note under the report node). `bun run cli validate workflows archon-orchestrate` → pass with
  NO warnings. A "bare $nodeId.output substitution" warning on `report` means G1 regressed.
  If the loader rejects `with:` on an inline `script:` node, switch `bound` to a bash node that
  writes `$plan.output` to a file and runs `bun -e` over the file path. Record that divergence.

Task 2.2  FIXTURES: plans-three / plans-none / plans-too-many. `bun run cli workflow test
  archon-orchestrate` → all pass (two fail at bound; plans-three fails at run-each, which
  is expected per C2).

Task 2.3  LIVE (A3): a job with ≥ 3 genuinely separable parts, read-only and cheap. Example:
  "In this repo: (1) summarise what packages/workflows/src/fixture-runner.ts does in 5 bullets;
  (2) list the bundled default workflows and one line on each; (3) what is the latest stable Bun
  release and its headline change". Run in the default worktree (C13) with the PATH pin. Then
  `bun run cli workflow runs --json --limit 10` → children carry parent_run_id = parent;
  `workflow get <child> --json` per child → total_cost_usd (absent for bash-only routes; say so).
  Record what the HUMAN `workflow runs` view shows (C10).

Task 2.4  CHECK the report: one section per subtask, in item order, each with the child's header.

Task 2.5  BROKEN ROUTE (A4) — temporary, reverted in the same task:
  copy archon-route-task.yaml → archon-route-task.yaml.bak; set the claude-sonnet node's
  model to `claude-nonexistent-model`; run archon-orchestrate, in the default worktree, on a
  one-subtask job the router will send to claude-sonnet (from the corpus). Expect: the child fails at claude-sonnet with the
  provider's own error, collect is skipped, and NO other agent node in that child ran. run-each
  completes with a failed slot. report prints the section "FAILED (failed): <original error>",
  writes it to stderr, and the parent fails. Restore from .bak, delete .bak, re-run
  `workflow test archon-route-task` → pass.
  If the router doesn't pick claude-sonnet for that job, pick a task it routed to sonnet in
  Task 1.5. Don't break a route the router won't choose.
  Provider validation (authoring-workflows.md "Provider Validation") may reject the bogus model
  when the child starts, before any node runs, rather than at the claude-sonnet node. That
  still satisfies A4 (child fails, parent fails, original error), but record which of the two
  happened, and quote the error verbatim.

# ─────────────── CLOSE
Task 3.1  A6: `bun run cli workflow test --json` → compare to workflow-test-baseline.json; the only
  allowed delta is the new route-task/ and orchestrate/ fixtures appearing, all passing.
  `git status --short` → identical to git-status-before.txt, except the moved prototype.
Task 3.2  BOOKKEEPING (all in one sitting):
  - Fill in "Execution report" at the end of this PRP (divergences, run ids, costs).
  - `mv PRPs/0-archon-agent-router.md PRPs/1-archon-agent-router.md`; then grep for
    "0-archon-agent-router" across ~/.archon/workflows and fix references (route-pick's
    description already says 1-).
  - `mv 0-INITIAL-agent-router.md PRPs/initials/archon-agent-router.md` and prepend an
    "> **APPLIED — <date>.** Consumed by PRPs/1-archon-agent-router.md …" banner listing the
    shipped files and the divergences (mirror PRPs/initials/archon-m15-system-wide-engine.md).
  - PROJECTS.md, Archon "Multi-agent dispatch" bullet: replace the prototype description with
    the shipped paths, the WS0 verdict line, the opencode PATH requirement, and the orphan
    finding (G9). Check whether ROADMAP.md needs a pointer. Don't open a second `## Now` lane.
```

### Integration Points

```yaml
CONFIG:        none. ~/.archon/config.yaml is NOT edited (C7).
DATABASE:      none. Runs write ordinary workflow_runs rows (parent_run_id on children).
ENGINE/SOURCE: none (C1). No packages/** edit, no new YAML field, no new when: operator.
PATH:          every run that may hit opencode-free: PATH="$HOME/.archon/opencode-v1/node_modules/.bin:$PATH" (G11)
DISCOVERY:     ~/.archon/workflows/{route-pick,route-task,orchestrate}/ — one folder each (C4)
```

---

## Validation Loop

### Level 1: Load-time and dry-run (no spend)

```bash
cd /c/Users/karam/archon
bun run cli validate workflows archon-route-pick
bun run cli validate workflows archon-route-task
bun run cli validate workflows archon-orchestrate   # no warnings (G1)
bun run cli workflow test archon-route-task      # every route fixture + chosen-empty pass
bun run cli workflow test archon-orchestrate     # plans-three (fails at run-each by design), none, too-many
# Task 1.4 skip proof: stubs-only copies of each fixture → exactly one non-skipped agent node,
# no sentinel in any output; fake-CLI run → bash route fails carrying the CLI's stderr (G16)
```

### Level 2: Router measurement (cheap spend, Task 0.6)

`archon-route-pick` alone, 10 tasks × 2 models × 2 passes. Pass = the Task 0.7 router rule.

### Level 3: Live routing (Tasks 1.5, 2.3, 2.5)

One run per route (A2), one orchestrated job with ≥ 3 children (A3), one deliberately broken
route (A4). All in the default worktree, never `--no-worktree` (C13). Evidence is `workflow get … --json --verbose` output, quoted in the execution report,
not a summary of it.

### Level 4: Fixture gate (Task 3.1)

`bun run cli workflow test --json` against the Task 0.0 baseline (A6). Not `bun run validate`,
which runs no fixtures (C12).

## Final Validation Checklist

- [ ] A1: appendix table complete. Route table and router model verdicts recorded.
- [ ] A2: one live run per surviving route; one agent node completed, others skipped.
- [ ] A3: ≥ 3 child runs with parent_run_id and per-child total_cost_usd (or "not reported" for bash routes).
- [ ] A4: broken route fails child + parent with the original error; no second agent ran; route restored.
- [ ] A5: `workflow test` passes for both workflows; route-task fixtures cover every route; Task 1.4
      trace and fake-CLI checks recorded.
- [ ] A6: bare `workflow test` no worse than baseline; `git status` unchanged except the moved prototype.
- [ ] Every live run used the default worktree (C13).
- [ ] No credentials or message contents in any log, artifact name or this PRP.
- [ ] `~/.archon/config.yaml` byte-identical to before (`git diff --no-index` against a copy taken in Task 0.0).
- [ ] Bookkeeping (Task 3.2) done in the same sitting.

## Rollback

Everything is additive and outside git: delete the three `~/.archon/workflows/` folders above,
and move the prototype back from `~/.archon/prototypes/2026-10-21/` to
`.archon/workflows/experimental/`. Nothing else changed.

## Explicitly out of scope (note them, do not build them)

- Real providers for Hermes (`hermes acp`) and Grok (`grok agent stdio`). They wait on the external
  provider-plugin contract (direction.md §community-plugins).
- Fixing the OpenCode SDK start marker in `@archon/providers` (C1 makes it unlandable from here;
  if worth doing, it's an upstream issue to file).
- Making the OpenCode provider honour `allowed_tools`/`denied_tools` (C13). Also an engine change.
- Antigravity (`agy` not installed).
- Concurrent children (needs `isolation: worktree` and a merge story).
- A subtask-dependency DAG (subtasks are independent by construction; ordered work is a
  different workflow).
- Changing `archon-ask-all-agents` or `archon-multi-agent-pr-review`.
- A run-tree budget ceiling (#1961). The `bound` cap of 6 is the bound for now.

## Anti-Patterns to Avoid

- ❌ `|| echo "FAILED"` / exit-0 markers on an agent node. A failure must fail (Principle 3).
- ❌ Parsing the child's header line anywhere. It's for humans. The engine holds the record.
- ❌ A second copy of the router prompt "for measurement" (C6).
- ❌ Rebinding `tiers.small` to make the router reliable (C7).
- ❌ Raising `max_parallel` "for speed" (C8).
- ❌ Splicing agent output into `bun -e` code or a `with:` env var (C5).
- ❌ A bare or double-quoted `$node.output` in a bash body. Assign, then quote (G1).
- ❌ Sending a bash agent's stderr to a file without replaying it on failure (G16).
- ❌ `denied_tools`/`allowed_tools` on an OpenCode node as a safety control, or `--no-worktree`
  on a live run (C13).
- ❌ Editing the router prompt until a live run picks the "expected" route (Task 1.5). A
  surprising pick is data.
- ❌ `git add` of anything in the Archon repo (C1, G14).

## Confidence Score: 7/10

What's solid: every engine behavior the design leans on (skip-tolerant whole-text refs,
`none_failed_min_one_success`, fan-out join slots, the shared-checkout refusal, dry-run's
`workflow:` limit, fixture sibling matching) was read in source or docs on 2026-10-22, not
assumed. Every file is drafted in full.

What costs the three points, in order of likelihood:

1. **WS0 is judgement-heavy.** Grading 60 outputs and rewriting route text is the bulk of the
   work and the hardest to make one-pass. The STOP gates exist because of this.
2. **Small engine details unverified by execution:** the flattened stub key (`pick__route`,
   C6), `with:` on an inline `script:` (Task 2.1 has the fallback), and `bun -e` argv layout.
   Each has a named check and a fallback.
3. **Windows process behavior:** whether `timeout` kills Hermes's python grandchild (G9), and
   OpenCode start reliability. Measured in WS0, not fixable in YAML.

---

## Appendix: Workstream 0 results (filled in by Task 0.7)

### Corpus (operator-approved on: \_\_\_\_)

| id  | task (short) | expected route | source |
| --- | ------------ | -------------- | ------ |

### Agent measurements

| task | agent | exit | wall s | cost (API-eq $ / tokens / "not reported") | pass? | reason |
| ---- | ----- | ---- | ------ | ----------------------------------------- | ----- | ------ |

### Router measurements

| task | best agent | free pass 1 | free pass 2 | haiku pass 1 | haiku pass 2 | schema failures |
| ---- | ---------- | ----------- | ----------- | ------------ | ------------ | --------------- |

### Probes

- Hermes orphan after `timeout 5`: \_\_\_\_
- OpenCode smoke starts: \_\_/10
- Grok `--output-format json` usage fields: \_\_\_\_

### Verdicts

- Route table: confirmed / revised (diff): \_\_\_\_
- Grok route: kept / replaced by opencode-xai / dropped, because \_\_\_\_
- OpenCode route: kept / dropped, because \_\_\_\_
- Router model: free `small` adopted / haiku pinned / STOP, because \_\_\_\_

### Divergences from this PRP

- ***

---

## Execution Report

_(appended by the executing agent: run ids, costs, quoted evidence, final checklist)_
