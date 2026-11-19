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

> **REVIEWED 2026-11-14 (Opus 5.5, read-only review against `dev` @ 2aabbd0ca, v0.14.0, and
> the checkout that actually runs, `wip/workspace-2026-10-24` @ c97ad9522, v0.11.1).** This
> is the corrected copy of `PRPs/0-archon-agent-router.md`. The original is unchanged. Every
> edit below is marked `[R-n]`, and the findings are listed in "Review findings" right after
> this note. **Read the four OPERATOR PRECONDITIONS before `/execute-prp`. Three of them are
> decisions the executing agent must not make on its own.**

## Review findings (2026-11-14)

### Operator preconditions: do these before Sonnet starts

> **Settled by the operator 2026-11-14. All four are closed; Sonnet may start.**
>
> - **P1 done:** `20bcbe0e` abandoned (and a second stale run, `96d69416`). `archon workflow status` shows no active workflows.
> - **P2 approved:** corpus accepted as written; its header now says APPROVED.
> - **P3 decided:** stay on the installed build, c97ad9522 (v0.11.1). Do not switch branches.
> - **P4 decided:** no xAI re-auth. `grok-web` is dropped per R-6; the `opencode-xai` column stays unmeasured.

| #   | Precondition | Why |
| --- | ------------ | --- |
| P1  | **Abandon the stale run `20bcbe0e`** (`archon-route-task`, status `running` since 2026-10-21, working path `C:/Users/karam/Archon`): `archon workflow abandon 20bcbe0e`. | It holds the path lock on this checkout, so every `--no-worktree` run here fails with "Workflow already active on this path" (WS0 notes D5, and still `running` in `~/.archon/archon.db` today). AGENTS.md: a process must not guess lifecycle ownership, so the operator does this, not the agent. |
| P2  | **Approve or amend `~/.archon/measure/ws0/corpus.md`.** Its header still says "DRAFT, awaiting operator approval". | Task 0.3's STOP gate was never formally closed. Free agents have already run on it (no Claude spend). The Claude columns and the router runs spend Claude quota and are blocked on this approval. |
| P3  | **Choose the engine build** (see R-1). Recommended: **stay on the installed build, c97ad9522 (v0.11.1)**. Don't switch branches for this PRP. | `bun run cli` and `~/.bun/bin/archon` both run c97ad9522, which is 255 commits behind `dev`. Several PRP facts depend on which build runs. |
| P4  | **xAI auth, or accept dropping `grok-web`.** Either run `opencode auth login` for xAI so the `opencode-xai` column can be measured, or accept that `grok-web` is dropped (R-6). | The `opencode-xai` column failed with `invalid_grant` (D7). Re-authenticating is interactive and only the operator can do it. |

### Findings (blocking first)

| ID   | Where (original PRP) | What is wrong | Fix applied in this copy |
| ---- | -------------------- | ------------- | ------------------------ |
| R-1  | whole PRP, "measured against this `dev` checkout" | The checkout is **not on `dev`**. HEAD is `wip/workspace-2026-10-24` @ c97ad9522 (a snapshot on top of #5149), 255 commits behind `dev` @ 2aabbd0ca (#5646). `archon --version` reports commit c97ad9522. What the run actually executes is c97ad9522, not `dev`. | Added P3. The drafts below are checked to be valid on **both** builds, except C2, which differs (see R-8). |
| R-2  | Task 0.0–0.3, the appendix ("filled in by Task 0.7") | **WS0 is half-executed, not unstarted.** `~/.archon/measure/ws0/` (2026-10-22..27) holds the baseline, CLI help, corpus, harness, `tasks/*.txt`, free-agent outputs (hermes-free twice, opencode-free, grok-web), `grades.md` and `notes.md` (divergences D1–D12). `~/.archon/workflows/route-pick/archon-route-pick.yaml` exists and is byte-identical to the draft. Not done: the Claude columns, the `-t web` hermes grades, `opencode-xai` (auth), Task 0.6 (blocked by P1), Task 0.7. | Task 0.0 is now **RESUME**. It reads `notes.md` and `grades.md` first and redoes nothing that has a result. |
| R-3  | `hermes-free` node; G10; router prompt; Task 0.4 | **Safety: `hermes -z … -t ""` does NOT disable tools.** Measured (D9): Hermes then gets its full toolset (terminal, write_file, patch, execute_code, computer_use). As drafted, `hermes-free` is an **ungoverned agent with write access to the run's cwd**, which is the live repo under `--no-worktree`. The "no tools, no repository access" claim is false. `-t web` yields exactly the web tools (verified). | `-t web`. The node `cd`s into an empty `$ARTIFACTS_DIR/hermes-cwd`. The router text says "web search only, no files or repository". |
| R-4  | C3, G14, Task 1.0, Task 3.1, A6 | The INITIAL, this PRP and the prototype are **tracked**, committed in c97ad9522 on the wip branch. They are not untracked. Moving the prototype shows up as a tracked deletion (` D`). `git-status-before.txt` (13 entries, from 2026-10-22) is stale (D2). C1 still holds for `origin` (push URL `no-push-to-coleam00`). A `fork` remote (5c1p3r/Archon) also exists. The PRP must still never commit or push. | Task 1.0 does a working-tree `mv` with no commit, and accepts exactly one ` D` line. Task 0.0 takes a **fresh** `git status` baseline. |
| R-5  | A6, Task 0.0, Task 3.1, Level 4 | `bun run validate` is the wrong gate. (a) AGENTS.md: "Don't run `bun run validate` to finish a change", and nothing in the repo changes here. (b) On this machine it exits 0 silently (D1). (c) The real gate (`bun scripts/validate.ts`) fails a pre-existing `type-check` (TS2305 `PlatformPath`), so later checks never run. A6 couldn't tell pass from no-op. | A6 is now: `validate workflows` for the 3 workflows, plus `workflow test` for both, plus `git status` equal to the fresh baseline except the one ` D`. |
| R-6  | Task 0.7 GROK vs ROUTE TABLE | **The rules contradict each other on the measured data.** ROUTE TABLE drops a route that won 0 tasks and has no unique capability. `grok-web` won 0 tasks: hermes and opencode-free also browsed the web and passed G1 and G2 (notes). GROK keeps `grok-web` if `opencode-xai` "couldn't run", and it couldn't (auth, D7). | An auth failure is "not measured", not "failed". ROUTE TABLE wins. `grok-web` is dropped unless P4 re-auths xAI and `opencode-xai` is then measured. |
| R-7  | C8 | The rationale is false on both builds. Children of the **same `fan_out` node** are excluded from each other's path lock and *may* share the checkout. Nothing is "refused at spawn" (workflow-language.md, "Sharing a checkout or choosing isolation"). | `max_parallel: 1` is kept, for real reasons: two writers in one checkout with no coordination, OpenCode concurrent start, and the Pi semaphore. |
| R-8  | C2, Task 2.2, A5 | **True on c97ad9522, false on `dev`.** On `dev`, `dry-run/nodes/workflow.ts` accepts an authored **array stub** for a `workflow:` + `fan_out:` node (one result per item, any JSON, `archon_failed` slots included), so `report` can be fixture-tested. On c97ad9522 a fan-out still can't be stubbed ("A fan-out has no single child output to stub"). | C2 is kept for P3 = stay. A `dev`-only fixture set is added in "Fixture shapes" for when the engine moves to ≥ v0.14. |
| R-9  | G1, the `report` node, C5 | Docs now say **"assign, then quote the variable."** `printf '%s' $bound.output` and `printf '%s' $run-each.output` are bare references outside an assignment. `validate workflows` warns about them, and when the value spills (>32 KB) the `$(cat '<path>')` form word-splits, so `results.json` would be corrupt. That is exactly the case C5 is designed for. | `v=$run-each.output; printf '%s' "$v" > …` |
| R-10 | G8 | A gate inside a fan-out child now **pauses** the child and the parent. It doesn't fail the fan-out. | The rule is unchanged (no `approval:`/`wait:` in route-task: runs are unattended). The rationale is corrected. |
| R-11 | Task 2.1 note, confidence item 2 | Verified 2026-11-14 on Bun 1.3.14: `bun -e '…' a b c` gives `process.argv = [bun, "a", "b", "c"]`, so `slice(1)` is correct. | The check is removed. Task 2.1 says "already verified". |
| R-12 | G13, every `workflow run` | On this machine `workflow run` fails with "already registered at C:/Users/karam/Archon, a different clone" (slash-style mismatch, D4). The working form is `--project coleam00/Archon`. `node_modules` was also stale (D3; `bun install --frozen-lockfile` fixed it). | `--project coleam00/Archon` is added to every live run command. |
| R-13 | Gates (question 3) | Weak spots in telling *routed* from *looked routed*: (a) "others `skipped`" doesn't say *why*. A branch skipped by an upstream failure also reads `skipped`. (b) A bash route that exits 0 and prints an error message passes `collect`'s non-empty check (Hermes also switches provider silently, D10). (c) Route fixtures stub `pick__route`, so they prove the `when:`/`collect` wiring, **not** routing quality. Only WS0 proves that. | (a) Task 1.4 and Task 1.5 now assert the skip **cause** is the `when:` condition, and Task 1.4 asserts the unchosen bash stubs appear in `unusedStubs`. (b) A2 grading must read the answer, and the hermes `usage.json` model/provider is recorded per run. Stated as a residual risk. (c) Stated under A5. |
| R-14 | References block, C2, C4, C6, C8, C9, C10, G-numbers | **Every `authoring-workflows.md` reference is dead.** The file no longer exists on either build. Its content is in `reference/workflow-language.md`. `dry-run.ts:1225`, `dag-executor.ts:12161`/`:3831` and the fixture-runner line numbers have all moved. §governed-launch-ownership is in `direction.md:104`, not in the constitution. | The references block is rewritten with section *names* (they survive refactors) and `dev` line numbers. Inline cites keep their names and drop line numbers. |
| R-15 | Task 2.5 caveat | Literal model strings are **not** checked at load ("Provider Validation": "the provider's API accepts or rejects them at request time"), so the "may be rejected before any node runs" branch can't happen. A4's real risk is that the router rarely picks `claude-sonnet`, because hermes passed most corpus tasks. | The caveat is removed. Task 2.5 breaks **whatever route the router chose** for a Task 1.5 task, deterministically, at runtime. |
| R-16 | G6 | `allowed_tools` is enforced on Claude, Pi and Copilot only, not on OpenCode. On Pi, `[]` does **not** restrict user Pi extension tools. The router node runs on Pi (`small`). | G6 is corrected. Task 0.1 also records which Pi extensions are loaded. |
| R-17 | C7 | cli.md: "New child runs inherit the parent's recorded AI base", so a parent's `--model` *can* reach a `workflow:` child's tier resolution. This doesn't matter here, because WS0 measures the block directly. | The sentence is corrected. |
| R-18 | D6 (OpenCode) | c97ad9522 prints "OpenCode is deprecated and will be removed". On `dev`, #5232 reversed this ("OpenCode, Copilot and Telegram stay"). The `@opencode-ai/sdk` pin is now `^1.18.34`, so the G11 start-marker mismatch must be re-checked by the smoke probe and not assumed. | The OPENCODE verdict doesn't treat the deprecation banner as evidence. |

**Conflicts with AGENTS.md / direction.md / constitution:** none in the design. Routing is a typed
enum, `when:` coordinates, the planner emits a typed array, the report reads `archon_failed`
(not prose), and there's no engine field, provider or `when:` operator. That matches
"YAML coordinates, code computes, agents judge" and the independence rule, because the
"how many failures are acceptable" judgement sits in `report`. The only AGENTS.md conflict was
A6's `bun run validate` (R-5). Hermes and Grok as `bash:` routes are within
direction.md §community-plugins: no new bundled provider.

**Verdict after these fixes: ready for Sonnet once P1–P4 are settled.**

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
bun run cli workflow run archon-route-task --no-worktree "<task>"
# one job → planner → N subtasks → N child runs, each routed → one report
bun run cli workflow run archon-orchestrate --no-worktree "<job>"
```

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
      with no provider spend. The route-task fixtures exercise every routing branch.
- [ ] **A6.** [R-5] `bun run cli validate workflows <name>` passes for all three workflows with no
      warnings, `bun run cli workflow test` passes for both (A5), and `git status --short` equals
      the fresh Task 0.0 baseline except the single ` D` line for the moved prototype (R-4). (Not
      `bun run validate`: AGENTS.md says not to finish a change with it. On this machine it exits 0
      silently, and its real gate fails a pre-existing type-check.)

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

**C2. A dry run never executes a `workflow:` node.** `simulateChildRunNode()` in `packages/workflows/src/dry-run/nodes/workflow.ts` [R-14]
fails any reachable `workflow:` or compose-fan-out node with _"Dry-run does not execute reachable
… nodes"_. The CLI docs say the same (`reference/cli.md:388`, "Runtime `workflow:` sub-runs are
reported as unsupported"). So **acceptance 5 is fully achievable for `archon-route-task` only.**
For `archon-orchestrate`, the fixtures prove everything up to the fan-out (`plan`, `bound`) and
declare `expect: failed, fail-node: run-each` for that documented reason. The fan-out itself
is proved by the live run in A3. Don't try to make a stub "run" the fan-out. There's no
such mechanism, and inventing one is out of scope.
**[R-8] This holds on the build that runs (c97ad9522), not on `dev`.** From v0.14 (`dev`),
`dry-run/nodes/workflow.ts` accepts an authored array stub for a fan-out node (one result per
item), so `report` becomes fixture-testable. See "Fixture shapes → dev-only". Use those fixtures
only if P3 moved the engine to `dev`.

**C3. A repo workflow shadows a global one with the same filename.**
`guides/global-workflows.md:60,262`: repo-specific overrides global by exact filename. The
untracked prototype at `.archon/workflows/experimental/archon-route-task.yaml` would hide the
promoted global `archon-route-task.yaml` whenever a run starts from this repo. **Move it** to
`~/.archon/prototypes/2026-10-21/` (Task 1.0), a path discovery never scans. Move it, never
delete it. **[R-4]** It is **tracked** on `wip/workspace-2026-10-24` (commit c97ad9522), so the
move leaves one ` D` line in `git status`. Do not commit that, and do not `git rm`. The operator
decides whether the wip branch records it. `archon-ask-all-agents.yaml` and
`archon-multi-agent-pr-review.yaml` stay where they are. They are separate tools, out of scope.

**C4. A fixture runs against every workflow beside it.** `workflowNamesBeside()` in `fixture-runner.ts`: each
`fixtures/*.stubs.yaml` is checked against **every** sibling workflow YAML. So `route-pick`,
`route-task` and `orchestrate` each get **their own folder**. One shared folder would run the
route-task fixtures against the orchestrator. Discovery reaches one subfolder deep
(`MAX_DISCOVERY_DEPTH = 1`, `command-validation.ts:23`), so `~/.archon/workflows/<folder>/x.yaml`
is discovered. Global fixtures are discovered by `workflow test` (`fixture-runner.ts`, project/global/bundled roots
scans project, global, and bundled roots).

**C5. Windows argv and env-var limits shape the collector.** On Windows, a single command line and
a single environment variable are each capped at ~32 KB. Three consequences:

- An inline `script:` body runs as `bun --no-env-file -e '<code>'`
  (`guides/script-nodes.md:71`). Splicing an agent's answer into it can overflow argv. **Answers
  never go through a `script:` body or a `with:` env binding.**
- `bash:` node-output substitution **spills values over 32 KB to a file** and substitutes
  `$(cat '<path>')` (workflow-language.md, "`$node_id.output` Substitution"). So the collector
  and the report are `bash:` nodes, and big text moves through files under `$ARTIFACTS_DIR`.
  **[R-9]** The spill form is unquoted, so it is only safe as the **whole value of an
  assignment** (`v=$x.output`). Then quote the variable (`"$v"`). A bare `printf '%s' $x.output`
  word-splits once the value spills.
- `hermes -z PROMPT` has no prompt-file flag, so the prompt rides argv. The Hermes route checks
  the task's size and **fails** above 30 000 bytes. It does not truncate (the PR-review prototype
  truncated silently).

**C6. The router's measurement needs no duplicate router.** Put the route node in its own block
(`archon-route-pick`, `returns: route`) and `include:` it from `archon-route-task`. Then WS0
runs the block on its own (`workflow run archon-route-pick "<task>"`) and pays only for the
routing call, and there is one router prompt, not a hand-synced copy (AGENTS.md: "Two
declarations that must agree … are a present defect"). `include:` flattens at load: the node id
becomes `pick__route` and `$pick.output.agent` is rewritten to it
(workflow-language.md, "How expansion works"). **Confirm the flattened stub key with `--stubs-init` (Task 1.3)
rather than trusting this spelling.**

**C7. Never fix the router model by rebinding the global `small` tier.** If WS0 rules that the
free router is not good enough, the fix is a literal pin **on the router node**
(`provider: claude`, `model: claude-haiku-4-5`). Rebinding `tiers.small` in
`~/.archon/config.yaml` would move the 10 bundled `small` nodes back onto Claude quota and undo
`PRPs/1-archon-cost-tier-omniroute.md`. Also: `--model small=…` is a per-run rebinding.
**[R-17]** cli.md says "New child runs inherit the parent's recorded AI base", so it *may* reach
a `workflow:` child's tier resolution, while the child keeps its authored literal pins
(direction.md §governed-launch-ownership). WS0 measures the block directly, so this never
matters here.

**C8. Fan-out children share one checkout, so `max_parallel: 1`.** `archon-route-task` can write
to the checkout (a `claude-sonnet` code change), so it must **not** declare `mutates_checkout:
false`. **[R-7] Corrected:** the engine does *not* refuse a wider window. Children of the same
`fan_out` node are excluded from each other's path lock and may share the checkout, and "Agents
own coordination of their edits; the engine adds no coordination mechanism" (workflow-language.md,
"Sharing a checkout or choosing isolation"). That is why `max_parallel: 1` is the right choice: two
writing children in one checkout would trample each other with nothing to stop them. It also
removes two measured failure modes: OpenCode's embedded-server start failing when several start
at once, and the Pi semaphore (`assistants.pi.maxConcurrent: 2`). The cost is wall time. A parent
never blocks its own descendants on the path lock ("Running sub-runs side by side").

**C9. Choosing the parent's join.** The INITIAL left it open. With `join: all_success` the
parent fails, but the report node never runs, so the subtasks that succeeded have no report.
With the default `all_done`, failures arrive as `{ archon_failed: true, error, status }` slots
(workflow-language.md, "Join semantics"). **Decision: `all_done` plus a `report` node that writes the full
report (including failed slots and their original error text), prints it, and then exits 1 if
any slot failed.** The operator gets both the report and a failed run. Every child runs to its
own terminal state either way (`:2085`). There is no early stop in either join.

**C10. "`archon workflow runs` shows the tree" — verify via JSON.** The docs say `parent_run_id`
"makes the run tree visible in `archon workflow runs`" (workflow-language.md, "Gates, failure, and cost"), but the
human table format isn't specified. Acceptance evidence is `workflow runs --json` (children
carry `parent_run_id`) plus `workflow get <childId> --json` (`total_cost_usd`). Record what the
human view actually shows. Don't claim a tree you didn't see.

**C11. Bash routes record their own cost or say they can't.** Provider nodes report `cost_usd`.
Bash nodes report nothing to the engine. Hermes has `--usage-file PATH` ("written even when the
run fails"), so the route writes `$ARTIFACTS_DIR/hermes-usage.json`. Grok's
`--output-format json` may carry usage. WS0 checks this (Task 0.3), and if it doesn't, the
report says "cost: not reported" rather than implying zero. Claude's `cost_usd` under a
subscription is **API-equivalent dollars, not quota**. Record it as such.

### Documentation & References

```yaml
# MUST READ (in-repo). [R-14] guides/authoring-workflows.md NO LONGER EXISTS on either build;
# its content lives in reference/workflow-language.md. Cite SECTION NAMES (they survive
# refactors); line numbers below are dev @ 2aabbd0ca and are hints only.
- file: packages/docs-web/src/content/docs/reference/workflow-language.md
  sections:
    - '"`trigger_rule` Values" (~322) — none_failed_min_one_success admits condition-skips, blocks upstream_failed'
    - '"`when:` Condition Syntax" (~391) — whole-AI-output compare rejected at load; fielded ref OK; reference error fails the node'
    - '"`$node_id.output` Substitution" (~509) — ASSIGN, THEN QUOTE THE VARIABLE (R-9); spill >32,768 chars'
    - '"`output_format` for Structured JSON" (~586) — validated for every provider; Pi/Copilot reask x3 then FAIL'
    - '"`allowed_tools` and `denied_tools`" (~647) — Claude/Pi/Copilot only; Pi [] ≠ no extension tools (R-16)'
    - '"Reading across a skipped branch" (~1212) — bindings carry VALUES; a skipped producer FAILS a with: binding unless if_skipped'
    - '"Composing Another Workflow with `include:`" (~1760) — <includeId>__<node> namespacing; run-owned fields dropped'
    - '"Workflow Signature: `inputs:`, `returns:`" (~1978)'
    - '"Launching a Separate Governed Run with `workflow:`" (~2384) — gates, failure (no retry:), cost roll-up'
    - '"Running sub-runs side by side" (~2582) — path lock; same-fan_out children excluded (R-7)'
    - '"Fanning out over a list with `fan_out:`" (~2643) — four fields, join semantics, archon_failed slots, fan_out_outcome, children that pause (R-10)'
    - '"Result contracts" (~3043)'
    - '"Provider Validation" (~3349) — literal model strings NOT checked at load (R-15)'
- file: packages/docs-web/src/content/docs/reference/cli.md
  sections:
    - '"`workflow run <name> [message]`" (~287) — --model, --no-worktree, --stubs*, --exec-code, execution handoff'
    - '"Deterministic dry-run" (~448) — strict stub coverage; fan-out array stubs on dev only (R-8)'
    - '"`workflow test`" (~196) — fixture keys; exec-code runs in a scratch worktree of HEAD'
    - '"`workflow runs`" (~625) / "`workflow get`" (~694) — --json --verbose; usage under metadata'
- file: packages/docs-web/src/content/docs/reference/variables.md
  why: '$ARGUMENTS reaches bash/script as an ENV VAR, never spliced: read it as "$ARGUMENTS"'
- file: packages/docs-web/src/content/docs/guides/script-nodes.md
  why: "inline vs named; `runtime: bun` inline = `bun --no-env-file -e '<code>'` (argv-bound, see C5)"
- file: packages/docs-web/src/content/docs/guides/global-workflows.md
  why: '~/.archon/workflows/<folder>/ discovery (1 level); repo overrides global by filename (C3)'
- file: packages/workflows/src/fixture-runner.ts
  why: 'module doc = fixture format; workflowNamesBeside() = sibling matching (C4); global + bundled scopes discovered'
- file: packages/workflows/src/dry-run/nodes/workflow.ts
  why: 'simulateChildRunNode(): workflow: nodes fail in dry-run on c97ad9522; dev accepts fan-out array stubs (C2/R-8)'
- file: packages/workflows/src/output-ref.ts + packages/workflows/src/dag/references.ts (wholeNodeOutputRef)
  why: "whole-text `$skipped.output` in a bash/prompt body → '' (lenient, except until_bash); fielded ref to skipped/failed → THROW; whole-text ref to FAILED → THROW"
- file: packages/workflows/src/dag/run-terminal.ts
  why: "a child's result = its `returns:` node (#2470)"
- file: .archon/workflow-language-constitution.md
  why: 'case-law rows for workflow:/fan_out:/returns:; "The independence rule" (join judgement belongs downstream — C9)'
- file: .archon/direction.md
  why: "§community-plugins: OpenCode is a bundled community provider (correctness fixes only); §governed-launch-ownership is HERE (line ~104), not in the constitution"

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
G1  [R-9] ASSIGN, THEN QUOTE THE VARIABLE. A node-output reference is only ever the whole
    value of an assignment: `answer=$claude-opus.output`, then use "$answer". Never
    `answer="$claude-opus.output"` (embeds literal single quotes) and never a bare
    `printf '%s' $x.output` (word-splits once the value spills past 32 KB; `validate workflows`
    warns). $ARGUMENTS is the OPPOSITE: it's an env var, so "$ARGUMENTS" (double-quoted) is correct
    (variables.md).

G2  A whole-text ref to a SKIPPED node resolves to '' (output-ref.ts module doc). That's what lets
    `collect` reference all five branches. A FIELDED ref to a skipped node THROWS — so `collect`
    references branches whole-text only, and the router via `$pick.output.agent` (it always runs).

G3  `when:` comparing a whole AI output to a literal is a LOAD ERROR. Compare the FIELD:
    `$pick.output.agent == 'x'`. Unparseable `when:` → fail-closed skip WITH A WARNING. So a typo
    in a branch's enum literal means that route silently never runs. The per-route fixtures (Task
    1.3) are what catch this. Keep the enum list, the five `when:` literals and the `case` arms in
    `collect` letter-identical; the fixtures enforce it.

G4  --exec-code runs a REACHABLE bash node that has NO stub (cli.md, "Deterministic dry-run"). An unstubbed,
    wrongly reached hermes-free/grok-web branch in a fixture would call the real CLI. Every
    route-task fixture therefore stubs BOTH bash branches (sentinel text "FIXTURE-SENTINEL: must
    not be reached"). Unused stubs are a warning, not a failure (`unusedStubs` in the fixture result), and
    the Task 1.4 trace check catches a sentinel that shows up.

G5  output_format on Pi (the `small` tier) is BEST-EFFORT: validate + reask x3, then the node FAILS.
    Loud, not silently wrong. A schema-VALID wrong choice, though, is silent. That's why WS0
    measures agreement, not just schema success.

G6  [R-16] `allowed_tools: []` disables built-in tools on Claude, Pi and Copilot only. OpenCode
    does not enforce it (hence the prompt-level "do not edit" on opencode-free). On Pi it does
    NOT remove user Pi extension tools. Absent ≠ [].

G7  A `workflow:` node rejects `retry:` and `output_format:` at load. Fan-out `items` must resolve
    to a JSON ARRAY from an upstream dependency, or the node fails before any child exists.

G8  [R-10] A gate inside a fan-out child PAUSES that child and the parent, and holds its
    max_parallel slot ("Children that pause"). With max_parallel: 1 an unattended orchestrate run
    would then stall until someone answers. archon-route-task must never gain an approval:/wait:
    node.

G9  A `node timeout:` didn't kill an orphaned hermes.exe (prototype, 2026-10-21). `timeout N` from
    Git Bash coreutils (/usr/bin/timeout 8.32) signals the direct child. Hermes is a venv launcher
    (Scripts\hermes.exe → python.exe), so a grandchild may still survive. Task 0.4 tests this. If
    orphans survive, record it in PROJECTS.md. There's no YAML fix.

G10 Grok in --permission-mode plan still EXPLORES THE REPO (>100s). For the web route, start it in an
    EMPTY cwd (`--cwd "$ARTIFACTS_DIR/grok-cwd"`) with a bounded `--max-turns`. It can't explore
    what isn't there. (Measured O2: grok still found the repo despite the empty cwd. The empty cwd
    is a speed measure, not a boundary.) Hermes: **[R-3] `-t web`, NOT `-t ""`.** `-t ""` leaves
    Hermes its FULL toolset (terminal, write_file, patch, execute_code, computer_use; D9), and
    `-t web` gives exactly web_search/open_page/open_page_with_find/web_extract. Also
    `--ignore-rules` (don't inject this repo's AGENTS.md), and run it from an empty cwd.

G11 OpenCode: Archon's SDK (@opencode-ai/sdk ^1.17.3, packages/providers/package.json:38) waits for
    `opencode server listening`; CLI v2.0.32 prints `server listening on …`. The PATH pin to
    v1.19.3 is the ONLY working start path. Launch every run with
    PATH="$HOME/.archon/opencode-v1/node_modules/.bin:$PATH". Do NOT change the global PATH (it
    would shadow the user's v2), and do NOT edit packages/providers (C1).

G12 `include:` drops the block's workflow-level `mutates_checkout`/`interactive`/`worktree` with a
    load warning (workflow-language.md, "What travels, and what belongs to the run"). Don't declare them on archon-route-pick.

G13 Running from the repo: use `bun run cli …` in C:\Users\karam\archon (the checkout's code).
    [R-1] That code is c97ad9522 (v0.11.1) on wip/workspace-2026-10-24, NOT dev; ~/.bun/bin/archon
    is the same build (verified 2026-11-14). [R-12] Every `workflow run` needs
    `--project coleam00/Archon` on this machine (D4: "already registered … a different clone").
    If imports fail, `bun install --frozen-lockfile` (D3, ~13 min).

G14 [R-4] .hermes.md, .serena/, HANDOFF*.md, INITIAL.md, this PRP, the INITIAL and the
    experimental workflows are all TRACKED on the wip branch (c97ad9522). Never `git add`, never
    commit, never `git clean`, never switch branches. This PRP changes the repo's working tree
    only by: the prototype move (one ` D`), the PRPs/ flip and the INITIAL's retirement (Task 3.2).
    Both of those show as tracked renames. Leave them uncommitted for the operator.

G15 Bash nodes run under Git Bash on Windows (resolveBashPath, now in dag/nodes/exec/bash.ts). `jq` is NOT
    installed. `bun` IS on PATH (/c/Users/karam/.bun/bin/bun 1.3.14). JSON in bash nodes goes
    through `bun -e` with file-path arguments, never with data spliced into the code (C5).
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
| Chosen agent errors / times out (exit 124)          | that node fails → `collect` skipped (`none_failed…` blocks upstream failures) → child fails → same as above                               |
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
      - hermes-free: free model with web search only; it cannot read files or this
        repository. Short, self-contained text work: rewrite, summarise, draft, simple
        factual Q&A, arithmetic.
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
  cost only in the artifacts they write): hermes-free (web search only, -t web),
  grok-web

  opencode-free needs the pinned 1.x CLI first on PATH:
    PATH="$HOME/.archon/opencode-v1/node_modules/.bin:$PATH"
  The chosen agent may edit the checkout (claude-sonnet code changes), so this
  workflow does NOT declare mutates_checkout: false. Never add an approval: node;
  archon-orchestrate fans this out, and a gate inside a fan-out fails it.

  Usage: archon workflow run archon-route-task --no-worktree "<task>"
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
      # [R-3] -t web = web tools ONLY. `-t ""` would leave Hermes its FULL toolset (terminal,
      # write_file, patch, ...): measured, D9. --ignore-rules = don't inject AGENTS.md (G10).
      # Empty cwd: even a tool regression can't reach the checkout through a relative path.
      mkdir -p "$ARTIFACTS_DIR/hermes-cwd"
      cd "$ARTIFACTS_DIR/hermes-cwd"
      timeout 600 hermes -z "$(cat "$ARTIFACTS_DIR/task.txt")" -t web --ignore-rules \
        --usage-file "$ARTIFACTS_DIR/hermes-usage.json" 2> "$ARTIFACTS_DIR/hermes.stderr.log"
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
      timeout 600 grok --permission-mode plan --cwd "$ARTIFACTS_DIR/grok-cwd" --max-turns 10 \
        --prompt-file "$ARTIFACTS_DIR/grok-prompt.txt" 2> "$ARTIFACTS_DIR/grok.stderr.log"
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
    # producer, not by max_parallel (workflow-language.md, "`max_parallel` bounds concurrency, not count").
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
      # [R-9] Assign, then quote: the bare form word-splits once a value spills past 32 KB.
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

> [R-11] Verified 2026-11-14 on Bun 1.3.14: `bun -e '…' a b c` gives
> `process.argv = ["…\\bun.exe","a","b","c"]`, so `slice(1)` is correct. Re-check only if
> `bun --version` changes.

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
# Dry-run never executes a workflow: node (dry-run/nodes/workflow.ts, on c97ad9522), so this fixture proves the
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

**[R-8] Dev-only (engine ≥ v0.14, i.e. only if P3 moved off c97ad9522).** Here a fan-out takes an
authored array stub, one result per item, so `report` is fixture-tested and `plans-three` stops
expecting a failure at `run-each`:

```yaml
# orchestrate/fixtures/plans-three.stubs.yaml (dev)
plan:
  subtasks: ['stub subtask one', 'stub subtask two', 'stub subtask three']
run-each: ['### a: governed\n\nanswer one', '### b: governed\n\nanswer two', '### c: governed\n\nanswer three']
fixture:
  expect: completed
  reached: [plan, bound, run-each, report]
  resolved-text-contains:
    report: 'answer three'
exec-code: true
---
# orchestrate/fixtures/one-child-failed.stubs.yaml (dev): A4's path, with no spend
plan:
  subtasks: ['stub one', 'stub two']
run-each:
  - 'answer one'
  - { archon_failed: true, error: 'stub: provider rejected model', status: failed }
fixture:
  expect: failed
  fail-node: report
  reached: [plan, bound, run-each]
exec-code: true
```

(These are two files. The `---` above only separates them on this page.)

### Tasks, in order. **STOP** lines are hard gates.

```yaml
# ─────────────── WORKSTREAM 0 — measure (read-only; nothing under workflows/route-task or orchestrate yet)
Task 0.0  RESUME, don't restart. [R-2] WS0 ran 2026-10-22..27 and stopped partway.
  - FIRST read ~/.archon/measure/ws0/notes.md (D1–D12) and grades.md. Copy D1–D12 into the
    appendix's "Divergences". Do NOT redo any task below that already has a result on disk.
  - CHECK the operator preconditions P1–P4 (top of this file). If P1 (stale run 20bcbe0e) or P2
    (corpus approval) is not done, STOP and ask. Never abandon a run yourself.
  - Fresh git baseline [R-4]: `git status --short > ~/.archon/measure/ws0/git-status-before.2026-11.txt`
    (the 10-22 file is stale: HEAD moved to c97ad9522, D2). Expected: clean.
  - `config.yaml.before` already exists (taken 10-22). Diff it against today's
    ~/.archon/config.yaml. If they differ, take a new copy and record why.
  - `archon --version` and `bun run cli --version` → both should say c97ad9522 (G13). If the
    operator chose P3 = dev, they say otherwise; then use the dev-only fixtures (R-8).
  - NO `bun run validate` baseline [R-5]. A6 no longer uses it.
  ALREADY DONE (verify the files exist, then skip): 0.1 (cli-help/), 0.2 (route-pick created,
  validated), 0.3 (corpus.md + tasks/*.txt).
  ONE EDIT before 0.6 [R-3]: in ~/.archon/workflows/route-pick/archon-route-pick.yaml, replace
  the hermes-free line with the corrected text in this PRP ("web search only…"). It is a
  factual correction, not route tuning. Re-run `validate workflows archon-route-pick`.

Task 0.1  CAPTURE CLI FACTS (DONE 10-22; add only: the Pi extensions loaded for the router's
  `small` tier, from Pi's settings. allowed_tools: [] does not remove them, R-16):
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

Task 0.4  AGENT HARNESS → ws0/measure-agent.sh <agent> <task-id>. (EXISTS. It already uses
  `-t web` for hermes and empty cwds. Free columns DONE, see out/*.progress.log. Remaining:
  claude-opus, claude-sonnet (both need P2), opencode-xai (needs P4), and the three probes.)
  Every agent runs READ-ONLY:
    claude-opus    claude -p --model claude-opus-5   --permission-mode plan --output-format json
    claude-sonnet  claude -p --model claude-sonnet-5 --permission-mode plan --output-format json
    opencode-free  <v1 opencode> run -m opencode/big-pickle --agent plan --format json
    opencode-xai   <v1 opencode> run -m <an xai/grok model from 0.1> --agent plan --format json   (grok-route alternative; record auth failure if it fails)
    hermes-free    hermes -z <task> -t web --ignore-rules --usage-file out/…/usage.json   [R-3; run from an empty cwd]
    grok-web       grok --permission-mode plan --cwd <empty tmp> --max-turns 10 --output-format json --prompt-file …
  Each run writes out/<agent>/<task>.txt (answer), .meta (exit code, wall seconds, cost or "not
  reported", bytes). Wrap every call in `timeout 600`. NEVER log credentials or env.
  Extra probes (run once each):
    - Orphans (G9): `timeout 5 hermes -z "<long essay prompt>" -t web`, from an empty cwd
      (never `-t ""`: full tools, R-3), then `tasklist | grep -i -E 'hermes|python'` → record
      survivors. Kill only PIDs this probe started (AGENTS.md: never kill by name).
    - OpenCode start reliability: 10 sequential runs of `bun run cli workflow run
      e2e-opencode-smoke --no-worktree --project coleam00/Archon` with the PATH pin → record N/10
      started. (Needs P1. SDK is ^1.18.34 on dev, so don't assume G11 still holds there, R-18.)
    - Grok JSON: does --output-format json carry usage/cost? (C11) → record the field names.
  SPEND CAP: stop when Claude `total_cost_usd` (API-equivalent) summed over WS0 reaches $8.
  Report what's done and ask before continuing.

Task 0.5  RUN 10 tasks × 6 columns (5 routes + opencode-xai). Grade each output: pass / fail,
  with a one-line reason (on-task? correct? complete?). Grade against the task, not the agent's
  confidence. Flag every grade you are unsure of; the operator spot-checks those.
  RESUME: grades.md has 3 of 6 columns graded. The hermes-free (-t web) column is all "pending".
  Note that out/hermes-free/ has .raw but no .txt for most tasks: run ws0/extract.ts first, as
  for the other columns. The "hermes (full tools, kept)" column is NOT the route's config. Don't
  use it for the verdict (R-3). Record each hermes run's model/provider from usage.json (D10).

Task 0.6  ROUTER RUN (needs P1): for each task, twice:
    `bun run cli workflow run archon-route-pick --no-worktree --project coleam00/Archon "<task>"`                                   (free small)
    `bun run cli workflow run archon-route-pick --no-worktree --project coleam00/Archon --model small=claude/claude-haiku-4-5 "<task>"`
  Record chosen agent, schema failure (node failed), wall time. 40 calls total.

Task 0.7  VERDICT. Fill in the appendix with these rules, applied mechanically:
  ROUTE TABLE — best agent per task = the cheapest-first agent (hermes < opencode < grok <
    sonnet < opus) that PASSED. Rewrite each route's description in archon-route-pick to the
    scope its wins support. A route that won 0 tasks AND has no capability the others lack →
    drop it (remove from the enum, the when: branch, the collect arm and the fixtures,
    in the same edit).
  GROK [R-6] — ROUTE TABLE is applied first and wins. A column that could not run (auth,
    install) is NOT MEASURED, not "failed", and a not-measured column never justifies keeping a
    route. So: if grok-web won 0 tasks (as of 10-27, hermes and opencode-free passed both web
    tasks), drop it. Otherwise, if opencode-xai was measured (P4) and passed the same web tasks,
    replace the grok-web branch with a governed OpenCode node on that xai model. Otherwise keep
    grok-web.
  OPENCODE — keep the route iff the smoke started ≥ 9/10 AND it won ≥ 1 task. The deprecation
    banner printed by c97ad9522 is not evidence either way (reversed on dev by #5232, R-18).
  ROUTER MODEL — free `small` is ADOPTED iff, over both of its passes: 0 schema failures, AND 0
    under-routes (a task whose best agent is claude-* sent to a free agent), AND ≥ 8/10 agreement
    with the best agent in each pass. Else apply the same test to haiku. If haiku passes, pin the
    route node (C7). If neither passes → STOP and report; WS1 does not start.
  ──── STOP if any rule produced an ambiguous result (a tie, an ungradeable output, the spend
       cap hit). Otherwise continue. ────

# ─────────────── WORKSTREAM 1 — harden single-task routing
Task 1.0  MOVE the prototype: `mkdir -p ~/.archon/prototypes/2026-10-21 && mv
  C:/Users/karam/archon/.archon/workflows/experimental/archon-route-task.yaml
  ~/.archon/prototypes/2026-10-21/` (C3). [R-4] The file is TRACKED. Confirm `git status --short`
  shows exactly one new line, ` D .archon/workflows/experimental/archon-route-task.yaml`, and
  nothing else. Do not commit and do not `git rm`.

Task 1.1  APPLY the WS0 verdict to archon-route-pick.yaml (route text, router pin if any).

Task 1.2  CREATE archon-route-task.yaml as drafted, minus any route WS0 dropped. Keep the enum,
  the `when:` literals and the collect arms letter-identical (G3).
  `bun run cli validate workflows archon-route-task` → pass, no warnings about unknown keys.

Task 1.3  FIXTURES: `bun run cli workflow run archon-route-task --dry-run --stubs-init
  "$TMP/scaffold.yaml"` (into the scratchpad, not the fixtures dir) and read the real stub key for
  the included route node. Then write one fixture per surviving route plus chosen-empty, as in
  "Fixture shapes".
  `bun run cli workflow test archon-route-task` → all pass.

Task 1.4  SKIP PROOF (A2's dry half): for each route fixture, run
  `bun run cli workflow run archon-route-task --dry-run --stubs <fixture> --exec-code --json`
  and check with a scratchpad bun script that: exactly ONE agent node is non-skipped; each skipped
  agent node's reason is the `when:` condition, not an upstream failure [R-13a]; the unchosen bash
  branches' stubs are listed in `unusedStubs` (proof they were never reached); and no node's output
  contains "FIXTURE-SENTINEL". Not committed: it's the evidence for G3/G4. (These fixtures stub
  `pick__route`, so they prove the wiring, not the router's judgement. Only WS0 proves that, R-13c.)

Task 1.5  LIVE (A2): one real run per surviving route, using that route's corpus task (or a new
  task that clearly belongs to it), with the PATH pin and `--project coleam00/Archon`. For each:
  `workflow get <id> --json --verbose` → one agent node completed, the others skipped WITH A
  CONDITION SKIP CAUSE [R-13a], answer non-empty and on-task (read it: a bash route can exit 0
  and print an error message, R-13b). For hermes, record usage.json's model/provider. Record run
  ids + cost in the appendix. If a run picks a different route than expected, that is a router
  finding: record it, then give that route one more task. Do not edit the router to force a pick.
  ──── STOP if any live run failed for a reason other than a deliberate test. ────

# ─────────────── WORKSTREAM 2 — subtask orchestration
Task 2.1  CREATE archon-orchestrate.yaml as drafted. (The bun -e argv index is already verified,
  R-11.) `bun run cli validate workflows archon-orchestrate` → pass with NO warnings about bare or
  quoted output references (R-9).
  If the loader rejects `with:` on an inline `script:` node, switch `bound` to a bash node that
  writes `$plan.output` to a file and runs `bun -e` over the file path. Record that divergence.

Task 2.2  FIXTURES: plans-three / plans-none / plans-too-many. `bun run cli workflow test
  archon-orchestrate` → all pass (two fail at bound; plans-three fails at run-each, which
  is expected per C2). If the engine is ≥ v0.14 (P3 = dev), use the dev-only plans-three and
  one-child-failed fixtures instead (R-8).

Task 2.3  LIVE (A3): a job with ≥ 3 genuinely separable parts, read-only and cheap. Example:
  "In this repo: (1) summarise what packages/workflows/src/fixture-runner.ts does in 5 bullets;
  (2) list the bundled default workflows and one line on each; (3) what is the latest stable Bun
  release and its headline change". Run with --no-worktree, `--project coleam00/Archon` and the
  PATH pin. Then `bun run cli workflow runs --json --limit 10` → children carry parent_run_id =
  parent; `workflow get <child> --json` per child → the recorded cost under `metadata` (quote the
  exact key; absent for bash-only routes, say so). If `workflow get <parent> --json --verbose`
  shows the run-each node's `fan_out_outcome` slots, quote them as the engine's own record of
  the N children.
  Record what the HUMAN `workflow runs` view shows (C10).

Task 2.4  CHECK the report: one section per subtask, in item order, each with the child's header.

Task 2.5  BROKEN ROUTE (A4) — temporary, reverted in the same task:
  copy archon-route-task.yaml → archon-route-task.yaml.bak. [R-15] Pick a Task 1.5 task and
  the route the router ACTUALLY chose for it (with hermes passing most tasks, that is probably
  not claude-sonnet), and break THAT route deterministically at runtime:
    - provider route: set its `model:` to `claude-nonexistent-model` (or an unknown opencode
      model). Literal model strings are not checked at load, so it fails at the node, at request
      time ("Provider Validation").
    - bash route: make the first body line `echo "A4: deliberate failure" >&2; exit 3`.
  Run archon-orchestrate on a one-subtask job made of that task. Expect: the child fails at that
  node with its own error, collect is skipped as upstream-failed, and NO other agent node in that
  child ran. run-each completes with a failed slot. report prints "FAILED (failed): <original
  error>", writes it to stderr, and the parent fails. Quote the error verbatim. If the router
  picks a different route this time, record it and break that one instead. Restore from .bak,
  delete .bak, re-run `workflow test archon-route-task` → pass.

# ─────────────── CLOSE
Task 3.1  A6 [R-5]: `bun run cli validate workflows archon-route-pick|archon-route-task|
  archon-orchestrate` → pass, no warnings; `bun run cli workflow test archon-route-task` and
  `… archon-orchestrate` → pass; `git status --short` → identical to git-status-before.2026-11.txt
  except the one ` D` for the moved prototype. (Task 3.2's renames come after this check.)
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
bun run cli validate workflows archon-orchestrate
bun run cli workflow test archon-route-task      # every route fixture + chosen-empty pass
bun run cli workflow test archon-orchestrate     # plans-three (fails at run-each by design), none, too-many
# Task 1.4 skip proof: exactly one non-skipped agent node per route fixture, no sentinel in any output
```

### Level 2: Router measurement (cheap spend, Task 0.6)

`archon-route-pick` alone, 10 tasks × 2 models × 2 passes. Pass = the Task 0.7 router rule.

### Level 3: Live routing (Tasks 1.5, 2.3, 2.5)

One run per route (A2), one orchestrated job with ≥ 3 children (A3), one deliberately broken
route (A4). Evidence is `workflow get … --json --verbose` output, quoted in the execution report,
not a summary of it.

### Level 4: Repo gate (Task 3.1)

[R-5] Not `bun run validate`. A6 = Level 1 clean (validate workflows + workflow test) plus the
`git status` comparison in Task 3.1.

## Final Validation Checklist

- [ ] A1: appendix table complete. Route table and router model verdicts recorded.
- [ ] A2: one live run per surviving route; one agent node completed, others skipped.
- [ ] A3: ≥ 3 child runs with parent_run_id and per-child total_cost_usd (or "not reported" for bash routes).
- [ ] A4: broken route fails child + parent with the original error; no second agent ran; route restored.
- [ ] A5: `workflow test` passes for both workflows; route-task fixtures cover every route.
- [ ] A6: Level 1 clean; `git status` equals the 2026-11 baseline except one ` D` (moved prototype).
- [ ] P1–P4 settled by the operator, and recorded in the appendix (who decided, and when).
- [ ] hermes-free uses `-t web` in the YAML and in every WS0 measurement used for the verdict (R-3).
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

> **WS0 result (2026-11-15, partial apply):** full tables in `C:\Users\karam\.archon\measure\ws0\results.md`.
> Route table: drop grok-web, drop claude-opus (confirm: corpus can't tell sonnet from opus); keep hermes-free (6 wins),
> opencode-free (3; smoke 9/10), claude-sonnet (1). Router: free small 7/10 and 6/10 agreement, haiku 5/10 and 5/10,
> 0 schema failures, 0 under-routes -> both FAIL the 8/10 rule -> **STOP, WS1 not started.** Blocker D13: a per-user tier
> override maps small/medium/large to opencode/xai/grok-4.7 (dead OAuth). Spend ~$5.96 API-eq, 32 Claude calls.

### Corpus (operator-approved on: 2026-11-14)

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
