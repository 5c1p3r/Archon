# INITIAL — One orchestrator that sends each piece of work to the right agent

Written 2026-10-21. Born `0-` (not yet applied). The repo root already holds an older
`INITIAL.md` (cost-tier routing, applied by `PRPs/1-archon-cost-tier-omniroute.md`); this file
does not replace it. Prototypes this builds on: `.archon/workflows/experimental/archon-route-task.yaml`
and `archon-ask-all-agents.yaml`, `archon-multi-agent-pr-review.yaml` (all untracked, all
built 2026-10-21 without a PRP — see OTHER CONSIDERATIONS).

## FEATURE:

**Problem.** The operator runs five agents — Claude Code, Hermes, Antigravity (`agy`), Grok,
OpenCode — and wants a single entry point that gives each piece of a job to the agent best
suited to it, instead of every agent repeating the same work or the operator picking by hand.

**Why it is worth solving.** The binding budget is the weekly Claude subscription quota (see
the cost-tier INITIAL: a cheaper token price inside a quota that is not denominated in tokens
saves nothing). Work that does not need Claude should not draw on it, and work that does
should not be degraded to save money.

**Why now.** On 2026-10-21 four of the five agents were verified to answer headlessly from
inside one Archon workflow, and a single-task router (`archon-route-task`) was shown to pick
different agents for different tasks. What is missing is everything that makes that
trustworthy: no measurement behind the routes, no way to split a larger job, and two agents
reachable only as ungoverned shell steps.

**Desired outcome.** `archon workflow run archon-orchestrate "<job>"` where a planning node
splits the job into subtasks, each subtask is routed to exactly one agent, results come back
as one report, and the run records which agent did what and what it cost.

**Scope — three workstreams, in this order. Do not start N+1 before N has a verdict.**

0. **Measure first (read-only).** Before the route table is trusted, run a fixed corpus of
   ~10 real tasks through each reachable agent and record wall time, output, and cost or
   quota used. The corpus is operator-supplied; if none is supplied, derive it from recent
   closed PR/issue titles in this repo and say so. Output is a table in the PRP's
   appendix, not code in the engine. The current route table in `archon-route-task.yaml` is
   a hypothesis from one-off observations (Claude ~25s, Hermes ~40s+ and slow on 20KB prompts,
   Grok >100s because it explores the repo, OpenCode flaky to start) and must be confirmed
   or replaced by this table.
1. **Harden single-task routing.** Promote `archon-route-task` from experimental: fix the
   known defects below, keep the router a typed `output_format` enum gated by `when:`.
2. **Subtask orchestration.** A planner node emits an array of subtasks (`output_format`);
   `workflow:` + `fan_out:` runs one child per subtask, and the child is the single-task
   router. Each child is its own governed run record with its own cost line.

**Already-settled constraints (do not relitigate).** The cost-tier INITIAL records a sign-off
that an _engine-level_ router is dropped, because it would override authored node tiers and
fails the Workflow Language Constitution. The sanctioned form of a per-task decision is a
node that computes the choice plus `when:` on its structured output — which is what the
prototype is. This feature therefore adds **no new engine field, no new `when:` operator, no
provider**. It is workflow YAML and, if needed, a script node.

**Invariants that must hold.**

- Exactly one agent runs per subtask. No fan-out of the same task to all agents (the
  anti-goal the operator stated). `archon-ask-all-agents` stays a separate, explicit tool.
- Routing is a typed value from the agent, validated by `output_format`; no regex or keyword
  parsing of prose anywhere (AGENTS.md "Natural language is not a wire format").
- A failed route fails loudly with the original evidence. No silent fallback to a different
  or more expensive agent (AGENTS.md "Fail clearly").
- Existing tier semantics are untouched: nodes that declare `model: small|medium|large` keep
  their authored meaning; the router never overrides a declared tier.
- Hermes and Grok work is labelled as ungoverned in the run output (no Archon session,
  approval, or audit), not presented as if it were provider-governed.
- No credentials or message contents are logged.

**Acceptance.**

1. Workstream 0 table exists, with the route table either confirmed or revised from it.
2. For 5 distinct tasks (one per route), the run's node list shows exactly one agent node
   executed and the other routes `Skipped`, and each answer is non-empty and on-task.
3. For one job that the planner splits into ≥3 subtasks, each subtask runs as a child run
   routed independently, and `archon workflow runs` shows the parent/child tree with per-child cost.
4. A deliberately broken route (e.g. a nonexistent model) fails the child and the parent
   with the original error; nothing silently re-runs elsewhere.
5. `archon workflow run ... --dry-run --stubs` exercises the routing branches with no
   provider spend, and is part of the committed validation.
6. `bun run validate` passes (it runs the `workflow-fixtures` check over the repo's workflows).

**Solution steering (optional, stated because it is a real preference).** Reuse the existing
sub-run and `fan_out:` mechanism rather than inventing scheduling. Prefer the existing
`small` tier (already bound to a free OmniRoute model via Pi in `~/.archon/config.yaml`) as
the router's own model if its schema reliability is adequate; the prototype uses
`claude-haiku-4-5` because `output_format` is SDK-enforced on Claude but only best-effort on
Pi, so measure before switching.

## EXAMPLES:

No `examples/` code needs copying; everything to mirror is in-tree. Cite by path.

- **`.archon/workflows/experimental/archon-route-task.yaml`** — the prototype to promote.
  Mirror: the `route` node's `output_format` enum + five `when:`-gated branches. Do NOT copy:
  the hand-written route list in the router prompt as the source of truth (it should come
  from Workstream 0), or the `bash:` agent nodes' lack of failure markers.
- **`.archon/workflows/experimental/archon-multi-agent-pr-review.yaml`** — mirror: the
  packet-in-a-file pattern (`$ARTIFACTS_DIR/packet.md`) for passing large input to bash
  agents, and the `timeout 600` wrapper. Do NOT copy: fanning every agent out over the same
  input, which is the pattern this feature exists to avoid.
- **`packages/docs-web/src/content/docs/guides/authoring-workflows.md`** — `workflow:` +
  `fan_out:` (sections "Launching a Separate Governed Run with `workflow:`" and "The four
  fields"), `output_format`, and `when:` syntax. Read before writing the planner/child wiring.
- **`.archon/workflows/defaults/`** — bundled workflows that already branch on a classify
  node's `output_format` field (`legacy/archon-fix-github-issue.yaml:143`, `when: "$classify.output.issue_type == 'bug'"`). Mirror the shape.
- **`PRPs/1-archon-cost-tier-omniroute.md` and root `INITIAL.md`** — mirror the
  measured-facts-first structure and the explicit "what NOT to build and why" section.

## DOCUMENTATION:

- Workflow language constitution (admissibility test, case law for `workflow:` sub-runs and
  `fan_out:`, why `when:` stays tiny): `.archon/workflow-language-constitution.md`
- Authoring guide: `packages/docs-web/src/content/docs/guides/authoring-workflows.md`
  (`when:` syntax; `output_format` — "SDK-enforced on Claude/Codex/OpenCode; best-effort on
  Pi/Copilot"; sub-run gates, failure, and cost roll-up)
- CLI reference incl. `--dry-run`, `--stubs`, `--model <tier>=<spec>`:
  `packages/docs-web/src/content/docs/reference/cli.md`
- Direction constraints on providers (no new bundled community provider before the external
  plugin contract exists): `.archon/direction.md` "Community plugins" section
- Agent CLIs, headless modes verified 2026-10-21: `hermes -z "<prompt>" [-t ""]
[--usage-file path]`; `grok -p "<prompt>"` / `grok --prompt-file <path>
--permission-mode plan [--output-format json]`; `opencode run --standalone -m <p/m>
--format json`; `opencode acp`, `hermes acp`, `grok agent stdio` exist but are unprobed.
  Capture exact current flags with `<cli> --help` at PRP time; these CLIs change quickly.

## OTHER CONSIDERATIONS:

**Known defects in the prototypes (each needs a fix or an explicit decision in the PRP):**

- **OpenCode cannot start through Archon with the installed CLI.** `@opencode-ai/sdk`
  (1.17.3, and latest 1.19.3) waits for a line starting `opencode server listening`; the
  installed v2.0.32 CLI prints `server listening on …`, so the 5s embedded-server start times
  out. Workaround in use: an isolated `opencode-ai@1.19.3` at `~/.archon/opencode-v1` plus
  `PATH="$HOME/.archon/opencode-v1/node_modules/.bin:$PATH"`. Even with it, startup failed
  three times when four agents launched concurrently. Decide: keep the pin, fix the provider,
  or drop the route. Per `direction.md`, only correctness fixes are allowed on a bundled
  community provider.
- **Grok and Hermes are agents, not model calls.** Grok in `--permission-mode plan` still
  explores the repo and exceeded 100s; Hermes returned nothing in 120s on a 20KB prompt. A
  node `timeout:` did not kill the child (an orphaned `hermes.exe` survived a timed-out
  node); wrap with `timeout N`. Both keep running unless the prompt says to judge only the
  input given.
- **A failed provider node fails the downstream node that splices its output** (engine rule:
  a failed producer's output is never trusted). Bash agent nodes work around it by exiting 0
  with a `REVIEWER FAILED` marker; Claude/OpenCode nodes cannot. Subtask children make this
  moot (a failed child fails its own run), but the parent's join behaviour must be chosen.
- A heredoc containing a substituted multi-line `$node.output` broke the bash node; pass bulk
  text through a file in `$ARTIFACTS_DIR`.

**Environment facts.** `agy` is **not installed** (Antigravity route is out of scope until it
is, and `ROADMAP.md` already says it needs install and verification). Hermes' primary model
on this machine is a free NVIDIA/OpenRouter model; Claude OAuth for Hermes bills "extra
usage", not plan quota (HANDOFF.md, 2026-08-29), so Hermes is a free-tier route, not a
Claude-quota route. Grok models are also reachable through OpenCode (`xai/grok-4.20-*` in
`opencode models`) and Pi (xAI in the vendor map) — decide whether the Grok CLI route is
needed at all once Workstream 0 shows what it adds.

**Process lessons from the prototypes.** They were built without INITIAL/PRP/prime
(feedback memory `prp-not-waived-by-speed`). Do not extend them in place before Workstream 0.
Branch from `dev`; do not commit to `dev`; the repo root has unrelated untracked files that
must not be swept into a commit.

**Open decisions for the operator (answer at sign-off):**

1. Is Workstream 0's corpus supplied by you, or derived from recent PR titles?
2. Keep Hermes and Grok as `bash:` routes (ungoverned, works now), or hold them until the
   external provider-plugin contract exists?
3. Router model: `claude-haiku-4-5` (reliable schema, spends Claude quota) vs the free `small`
   tier (zero quota, best-effort schema)?
4. Should Workstream 2 (subtask orchestration) be in this PRP, or a follow-up after
   Workstream 0–1 have run for a while?
