name: "M1 — Archon in, builder-loop out"
description: |
Stand up Archon as the working autonomous-build engine on this machine, give it a phone
surface through the existing sextant Telegram poller, prove it end-to-end on a real
unapplied PRD, and retire builder-loop to an archive.

## Purpose

Milestone 1 of `C:\Users\karam\.claude\plans\i-want-to-copy-gleaming-kernighan.md`. Replaces
a hand-rolled PRD pipeline (`builder-loop`, ~148 tests, 3 stages shipped, build loop never
scheduled) with Archon, which is a superset of it.

## Core Principles

1. **Context is King**: every fact below was measured on this machine on 2026-08-06, not assumed.
2. **Validation Loops**: `archon doctor`, `archon validate workflows`, and sextant's 204-test suite.
3. **Information Dense**: real paths, real flags, real error strings.
4. **Progressive Success**: config → workflow → handler → live build → retire. Never reorder.
5. **Global rules**: follow `C:\Users\karam\.claude\CLAUDE.md` and `claude-projects\sextant\CLAUDE.md`.

---

## Goal

A PRD approved from the phone is built by Archon in an isolated git worktree, validated
against sextant's real test suite, and lands as a branch a human merges — with `builder-loop`
archived and nothing still pointing at it.

Concretely, when this is done:

- `archon doctor` is green and provably running on the **Claude Pro/Max subscription**, not metered API billing.
- `~/.archon/config.yaml` pins the build model so an ambient default can't drift under it.
- `claude-projects/sextant/.archon/` holds a `sextant-prd-build` workflow that runs sextant's
  real validation command.
- `claude-projects/sextant/handlers/archon.py` dispatches Telegram commands to the Archon CLI
  by subprocess, registered in `settings/topics.md` on its own forum topic.
- The `sextant-offset-backup` PRD has been rebuilt by Archon and reviewed against builder-loop's
  own unmerged candidate at `68c83c3`.
- `builder-loop/` is archived with a banner; its `topics.md` row is gone; `PROJECTS.md` and the
  `project_builder_loop` memory are corrected.

## Why

- **builder-loop is 3 stages of code that never ran.** Its build loop (`BuilderLoopPass`) was
  never registered in Task Scheduler — verified, the only scheduled tasks are `SextantMorning`,
  `SextantEvening`, `SextantTelegramAssistant`, `SextantWebSync`, `SextantYouTubeSync`, plus an
  unrelated `Mcbuilder`. Archon delivers the same contract, already tested, maintained upstream.
- **Archon is a superset**: worktree isolation, approval gates, retries, structured output,
  sub-runs, fan-out, cost tracking, and 21 bundled workflows — against builder-loop's single
  hand-rolled path.
- **It unblocks the rest of the roadmap.** M2 (AI layer), M3 (cheap-model routing), M6 (dark
  factory with hold-out validation via `archon-adversarial-dev`) all assume Archon is running.
- **It closes a real open loop**: the `builder/sextant-offset-backup` branch has sat unmerged
  since 2026-07-19.

## What

**User-visible behavior.** In a new Telegram forum topic, `/list` returns available workflows,
`/run <workflow> <message>` starts a detached build and returns a run id, `/runs` and
`/status` report progress, `/approve <id>` and `/reject <id> <reason>` drive approval gates,
`/help` prints the surface. Replies land in that topic, not General.

**Technical requirements.**

- Archon runs from source (`bun`), invoked by absolute script path with `--cwd <target repo>`.
- The sextant handler is **stdlib-only** Python and crosses to Archon by **subprocess, never import**.
- Archon's own Telegram adapter stays **disabled** — see gotchas; enabling it breaks the live poller.
- The human always merges. Archon never merges.

### Success Criteria

- [ ] `archon doctor` exits 0 and reports Claude available.
- [ ] Claude credential mode is confirmed **subscription** — all of `ANTHROPIC_API_KEY`,
      `CLAUDE_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` unset, `CLAUDE_USE_GLOBAL_AUTH=true`.
- [ ] `~/.archon/config.yaml` sets `defaultAssistant: claude` and pins an explicit model.
- [ ] `archon validate workflows sextant-prd-build` passes.
- [ ] `uv run python -m unittest discover tests` in sextant: **204 existing tests plus the new
      handler tests**, all green.
- [ ] `handlers/archon.py` never imports anything from Archon or builder-loop.
- [ ] A `/run` issued from the phone returns a run id within the handler timeout.
- [ ] The offset-backup PRD rebuilt by Archon produces a branch whose diff is reviewed against
      `68c83c3`, and sextant's suite passes on it.
- [ ] `builder-loop/` is archived; `topics.md` no longer routes `110`; `grep -rn "builder-loop"`
      across `claude-projects/` returns only archive-banner and historical-record hits.
- [ ] `project_builder_loop` memory is corrected (it currently claims "never deployed").

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Include these in your context window

- url: https://archon.diy/reference/cli/
  why: Authoritative flag reference. §workflow run (--detach, --cwd, --no-worktree, --base),
       §workflow runs/get/status, §workflow resume.
  critical: |
    `run` emits a JSON payload ONLY under `--detach`. Plain `run --json` still prints human
    progress to stdout ("Running workflow: …") — NEVER pipe it to a parser.
    `resume --json` is a non-blocking ack that does NOT re-execute; drive continuation with
    `workflow run <name> --resume --detach`.

- url: https://archon.diy/getting-started/ai-assistants/
  why: Settles the credential model. "Claude Code — Recommended for Claude Pro/Max subscribers."
  critical: Archon spawns the `claude` CLI as a subprocess; in dev (`bun run`) it resolves it
           via node_modules automatically. No binary path config needed for a source build.

- url: https://archon.diy/reference/configuration/
  why: Keys for ~/.archon/config.yaml — assistants.*, tiers, aliases, worktree.baseBranch.

- url: https://archon.diy/reference/archon-directories/
  why: Where runs write. $ARTIFACTS_DIR / $STATE_DIR live under ~/.archon/workspaces/<project>/,
       never in the repo.

- file: C:\Users\karam\Archon\.env.example
  why: Lines 9-19 are the exact credential precedence.
  critical: |
    "A set API key is used even with CLAUDE_USE_GLOBAL_AUTH=true (metered API billing, not
    `claude /login`)." A stray CLAUDE_API_KEY silently converts every build to metered billing.

- file: C:\Users\karam\Archon\.archon\workflows\defaults\archon-feature-development.yaml
  why: The shape to mirror for sextant-prd-build (implement -> create-pr -> verify-pr-base).
  critical: Its create-pr/verify-pr-base nodes shell out to `gh pr list/view/edit`. `gh` is
           NOT authenticated on this machine — those nodes WILL fail until Task 0 is done.

- file: C:\Users\karam\Archon\.claude\skills\archon\references\workflow-dag.md
  why: The complete workflow authoring guide. Read before writing any YAML.

- file: C:\Users\karam\Archon\.claude\skills\archon\references\parameter-matrix.md
  why: Which field works on which node type, plus a silent-failure catalog.

- file: C:\Users\karam\.claude\claude-projects\sextant\handlers\builder_loop.py
  why: THE template for handlers/archon.py. Mirror the subprocess boundary, encoding="utf-8",
       stderr-tail on non-zero, silent bail on missing message_thread_id, html.escape on reply.
  critical: Do NOT copy its `parents[2]` path walk — Archon is no longer a sibling under
           claude-projects/; it lives at C:\Users\karam\Archon.

- file: C:\Users\karam\.claude\claude-projects\sextant\tests\test_handler_builder_loop.py
  why: Mirror this test structure 1:1 for test_handler_archon.py.
  critical: Patch send_text_message ON THE HANDLER MODULE, not on telegram_api.

- file: C:\Users\karam\.claude\claude-projects\sextant\telegram_assistant.py
  why: load_topic_handlers() at line 63 — the registry contract (module exposing handle(update)).
  critical: Its `except Exception` is deliberately broad; one bad handler must never take
           down the poll. Do not narrow it.

- file: C:\Users\karam\.claude\claude-projects\sextant\CLAUDE.md
  why: Target-repo constitution. Python 3 STDLIB ONLY, no third-party deps, no pyproject.toml.
       Tests: tests/test_<module>.py, unittest.TestCase, repo root inserted into sys.path.

- file: C:\Users\karam\.claude\claude-projects\builder-loop\templates\prd_template.md
  why: Source format for the front-matter mapping (Task 5).

- file: C:\Users\karam\.claude\claude-projects\builder-loop\done\sextant-offset-backup.md
  why: The acceptance-build input. Note its validation_cmd uses bare `python` — must become
       `uv run python`.

- file: C:\Users\karam\.claude\CLAUDE.md
  why: The 0-/1- binary-state convention governing this very file, and the memory conventions.
```

### Current Codebase tree

```bash
C:\Users\karam\
├── Archon\                          # v0.8.0, branch dev, clean, bun install done
│   ├── INITIAL.md                   # signed off
│   ├── PRPs\0-archon-m1-migration.md  # THIS FILE
│   ├── .archon\                     # UPSTREAM's dogfooding config — do not treat as yours
│   ├── .claude\skills\archon\       # setup wizard + workflow-dag + parameter-matrix
│   └── packages\cli\src\cli.ts      # the entry point the handler shells out to
├── .archon\                         # created 2026-08-06 20:25 by first CLI run
│   ├── config.yaml                  # all-commented default — Task 2 fills it
│   └── telemetry-id
├── builds\sextant-offset-backup\    # leftover builder-loop worktree, branch 68c83c3
└── .claude\
    ├── plans\i-want-to-copy-gleaming-kernighan.md
    └── claude-projects\
        ├── sextant\                 # 204 tests green; ~15 files uncommitted RIGHT NOW
        │   ├── handlers\{__init__,builder_loop,session_log}.py
        │   ├── tests\test_handler_builder_loop.py
        │   ├── settings\topics.md   # 6 -> session-log, 110 -> builder-loop
        │   └── telegram_assistant.py
        └── builder-loop\            # to be archived
            ├── done\sextant-offset-backup.md
            ├── settings\topic_id.txt   # 110
            └── BASELINE.md          # cost facts MUST survive the move
```

### Desired Codebase tree

```bash
C:\Users\karam\.archon\config.yaml            MODIFIED  defaultAssistant + PINNED model (Task 2)

C:\Users\karam\.claude\claude-projects\sextant\
├── .archon\
│   ├── config.yaml                           CREATE    worktree.baseBranch: main (Task 3)
│   ├── workflows\sextant-prd-build.yaml      CREATE    implement -> validate -> pr (Task 4)
│   └── prds\offset-backup.md                 CREATE    PRD copied in-repo so the worktree sees it (Task 9)
├── handlers\archon.py                        CREATE    mirror of builder_loop.py (Task 6)
├── tests\test_handler_archon.py              CREATE    mirror of test_handler_builder_loop.py (Task 7)
├── settings\topics.md                        MODIFY    +1 row (Task 8); -110 row (Task 11)
└── docs\archon-prd-mapping.md                CREATE    front-matter -> Archon mapping (Task 5)

C:\Users\karam\.claude\claude-projects\
├── builder-loop\                             MOVE ->   archive\builder-loop\ + banner (Task 11)
└── PROJECTS.md                               MODIFY    Archon in, builder-loop archived (Task 11)

C:\Users\karam\.claude\projects\C--Users-karam--claude\memory\
└── project_builder_loop.md                   MODIFY    correct "never deployed" claim (Task 11)

# NO changes to C:\Users\karam\Archon\ except this PRP and INITIAL.md.
# NEVER edit C:\Users\karam\Archon\.archon\config.yaml — that is upstream's.
```

### Known Gotchas of our codebase & Library Quirks

```python
# ══════════════════════════════════════════════════════════════════════════
# GOTCHA 0 — THE BIG ONE. Do NOT enable Archon's Telegram adapter.
# ══════════════════════════════════════════════════════════════════════════
#   SextantTelegramAssistant is LIVE, scheduled every 60 seconds, last run result 0.
#   It is the sole getUpdates consumer on that bot token. Archon's adapter would fight it:
#     - packages/adapters/src/chat/telegram/adapter.ts starts with drop_pending_updates: true
#       -> SILENTLY DISCARDS the other consumer's queued messages.
#     - 409 Conflict retry is MAX_ATTEMPTS = 3 at RETRY_DELAY_MS = 60_000, then throws.
#     - ZERO forum-topic support: grep for message_thread_id|messageThreadId|is_topic_message|forum
#       across that directory returns NOTHING. sendMessage does a bare parseInt(chatId).
#       It physically cannot reply into a forum topic.
#   => Dispatch by subprocess from sextant. Never set TELEGRAM_BOT_TOKEN for Archon.

# GOTCHA 1: A stray API key silently converts to metered billing.
#   .env.example: "A set API key is used even with CLAUDE_USE_GLOBAL_AUTH=true
#   (metered API billing, not `claude /login`)."
#   VERIFIED 2026-08-06: ANTHROPIC_API_KEY, CLAUDE_API_KEY, CLAUDE_CODE_OAUTH_TOKEN all unset.
#   Re-check before the first build. Do NOT create C:\Users\karam\Archon\.env with a key in it.

# GOTCHA 2: `gh` is NOT authenticated. `gh auth status` -> "You are not logged into any GitHub
#   hosts." sextant's remote IS GitHub (git@github.com:5c1p3r/Sextant.git, upstream origin/main),
#   so PR nodes are viable — but only after `gh auth login`. That is Task 0 and it is HUMAN-GATED
#   (interactive device/browser flow). Until then, author sextant-prd-build so the PR node is the
#   LAST node and its failure doesn't lose the validated branch.

# GOTCHA 3: `run --json` without `--detach` is NOT machine-readable.
#   Per the CLI reference: "run emits a JSON payload only under --detach. Without it, --json
#   suppresses logs but the command still prints human progress to stdout."
#   => The handler MUST use `--detach --json`. Warnings go to STDERR before the run starts,
#      so stdout stays exactly the JSON payload.

# GOTCHA 4: `resume --json` does not resume.
#   "In --json mode the command is a non-blocking control-plane ack ... does NOT re-execute
#   inline." A handler that approves and assumes the build continues will hang forever.
#   Drive continuation with `workflow run <name> --resume --detach`.

# GOTCHA 5: bare `python` is rejected by a hook on this machine.
#   The archived PRD says `validation_cmd: python -m unittest discover tests`.
#   It MUST become `uv run python -m unittest discover tests`. uv 0.12.2 is installed.

# GOTCHA 6: bash: nodes run under Git Bash on Windows.
#   dag-executor.ts resolves bash.exe and errors with "Set ARCHON_BASH_PATH if Git Bash is
#   installed elsewhere". VERIFIED present at the default C:\Program Files\Git\bin\bash.exe,
#   so no override is needed. Keep `set -euo pipefail` — it is POSIX and works there.

# GOTCHA 7: sextant is STDLIB ONLY.
#   Its CLAUDE.md is a hard constraint: no third-party deps, no requirements.txt, no
#   pyproject.toml. handlers/archon.py gets subprocess + html + pathlib + sys. Nothing else.

# GOTCHA 8: sextant has ~15 UNCOMMITTED files right now.
#   (dashboard tests, template changes, pending PRP 0-/1- renames.) Do NOT stash, revert, or
#   fold them into any commit. A worktree cut from main will not see them — that is correct.
#   NEVER run `git clean -fd` anywhere near this — Archon's own CLAUDE.md flags it as
#   permanently destroying untracked files.

# GOTCHA 9: C:\Users\karam\Archon\.archon\config.yaml is UPSTREAM's dogfooding config.
#   (baseBranch: dev, docs path into packages/docs-web, @mini -> pi/minimax/MiniMax-M3.)
#   It is not user configuration. User config: ~/.archon/config.yaml + per-repo .archon/.

# GOTCHA 10: PIN THE MODEL. builder-loop's BASELINE.md recorded the global settings.json
#   default drifting opus -> sonnet inside one week. An unpinned build model changes cost and
#   behavior silently. Set assistants.claude.model explicitly in ~/.archon/config.yaml.

# GOTCHA 11: `scopeFallback: true` in --json output means cwd was NOT a registered project and
#   the result is a GLOBAL list. The handler must surface this, never present it as project-scoped.

# GOTCHA 12: Run ids are short 8-char prefixes, resolvable only from the project directory.
#   Since the handler always passes --cwd, short ids work. Full ids from --json work anywhere.

# GOTCHA 13: The project_builder_loop memory is STALE. It claims "never deployed / placeholder
#   topic 7". Reality: topics.md routes 110, builder-loop/settings/topic_id.txt = 110, sextant
#   has a real token. Only BuilderLoopPass was never scheduled. Fix it in Task 11.

# GOTCHA 14: Renaming a PRP breaks inbound references that live in SOURCE files, not just docs.
#   handlers/builder_loop.py line 5 cites PRPs/1-telegram-gateway.md. Grep before renaming.
```

## Implementation Blueprint

### Data models and structure

The "data model" here is the translation contract from a builder-loop PRD to Archon primitives.
Write it to `sextant/docs/archon-prd-mapping.md` in Task 5:

```yaml
# builder-loop PRD front-matter  ->  Archon equivalent
target_repo:      -> `--cwd <path>` on the CLI invocation (NOT a YAML field)
base_branch:      -> worktree.baseBranch in .archon/config.yaml, or `--base <branch>` per-dispatch
                     CAUTION: --base requires the branch to EXIST ON THE REMOTE; missing = hard error
validation_cmd:   -> a `bash:` node running `uv run python -m unittest discover tests`
max_budget_usd:   -> `maxBudgetUsd` (Claude-only node/workflow option)
max_runtime_min:  -> node `timeout:` (milliseconds — multiply by 60000)
max_retries:      -> node `retry:`
allowed_paths:    -> NO direct equivalent. Enforce with a `bash:` node diffing against the
                     base and failing on out-of-scope paths, or drop the guard and say so.
require_new_tests -> NO direct equivalent. Same approach: a bash assertion node.
# Isolation: builder-loop's `builder/<slug>` worktree == Archon's DEFAULT behavior. Nothing to map.
```

### List of tasks to be completed, in order

```yaml
Task 0 — HUMAN-GATED PREREQUISITE:
  RUN: gh auth login
    - Interactive. Tell the user to run it themselves with the `!` prefix: `! gh auth login`
    - VERIFY: `gh auth status` reports a logged-in host
    - BLOCKS: Task 4's PR node and Task 9's acceptance build
    - DO NOT attempt to automate or work around this.

Task 1 — Verify the Archon baseline (no writes):
  RUN: cd C:\Users\karam\Archon && bun run cli doctor
  RUN: printenv ANTHROPIC_API_KEY CLAUDE_API_KEY CLAUDE_CODE_OAUTH_TOKEN
    - CRITICAL: all three MUST be empty. If any is set, STOP and ask the user — it means
      metered billing (GOTCHA 1).
  RECORD: the exact working invocation form. VERIFIED to work:
      bun C:/Users/karam/Archon/packages/cli/src/cli.ts <args>   (with cwd = target repo)
      or add --cwd <target repo> and run from anywhere.
  NOTE: AVX2 is TRUE on this CPU (i5-1335U), so `bun run build:binaries` is a viable
      later upgrade to get a real `archon` on PATH. Do NOT do it in this PRP — the source
      invocation is already proven and a binary build is scope creep.

Task 2 — MODIFY C:\Users\karam\.archon\config.yaml:
  - FIND: the all-commented default file created 2026-08-06 20:25
  - SET: defaultAssistant: claude
  - SET: assistants.claude.model to an EXPLICIT model id (GOTCHA 10 — never leave it to drift)
  - PRESERVE: every other comment block
  - VERIFY: bun run cli doctor still green

Task 3 — CREATE claude-projects/sextant/.archon/config.yaml:
  - SET: worktree.baseBranch: main
  - KEEP MINIMAL. Do not copy upstream's .archon/config.yaml (GOTCHA 9).

Task 4 — CREATE claude-projects/sextant/.archon/workflows/sextant-prd-build.yaml:
  - MIRROR pattern from: C:\Users\karam\Archon\.archon\workflows\defaults\archon-feature-development.yaml
  - READ FIRST: .claude/skills/archon/references/workflow-dag.md and parameter-matrix.md
  - NODES: implement (provider claude, pinned model) -> validate (bash) -> create-pr (LAST)
  - validate node bash body MUST be:  set -euo pipefail; uv run python -m unittest discover tests
  - ORDER MATTERS: create-pr is last so a gh failure never loses the validated branch (GOTCHA 2)
  - VALIDATE: bun run cli validate workflows sextant-prd-build --cwd <sextant>

Task 5 — CREATE claude-projects/sextant/docs/archon-prd-mapping.md:
  - Write the mapping table from "Data models and structure" above, verbatim, with the
    allowed_paths / require_new_tests gaps called out explicitly as UNMAPPED.

Task 6 — CREATE claude-projects/sextant/handlers/archon.py:
  - MIRROR pattern from: handlers/builder_loop.py
  - KEEP IDENTICAL: encoding="utf-8" kwarg, errors="replace", timeout handling, stderr-tail on
    non-zero exit, silent bail when message_thread_id is None, html.escape(reply) before send
  - MODIFY: the path constants (Archon is at C:\Users\karam\Archon, NOT a sibling)
  - ADD: command parsing for /list /run /runs /status /get /approve /reject /help
  - STDLIB ONLY (GOTCHA 7)

Task 7 — CREATE claude-projects/sextant/tests/test_handler_archon.py:
  - MIRROR pattern from: tests/test_handler_builder_loop.py, 1:1
  - COVER: stdout stripped, stderr tail on non-zero, timeout message, missing CLI path,
    utf-8 kwarg asserted, --detach present on /run, no thread_id -> no send, empty text -> no send
  - ADD one test asserting the handler NEVER invokes plain `run --json` without --detach (GOTCHA 3)
  - RUN: uv run python -m unittest discover tests   (204 existing + new, all green)

Task 8 — HUMAN-GATED + MODIFY settings/topics.md:
  - ASK THE USER to create a new Telegram forum topic for Archon and report back its
    message_thread_id. Do NOT guess a number — builder-loop shipped with a placeholder 7
    that was wrong for weeks.
  - APPEND row: <thread_id> | archon | handlers.archon | build
  - PRESERVE: the existing 6 and 110 rows at this stage (110 is removed in Task 11)
  - VERIFY: send a message in the new topic; the handler replies there, not in General

Task 9 — Acceptance build (HUMAN approves the trigger):
  - CREATE claude-projects/sextant/.archon/prds/offset-backup.md
      - COPY BODY FROM: builder-loop/done/sextant-offset-backup.md
      - FIX: validation_cmd -> `uv run python -m unittest discover tests` (GOTCHA 5)
      - Copied IN-REPO deliberately so the worktree can see it by relative path.
  - RUN: workflow run sextant-prd-build --cwd <sextant> --detach --json ".archon/prds/offset-backup.md"
  - POLL: workflow runs / workflow get <id> --json
  - EXPECT: a branch with OFFSET_BACKUP_PATH added to telegram_assistant.py and a new test file
  - COMPARE: diff it against builder-loop's candidate at 68c83c3 (branch builder/sextant-offset-backup)
  - RECORD: the cost from the run, against BASELINE.md's ~$0.022/build floor

Task 10 — HUMAN-GATED: review and merge:
  - The user reviews the Archon branch and merges. Archon NEVER merges.
  - AFTER merge only: remove the stale worktree and branch:
      bun run cli complete <branch>       # or: git worktree remove + git branch -d
      Target: C:\Users\karam\builds\sextant-offset-backup and builder/sextant-offset-backup

Task 11 — Retire builder-loop:
  - MOVE: claude-projects/builder-loop -> claude-projects/archive/builder-loop
  - CREATE a banner at the top of its README: ARCHIVED — <date>, superseded by Archon,
    citing this PRP path and the commits. PRESERVE BASELINE.md intact — its cost facts stay valid.
  - MODIFY settings/topics.md: remove the `110 | builder-loop` row
  - GREP FIRST (GOTCHA 14): `grep -rn "builder-loop" claude-projects/ ~/.claude/*.md` and fix
    every inbound reference in the same commit
  - MODIFY claude-projects/PROJECTS.md: builder-loop -> archived; add Archon
  - MODIFY memory project_builder_loop.md: correct the "never deployed" claim (GOTCHA 13)
  - git mv this PRP: PRPs/0-archon-m1-migration.md -> PRPs/1-archon-m1-migration.md
    IN THE SAME COMMIT as the work (per ~/.claude/CLAUDE.md)
```

### Per task pseudocode

```python
# ─── Task 6: handlers/archon.py ───────────────────────────────────────────
"""Telegram handler for the Archon topic.

Crosses the project boundary with a SUBPROCESS, never an import.
See PRPs/0-archon-m1-migration.md GOTCHA 0 before changing this.
"""
import html, subprocess, sys
from pathlib import Path
from telegram_api import send_text_message   # patch THIS name in tests

# ABSOLUTE — Archon is NOT a sibling under claude-projects/ (unlike builder_loop.py's parents[2])
ARCHON_CLI = Path(r"C:\Users\karam\Archon\packages\cli\src\cli.ts")
TARGET_REPO = Path(__file__).resolve().parents[1]   # sextant itself, for M1
COMMAND_TIMEOUT_SEC = 60    # bun cold start + 21-workflow discovery is the long pole; MEASURE IT

def _archon(*args: str) -> str:
    # PATTERN: identical subprocess contract to handlers/builder_loop.py
    if not ARCHON_CLI.exists():
        return f"Archon not reachable at {ARCHON_CLI}"
    try:
        proc = subprocess.run(
            ["bun", str(ARCHON_CLI), *args, "--cwd", str(TARGET_REPO)],
            capture_output=True, text=True,
            encoding="utf-8",        # GOTCHA: never omit — locale default mangles emoji
            errors="replace",
            timeout=COMMAND_TIMEOUT_SEC,
        )
    except subprocess.TimeoutExpired:
        return f"Archon timed out after {COMMAND_TIMEOUT_SEC}s"
    except OSError as e:
        return f"Archon could not be started: {e}"
    if proc.returncode != 0:
        detail = (proc.stderr or "").strip().splitlines()
        return "Archon error: " + (detail[-1] if detail else f"exit {proc.returncode}")
    return (proc.stdout or "").strip() or "(no output)"

def handle_command(text: str) -> str:
    verb, _, rest = text.strip().partition(" ")
    if verb == "/run":
        name, _, msg = rest.partition(" ")
        # CRITICAL (GOTCHA 3): --detach is MANDATORY. Without it --json still prints
        # human progress and the JSON parse silently gets garbage.
        return _archon("workflow", "run", name, "--detach", "--json", msg)
    if verb == "/list":   return _archon("workflow", "list", "--json")
    if verb == "/runs":   return _archon("workflow", "runs", "--json")
    if verb == "/status": return _archon("workflow", "status", "--json")
    if verb == "/get":    return _archon("workflow", "get", rest, "--json")
    # GOTCHA 4: approve/reject with --json ack only; they do NOT resume. Say so in the reply.
    ...
    return help_text()

def handle(update: dict) -> None:
    # MIRRORS handlers/builder_loop.py:47-62 exactly — do not innovate here.
    message = update.get("message") or update.get("edited_message") or {}
    chat_id = str(message.get("chat", {}).get("id", ""))
    thread_id_raw = message.get("message_thread_id")
    if thread_id_raw is None or not chat_id:
        return                                   # bail silently
    text = (message.get("text") or message.get("caption") or "").strip()
    if not text:
        return
    reply = handle_command(text)
    # GOTCHA: sextant's sender forces parse_mode=HTML and a 400 here is SILENT.
    send_text_message(html.escape(reply), chat_id=chat_id,
                      message_thread_id=int(thread_id_raw))
```

```yaml
# ─── Task 4: sextant-prd-build.yaml (shape only — read workflow-dag.md for exact fields) ───
name: sextant-prd-build
description: |
  Use when: Building a PRD against sextant. Replaces builder-loop's run_once.py.
  Input: path to a PRD under .archon/prds/
provider: claude
nodes:
  - id: implement
    prompt: | # $ARGUMENTS carries the PRD path
      Read $ARGUMENTS and implement it. Obey sextant's CLAUDE.md: stdlib only.
    model: <PINNED> # GOTCHA 10
  - id: validate
    bash: |
      set -euo pipefail          # GOTCHA 6 — Git Bash, POSIX is fine
      uv run python -m unittest discover tests   # GOTCHA 5 — never bare `python`
    depends_on: [implement]
  - id: create-pr # LAST — a gh failure must not lose the validated branch (GOTCHA 2)
    command: archon-create-pr
    depends_on: [validate]
```

### Integration Points

```yaml
ARCHON_CONFIG:
  - file: C:\Users\karam\.archon\config.yaml
  - keys: defaultAssistant: claude; assistants.claude.model: <PINNED>

SEXTANT_REPO_CONFIG:
  - file: claude-projects/sextant/.archon/config.yaml
  - key:  worktree.baseBranch: main

TELEGRAM_REGISTRY:
  - file: claude-projects/sextant/settings/topics.md
  - add:    "<thread_id> | archon | handlers.archon | build"
  - remove: "110 | builder-loop | handlers.builder_loop | build"   (Task 11 only)
  - contract: the module must expose handle(update); loaded by dotted path at every poll

SCHEDULER:
  - NO new scheduled task. SextantTelegramAssistant (every 60s) already drives the poll and
    is the ONLY getUpdates consumer. Do not register an Archon poller (GOTCHA 0).

MEMORY:
  - file: ~/.claude/projects/C--Users-karam--claude/memory/project_builder_loop.md
  - fix:  the "never deployed" claim; record the archive location
  - add:  a new project_archon memory + a line in MEMORY.md
```

## Validation Loop

### Level 1: Setup & Syntax

```bash
# Archon health — run FIRST, fix before proceeding
cd C:/Users/karam/Archon && bun run cli doctor

# Credential mode MUST be subscription (all three empty)
printenv ANTHROPIC_API_KEY CLAUDE_API_KEY CLAUDE_CODE_OAUTH_TOKEN

# Workflow YAML validity
bun C:/Users/karam/Archon/packages/cli/src/cli.ts validate workflows sextant-prd-build \
  --cwd C:/Users/karam/.claude/claude-projects/sextant

# Expected: doctor green, three empty lines, workflow validates with 0 errors.
```

### Level 2: Unit Tests

```bash
cd C:/Users/karam/.claude/claude-projects/sextant
uv run python -m unittest discover tests

# Expected: 204 existing tests + the new handler tests, ALL GREEN.
# NOTE: bare `python` is rejected by a hook — `uv run python` is mandatory.
# If failing: read the error, fix the code, re-run. NEVER mock to pass.
```

### Level 3: Integration Test

```bash
# 3a — CLI reaches sextant and lists workflows (should include sextant-prd-build)
bun C:/Users/karam/Archon/packages/cli/src/cli.ts workflow list --json \
  --cwd C:/Users/karam/.claude/claude-projects/sextant
# Expected: JSON on stdout, sextant-prd-build present, no "scopeFallback": true

# 3b — the handler answers without Telegram in the loop
cd C:/Users/karam/.claude/claude-projects/sextant
uv run python -c "import handlers.archon as a; print(a.handle_command('/list')[:400])"

# 3c — live phone test: send /list in the new forum topic.
# Expected: reply lands IN THAT TOPIC (not General) within the handler timeout.

# 3d — the acceptance build (Task 9)
bun C:/Users/karam/Archon/packages/cli/src/cli.ts workflow run sextant-prd-build \
  --cwd C:/Users/karam/.claude/claude-projects/sextant --detach --json ".archon/prds/offset-backup.md"
# Then: workflow get <run-id> --json   until terminal.
# Expected: branch created, validate node exit 0, diff adds OFFSET_BACKUP_PATH + a test file.
```

## Final validation Checklist

- [ ] `bun run cli doctor` green
- [ ] All three Claude credential env vars empty (subscription billing confirmed)
- [ ] `~/.archon/config.yaml` has an explicitly pinned model
- [ ] `validate workflows sextant-prd-build` passes
- [ ] `uv run python -m unittest discover tests` — 204 + new, all green
- [ ] `handlers/archon.py` imports nothing from Archon or builder-loop
- [ ] `/list` from the phone replies in the Archon topic, not General
- [ ] Acceptance build produced a branch; validate node exited 0; diff reviewed vs `68c83c3`
- [x] Build cost recorded and compared to BASELINE.md's ~$0.022 floor — actual: **$1.6642**
      (run `852395d5e1a0d3b54137e161fc1c6c11`, 80 tokens in / 16,621 out), ~75x the
      builder-loop floor. Expected, not a regression: the floor measured a one-word Haiku
      probe's inherited-context tax, not a real build; this run did a full PRD implementation
      (read PRD, write code + tests, iterate to a green `validate` node) end to end. Not
      directly comparable — a same-class comparison would need a full builder-loop PRD build's
      logged cost, which BASELINE.md does not contain (it predates real builds running).
- [x] Human merged; stale worktree + branch removed — sextant `236ed47` on `main`;
      builder-loop's rejected candidate worktree (`~/builds/sextant-offset-backup`) and
      branch (`builder/sextant-offset-backup`, local-only, never pushed) removed
- [x] builder-loop archived with banner; BASELINE.md intact; `110` row removed —
      `claude-projects/archive/builder-loop/`, `~/.claude` commit `e5ac5b4` (branch
      `feat/builder-loop-cost-instrumentation`, not pushed); `settings/topics.md`'s `110`
      row was already gone (removed on disk in an earlier session)
- [~] `grep -rn "builder-loop"` — clean inside `claude-projects/` and `~/.claude/*.md`
  except deliberately-untouched historical narrative in
  `claude-projects/agentic-research-2026/{BUILD-ORDER,DECISION-BRIEF,LANDSCAPE}.md`
  and sextant's own historical docs (`CLAUDE.md`, `docs/archon-prd-mapping.md`,
  `PRPs/1-telegram-gateway.md`, `tests/test_telegram_assistant.py`) — those are
  point-in-time records of decisions already made, not broken references; rewriting
  them would be revisionist history-editing, out of this task's scope. Flagged to the
  user, not silently skipped.
- [x] PROJECTS.md + `project_builder_loop` memory corrected — entry moved to `## Finished`
      (was mis-filed under "Currently working on"), memory's stale "never deployed" claim
      fixed (GOTCHA 13), new `project_archon` memory added
- [x] This file renamed `0-` -> `1-` — plain rename (untracked personal planning doc in
      this upstream OSS checkout, not part of any commit to `coleam00/Archon`)

---

## Anti-Patterns to Avoid

- ❌ Do NOT enable Archon's Telegram adapter or set `TELEGRAM_BOT_TOKEN` for Archon (GOTCHA 0).
- ❌ Do NOT create `C:\Users\karam\Archon\.env` containing an API key — it silently converts
  every build to metered billing (GOTCHA 1).
- ❌ Do NOT edit `C:\Users\karam\Archon\.archon\config.yaml` — that is upstream's (GOTCHA 9).
- ❌ Do NOT parse `run --json` output without `--detach` (GOTCHA 3).
- ❌ Do NOT assume `resume --json` resumed anything (GOTCHA 4).
- ❌ Do NOT write `python` where `uv run python` is required (GOTCHA 5).
- ❌ Do NOT add a third-party dependency to sextant (GOTCHA 7).
- ❌ Do NOT stash, revert, or commit sextant's ~15 uncommitted files (GOTCHA 8).
- ❌ Do NOT run `git clean -fd` anywhere in this flow.
- ❌ Do NOT guess the Telegram thread_id — ask (Task 8).
- ❌ Do NOT let Archon merge. The human merges.
- ❌ Do NOT delete builder-loop. Archive it.
- ❌ Do NOT build the compiled binary in this PRP — the source invocation is proven; that's M2+.

---

## Confidence Score: 8/10

**Why 8:** every environmental unknown the INITIAL flagged was closed by measurement rather
than assumption — the credential model (subscription, with the metered trap identified), the
CLI invocation form (executed successfully against sextant, 21 workflows, 0 errors), AVX2
(true), Git Bash location (default path), `uv` (0.12.2), and the Telegram adapter's lack of
forum support (grep-proven). The handler is a near-mechanical mirror of a file that already
exists and is already tested.

**The 2 points off, and where a one-pass run can still stall:**

1. **Task 0 and Task 8 are human-gated and genuinely blocking** — `gh auth login` is an
   interactive flow, and the Telegram thread_id cannot be discovered without the user creating
   the topic. Execution WILL stop twice. That is correct behavior, not a defect, but it means
   this is not an unattended one-pass PRP.
2. **The exact YAML field names for `sextant-prd-build` were not verified against a live run.**
   The shape is modeled on `archon-feature-development.yaml`, but `maxBudgetUsd`/`timeout`/
   `retry` placement per node type must be checked against `parameter-matrix.md` at authoring
   time — Archon's docs warn of a "silent-failure catalog" where unknown keys are reported as
   warnings rather than rejected, so a typo degrades quietly instead of erroring.

**Also uncertain:** the acceptance build's cost against BASELINE.md's ~$0.022 floor is a genuine
unknown — Archon's `archon-implement` command is richer than builder-loop's single `claude -p`
call and may cost materially more. That is worth measuring, not predicting.
