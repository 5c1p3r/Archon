> **APPLIED — 2026-08-16.** Consumed by `PRPs/1-archon-m15-system-wide-engine.md`, which was
> executed in full. Shipped artifacts verified on disk at retirement:
> `C:\Users\karam\.archon\projects.md` (9-row registry), `C:\Users\karam\sextant\archon_registry.py`,
> `C:\Users\karam\.archon\workflows\repo-build.yaml` (home-scoped generic build workflow), and
> sextant commits `68f340c` (registry-resolved dispatch + validation contract) and `2c545e0` (docs).
>
> **Where the shipped system diverged from this spec** — full list in the PRP's execution report;
> the load-bearing ones:
>
> - `fpv-aim-trainer` was promoted and then relocated to `C:\Users\karam\fpv-aim-trainer`; the
>   registry row and guard were re-verified against the new path.
> - `workflow run --detach --json` returns no `runId` (only `conversationId` + `logPath`) — the
>   run id must be recovered from the detached child's `workflow_starting` log event.
> - `workflow list --json` carries no per-workflow `source` field; only `GET /api/workflows` does.
>
> **Outstanding (human-only):** merge `5c1p3r/fpv-aim-trainer` PR #1; live phone check of
> `/projects`, a Class C refusal, and bare `/runs` in Telegram topic 133.
>
> Retired pile. Do not re-execute. Superseded by the root `INITIAL.md` (cost-tier routing).

# INITIAL — M1.5: Archon as the system-wide build engine

Follows `PRPs/1-archon-m1-migration.md` (M1, applied 2026-08-09), which proved Archon end to
end against exactly one repo. This closes the gap between "Archon builds sextant" and
"Archon is the build engine for my whole system."

## FEATURE:

Make Archon dispatchable at **any registered project on this machine**, with each project's
isolation guarantee declared and enforced up front rather than discovered mid-build.

The naive framing of this milestone is "add a repo argument to the Telegram handler." That
is about 20% of the work and it is not the part that matters. A survey of the machine on
2026-08-09 (every fact below re-measured, not recalled) found that **most of the system is
not shaped as independently buildable repos**, so generalizing dispatch without also
classifying targets would point an autonomous agent at the wrong directory with no worktree
safety net. Four workstreams:

**1. A project registry — the thing that does not exist anywhere today.**

Archon's own `remote_agent_codebases` table is **empty** (verified by direct SQLite read),
and the CLI has **no `codebase` subcommand at all** — `bun run cli codebase --help` falls
through to general help. Codebase registration exists only behind the REST API
(`POST /api/codebases`), which needs `archon serve` running: a persistent daemon, which is
the exact architecture M1 rejected (GOTCHA 0 — sextant's stateless scheduled-task model).

So the registry must be a **file**, parsed with stdlib, mirroring `settings/topics.md`'s
existing `field | field | field` convention. One row per project, carrying at minimum:
name, absolute path, isolation class, base branch. This file is the single source of truth
for "what can Archon build," and every dispatch surface (Telegram today, CLI or web later)
reads it.

**Location — DECIDED: `C:\Users\karam\.archon\projects.md`.** It belongs beside
`~/.archon/config.yaml`, `archon.db`, and `workspaces/` — Archon's own user-config home, per
Archon's documented split ("User config belongs in `~/.archon/config.yaml` (global) and
per-target-repo `.archon/`"). It is deliberately **not** in `~/.claude`: that is Claude Code's
config directory, and Archon is a separate program. It is deliberately **not** in the
`C:\Users\karam\Archon` checkout either — that tracks upstream `coleam00/Archon`.

The file is untracked, exactly like `~/.archon/config.yaml` and `archon.db` already are, and
that is acceptable: it is a five-line name→path mapping, trivially retyped. The part that
carries the safety property — _refusing_ to dispatch at an unsafe path — is **handler code in
sextant's git repo**, which is tracked, tested, and backed up. Do not conflate the two: the
guard is code, the mapping is local config.

**2. Isolation classes — declared, not inferred.**

Archon resolves `--cwd` to the enclosing **git repo root**. The machine's projects fall into
four classes with materially different safety properties, and the registry must record which:

| Class | Meaning                                | Members (measured 2026-08-09)                                                                                  | What Archon can do                                                                                                               |
| ----- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Own git repo + remote                  | `sextant` (`5c1p3r/Sextant`), `Personal_AI_Assistant`/Kent (`5c1p3r/Kern`), `Archon` (upstream)                | Full worktree isolation, PR nodes work                                                                                           |
| **B** | Own git repo, **no remote**            | `agent-core`                                                                                                   | Worktrees base off `origin/<base>` (M1 finding) — needs verification that this works at all with no origin; PR nodes cannot work |
| **C** | **Nested inside the `~/.claude` repo** | `close-read`, `fpv-aim-trainer`, `fpv-stick-trace`, `invoice-extract`, `micrograd-from-scratch`, `mistake-log` | `--cwd` resolves to `C:\Users\karam\.claude` — a build would worktree **the entire AI layer**                                    |
| **D** | Own repo, upstream read-only           | `cole-medin-knowledge-base`, `claude-code-ultimate-guide`                                                      | Reference corpora, not build targets                                                                                             |

Class C is the finding that reshapes this milestone. Those six directories have no `.git` of
their own; `git rev-parse --show-toplevel` from inside each returns `C:/Users/karam/.claude`,
whose remote is `claude-backup.git` and whose current branch is
`feat/builder-loop-cost-instrumentation`. Dispatching a build at `fpv-aim-trainer` today
would hand an autonomous agent a worktree containing every skill, hook, memory file, and
`settings.json` in `~/.claude` — and grant it write access to the harness that governs it.
**The registry must refuse Class C by default and say why**, not fail obscurely three nodes in.

**3. Generalize the dispatch surface.**

`handlers/archon.py:17` is `TARGET_REPO = Path(__file__).resolve().parents[1]`, commented
"sextant itself, for M1" — every `/run`, `/list`, `/status` is hardwired to sextant. Rework
the command surface to take an explicit project argument resolved through the registry:

- `/projects` — list the registry (name, class, base branch); the discoverability entry point
- `/list <project>` · `/run <project> <workflow> <message>` · `/status <project>`
- `/runs [project]` — omitted project uses `workflow runs --all` (the flag exists) for a
  cross-project view; that is the whole point of a system-wide engine
- `/get <run-id>` · `/approve <run-id> [text]` · `/reject <run-id> <reason>` — unchanged;
  run ids are already globally addressable from `--json` output

An unknown or unregistered project name must produce a usable error naming the valid
choices, never a silent fallback to sextant. Watch for `scopeFallback: true` in `--json`
output (M1 GOTCHA 11) — it means the cwd was not project-scoped and the result is a global
list; surface it, never present it as project-scoped.

**4. A generic build workflow, and a repo-declared validation contract.**

The only workflow today is `sextant/.archon/workflows/sextant-prd-build.yaml`, whose own
description reads _"NOT for: repos other than sextant"_ — its validate node hardcodes
`uv run python -m unittest discover tests` and its implement prompt recites sextant's
stdlib-only constitution. A one-repo workflow is not a build engine.

Author a **home-scoped** workflow at `~/.archon/workflows/` (Archon loads these for every
project; priority is bundled < global < project, and the directory **does not exist yet**).
Its validate node must not guess how to test an arbitrary repo — instead each project
declares its own validation as an executable the workflow calls by convention, failing loud
and early when it is absent rather than passing a build that ran no tests. This keeps the
YAML coordinating and the repo computing, per Archon's workflow-language constitution.
`sextant-prd-build.yaml` stays as the project-level override that beats the global one.

**Done when:** `/projects` lists every registered target from the phone; a `/run` against a
**non-sextant** Class A project completes in its own worktree and is validated by that
repo's own declared command; a `/run` against a Class C project is refused with a message
naming the reason; and `/runs` with no project shows work across every project at once.

## EXAMPLES:

Everything to mirror already exists in-tree — cite by path, do not invent conventions.

- **`C:\Users\karam\sextant\handlers\archon.py`** — the file being generalized. Preserve
  exactly: the `encoding="utf-8"` + `errors="replace"` kwargs on `subprocess.run` (line 46),
  the stderr-tail on non-zero exit (line 55), `TimeoutExpired` → message, the silent bail on
  a missing `message_thread_id` (line 108), `html.escape` before send (line 116), and the
  4096-char truncation (lines 117-118 — this exists because a real `/list` reply was 16,873
  chars and Telegram 400'd). **Change only** `TARGET_REPO`'s derivation and the command
  parsing. Do **not** turn `_archon()` into an import — the subprocess boundary is load-bearing.

- **`C:\Users\karam\sextant\tests\test_handler_archon.py`** (195 lines) — mirror its
  structure. `test_cwd_flag_targets_sextant` (line 47) asserts the hardcoded `--cwd` and
  **must be rewritten**, not deleted — its replacement asserts `--cwd` equals the _registry-
  resolved_ path. Keep `test_run_always_includes_detach_before_json` (line 58) verbatim;
  GOTCHA 3 has not changed. Patch `send_text_message` **on the handler module**.

- **`C:\Users\karam\sextant\settings\topics.md`** — the registry format to copy:
  a `# comment` header line then `field | field | field | field` rows. Currently one row:
  `133 | archon | handlers.archon | build`. The project registry should read the same way
  and be parsed by the same kind of stdlib split.

- **`C:\Users\karam\sextant\.archon\workflows\sextant-prd-build.yaml`** — the shape for the
  generic workflow: `implement` → `validate` (bash) → `mechanical-checks` (bash) →
  `create-pr` (last, so a `gh` failure never loses the validated branch). **Copy** the
  `mechanical-checks` forbidden-path gate almost verbatim — it is repo-agnostic already and
  is the deterministic half of builder-loop's `evaluate.py`. **Do not copy** the `implement`
  prompt (sextant-specific constitution) or the `validate` body (hardcoded `uv run python`).

- **`C:\Users\karam\Archon\.archon\workflows\defaults\archon-feature-development.yaml`** —
  the bundled analogue for a genuinely repo-agnostic flow. Read before authoring the global
  workflow. **Do not** model on `archon-plan-to-pr.yaml` (five parallel review agents, far
  more cost than this needs).

- **`C:\Users\karam\Archon\PRPs\initials\archon-m1-migration.md`** and
  **`PRPs\1-archon-m1-migration.md`** — the applied M1 pair. Its 15 gotchas were measured on
  this machine and most still bind. Read both before writing the PRP; do not re-derive.

- **`C:\Users\karam\.claude\claude-projects\archive\builder-loop\README.md`** — the retirement
  note records two patterns deliberately not ported: `evaluate.py`'s LLM-judge eval gate and
  `loop_pass.py`'s `taskkill /F /T` dead-man watchdog. The second is directly relevant here —
  more concurrent projects means more chances to orphan a headless child on Windows.

## DOCUMENTATION:

- In-repo authority (a `dev` checkout is ahead of the published site):
  - `C:\Users\karam\Archon\CLAUDE.md` — §CLI ("must run inside a git repository; subdirectories
    resolve to the repo root" — the Class C mechanism), §Home-scoped workflows (load priority
    and the `~/.archon/workflows/` path), §Database Schema (`codebases.kind` = `'repo'`/`'folder'`)
  - `C:\Users\karam\Archon\.claude\skills\archon\references\workflow-dag.md` — authoring guide,
    read before any YAML
  - `C:\Users\karam\Archon\.claude\skills\archon\references\parameter-matrix.md` — which field
    is valid on which node type, plus the silent-failure catalog (unknown keys warn, not error)
  - `bun run cli --help` — the authoritative flag list. Confirmed present 2026-08-09:
    `--cwd`, `--folder`, `--no-worktree`, `--base`, `--detach`, `--json`, `--all`, `--resume`
- Archon docs site — https://archon.diy/reference/cli/ ,
  https://archon.diy/reference/archon-directories/ ,
  https://archon.diy/reference/workflow-language-constitution/ (cite in any YAML-surface work)
- `C:\Users\karam\sextant\CLAUDE.md` — target-repo constitution: Python 3 **stdlib only**, no
  `requirements.txt`, no `pyproject.toml`; tests are `tests/test_<module>.py` /
  `unittest.TestCase` inserting repo root into `sys.path`; §PRP file lifecycle (`0-`/`1-`)
- `C:\Users\karam\.claude\CLAUDE.md` — the `0-`/`1-` binary-state convention governing the PRP
  this INITIAL produces, plus memory conventions
- `C:\Users\karam\.claude\plans\i-want-to-copy-gleaming-kernighan.md` — the roadmap; this sits
  between M1 and M2 and is a hard prerequisite for M6

## OTHER CONSIDERATIONS:

**⚠️ `~/.archon/workspaces/5c1p3r/Sextant/source` is a DANGLING SYMLINK — fix before anything
else.** It points at `/c/Users/karam/.claude/claude-projects/sextant`, which no longer exists;
sextant moved to `C:\Users\karam\sextant` on 2026-08-09 (commit `d1c0908`). Read operations
still work — `workflow list --json --cwd C:/Users/karam/sextant` returned the full workflow
set on 2026-08-09 — but **worktree creation was not retested after the move**, and M1 burned
three failed builds on exactly this class of staleness. The very first task must re-point the
symlink and prove a real build still runs. Do not assume read-path success generalizes to the
write path.

**Decisions settled at sign-off (2026-08-10) — the PRP implements these, does not revisit them:**

1. **Registry location: `C:\Users\karam\.archon\projects.md`.** Rationale in workstream 1 above.
   Rejected: `~/.claude` (that is Claude Code's config dir, not Archon's — a category error
   taken purely for free git backup) and `sextant/settings/` (gitignored, and the registry is
   engine-level, not sextant's).
2. **Class C is refused, and promotion is selective.** The registry rejects any path whose
   `git rev-parse --show-toplevel` resolves to `C:\Users\karam\.claude`, with an error naming
   the reason. **`fpv-aim-trainer` — and only it — is promoted to its own git repo in this
   milestone**; the other five nested projects stay unregistered and unreachable. It is the
   roadmap's own designated first dark-factory target, self-contained, with a documented
   Phase 3 backlog and effectively zero blast radius — which makes it the right proof that
   the engine works on a repo it was not built against. Explicitly rejected:
   `--folder`/`--no-worktree` in-place execution for Class C (it removes the isolation
   property that made Archon worth adopting), and promoting all six (scope creep — YAGNI
   until a project actually has a build queued).

**The roadmap's designated safe targets are exactly the ones Archon cannot isolate.** M6
(dark factory) says "start scoped: point it at `fpv-aim-trainer` or `close-read`, never at
`sextant`." Both are Class C. M6 is therefore blocked on this structural issue, not merely on
M2–M5 — worth stating plainly, because it inverts the assumed dependency order.

**Every Class A target has heavy uncommitted work** — sextant 44 dirty files, Kent 46,
Archon 4. Archon's worktrees are cut from `origin/<baseBranch>`, **not** local `HEAD`
(the single hardest-won M1 finding — `source` being a symlink to the live checkout misleads
you into expecting otherwise). So a build silently operates on a _different_ tree than the
one the user is looking at. Any dispatch against a project with unpushed commits should warn.
Never stash, revert, or fold those files into a commit; **never run `git clean -fd`**.

**Kent (`Personal_AI_Assistant`) has a live path bug that will bite a build.** PROJECTS.md
records `scripts/run_*.vbs` still pointing at
`C:\Users\karam\.claude\claude-projects\Personal_AI_Assistant\`, which does not exist. Its
real root is `C:\Users\karam\Projects\Personal_AI_Assistant` (note: the capital `P` — the
lowercase `projects\` spelling in PROJECTS.md resolves only because Windows is
case-insensitive; the registry must record the real casing).

**`agent-core` has no git remote.** M1's mapping table warns `--base` requires the branch to
exist **on the remote** and errors hard otherwise. Whether worktree creation works at all
with no `origin` is **unverified** — test it before registering agent-core as Class B, and if
it fails, say so rather than papering over it.

**Credential mode must stay subscription.** M1 verified `ANTHROPIC_API_KEY`, `CLAUDE_API_KEY`,
and `CLAUDE_CODE_OAUTH_TOKEN` all unset, with `~/.archon/config.yaml` pinning
`defaultAssistant: claude` + `assistants.claude.model: claude-sonnet-5` (confirmed still
present 2026-08-09). A stray key silently converts every build to metered billing. Re-check
before the first multi-project build, and **do not** create `C:\Users\karam\Archon\.env`.
Cost matters more now than in M1: the one measured Archon build cost **$1.6642**, and this
milestone multiplies the number of things that can trigger one.

**Do not enable Archon's Telegram adapter** (M1 GOTCHA 0, unchanged). `SextantTelegramAssistant`
is live every 60s and is the sole `getUpdates` consumer; Archon's adapter starts with
`drop_pending_updates: true`, retries 409 only 3× at 60s, and has **zero forum-topic support**.
Dispatch stays a subprocess from sextant. Never set `TELEGRAM_BOT_TOKEN` for Archon.

**`run --json` without `--detach` is not machine-readable** (GOTCHA 3) and **`approve`/`reject`/
`resume` with `--json` are non-blocking acks that do not resume** (GOTCHA 4). Both are already
handled correctly in `handlers/archon.py` — preserve that behavior through the refactor; the
existing tests enforce it.

**`C:\Users\karam\Archon\.archon\config.yaml` is upstream's dogfooding config**, not user
configuration — never edit it. User config is `~/.archon/config.yaml` plus per-repo `.archon/`.
The one exception this milestone introduces is `~/.archon/workflows/`, which is user-scoped by
design. Also note this checkout tracks `coleam00/Archon` on branch `dev`; the personal planning
docs (`INITIAL.md`, `HANDOFF.md`, `PRPs/`) are deliberately **untracked** here and must never
enter a commit to upstream.

**Scope discipline.** This milestone is dispatch + registry + isolation classification. It is
**not** the place to build the compiled `archon` binary (still M2+ scope), add the LLM-judge
eval gate, or port the dead-man watchdog. Note them; do not build them.
