> **APPLIED — 2026-08-09.** Consumed by `PRPs/1-archon-m1-migration.md`, which was executed
> in full (all 11 tasks). Shipped artifacts: sextant `1d56a78` (handler + workflow + config),
> `236ed47` (acceptance build merged to `main`), `~/.claude` `e5ac5b4` (builder-loop archived).
>
> **Where the shipped system diverged from this spec:**
>
> - sextant relocated from `~/.claude/claude-projects/sextant` to `C:\Users\karam\sextant`
>   on 2026-08-09, _after_ this INITIAL was written. Every sextant path below is stale.
> - `handlers/archon.py` gained a 4096-char Telegram truncation guard not specified here
>   (a real 400 on `/list`'s 16,873-char reply).
> - `sextant-prd-build.yaml` gained a fourth node, `mechanical-checks` (sextant `111742b`),
>   porting the deterministic half of builder-loop's `evaluate.py` forbidden-path gate.
> - Acceptance-build cost was **$1.6642**, not the ~$0.022 `BASELINE.md` floor — expected,
>   see the PRP's final checklist for why the two are not the same class of measurement.
>
> Retired pile. Do not re-execute. Superseded by the root `INITIAL.md` (M1.5).

# INITIAL — M1: Archon in, builder-loop out

Milestone 1 of `C:\Users\karam\.claude\plans\i-want-to-copy-gleaming-kernighan.md`.

## FEATURE:

Stand up Archon as the working autonomous-build engine on this machine, give it a phone
surface through the _existing_ sextant Telegram poller, prove it end-to-end on a real
unapplied PRD, and retire `builder-loop` to an archive.

Five workstreams:

**1. Archon operational setup.**
Resolve the AI credential (see the cost warning in OTHER CONSIDERATIONS — this is the
single highest-risk unknown and must be settled _before_ any build is triggered), decide
and lock the CLI invocation form, write `~/.archon/config.yaml` with the model pinned,
and confirm `archon workflow list` returns the bundled workflows from inside a target
repo. Done when a workflow list renders from `C:\Users\karam\.claude\claude-projects\sextant`.

**2. Per-repo `.archon/` in sextant.**
Create `claude-projects/sextant/.archon/config.yaml` (baseBranch `main`). Establish how a
builder-loop PRD's front-matter maps onto Archon primitives — `validation_cmd` becomes a
`bash:` node, `max_budget_usd` becomes `maxBudgetUsd`, `max_runtime_min` becomes node
`timeout:`, `max_retries` becomes `retry:`, worktree isolation is already Archon's default.
Document the mapping; it is the migration key for every future PRD.

**3. sextant → Archon Telegram dispatch.**
New `claude-projects/sextant/handlers/archon.py` plus `tests/test_handler_archon.py`, and
a new row in `settings/topics.md` pointing at a new forum topic. This mirrors the proven
`handlers/builder_loop.py` subprocess pattern exactly. **Do not** enable Archon's own
Telegram adapter — see OTHER CONSIDERATIONS for why that would break the live system.

Command surface (all thin wrappers over `archon workflow ... --json`):
`/list`, `/run <workflow> <message>`, `/runs`, `/status <id>`, `/approve <id> [text]`,
`/reject <id> <reason>`, `/help`.

**4. End-to-end acceptance build.**
Re-run the PRD at `claude-projects/builder-loop/done/sextant-offset-backup.md` through
Archon against sextant. This is genuinely unapplied work — `OFFSET_BACKUP_PATH` is absent
from `sextant/telegram_assistant.py` on `main`, and builder-loop's own candidate sits
unmerged on branch `builder/sextant-offset-backup` (`68c83c3`). Running it through Archon
produces a direct A/B of the two engines on identical input. A human reviews and merges;
Archon never merges.

**5. Retire builder-loop.**
Archive, do not delete. Move `builder-loop/` to an archive location with a banner citing
the date, this PRP, and the commits. Remove its `topics.md` row. `BASELINE.md`'s measured
cost facts stay valid and must survive the move. Update `claude-projects/PROJECTS.md` and
the `project_builder_loop` memory (which is currently _stale_ — see below). Clean up the
`~/builds/sextant-offset-backup` worktree and `builder/sextant-offset-backup` branch only
_after_ the acceptance build is reviewed and merged.

**Human-gated steps** (the PRP must stop and ask, not guess): creating the Telegram forum
topic by hand and reading back its `message_thread_id`; any credential login; approving
the acceptance build; the final merge. Per `~/.claude/CLAUDE.md`, "applied means executed,
not necessarily finished" — the PRP flips to `1-` once carried out, recording these inside.

**Done when:** a PRD approved from the phone is built by Archon in an isolated worktree,
validated against sextant's real test suite, and lands as a branch/PR a human merges — and
`builder-loop` is archived with nothing still pointing at it.

## EXAMPLES:

Nothing needs copying — every pattern already exists in-tree. Cite these by path:

- **`C:\Users\karam\.claude\claude-projects\sextant\handlers\builder_loop.py`** — _the_
  template for workstream 3. Mirror: the subprocess-not-import boundary crossing, `encoding="utf-8"`
  on `subprocess.run` (never omit — locale default mangles emoji), `COMMAND_TIMEOUT_SEC`,
  stderr-tail on non-zero exit, the `handle(update)` shape that bails silently on a missing
  `message_thread_id`, and `html.escape(reply)` before sending. **Do NOT copy** its
  `BOT_COMMAND` path derivation — Archon is no longer a sibling under `claude-projects/`;
  it now lives at `C:\Users\karam\Archon`. **Do NOT copy** the `parents[2]` relative walk.

- **`C:\Users\karam\.claude\claude-projects\sextant\tests\test_handler_builder_loop.py`** —
  mirror the test structure 1:1: `TestRunCommand` (stdout stripped, stderr tail on non-zero,
  timeout message, missing entry point, utf-8 kwarg asserted) and `TestHandle` (no thread_id →
  no send, empty text → no send). Patch `send_text_message` _on the handler module_, not on
  `telegram_api`.

- **`C:\Users\karam\.claude\claude-projects\sextant\telegram_assistant.py`** →
  `load_topic_handlers()` (line 63). Shows the registry contract the new handler must satisfy:
  a module exposing `handle(update)`, imported by dotted path from `topics.md`. Note its
  deliberately broad `except Exception` — one bad handler must never take down the poll.

- **`C:\Users\karam\.claude\claude-projects\sextant\settings\topics.md`** — the registry
  format (`topic_id | project | handler | trust`). Currently two live rows: `6 | session-log`
  and `110 | builder-loop`. Add one; remove `110` in workstream 5.

- **`C:\Users\karam\.claude\claude-projects\builder-loop\templates\prd_template.md`** — the
  source format for the workstream-2 mapping. Every front-matter key and its semantics,
  including the optional `allowed_paths` / `require_new_tests` scope guards Archon has no
  direct equivalent for.

- **`C:\Users\karam\Archon\.archon\workflows\defaults\archon-feature-development.yaml`** —
  the closest bundled analogue to builder-loop's flow (implement → create-pr → verify-pr-base).
  Use this for the acceptance run. **Do NOT** start with `archon-plan-to-pr.yaml`; it fans out
  to five parallel review agents and costs far more than the A/B comparison needs.

- **`C:\Users\karam\Archon\.claude\skills\archon\guides\setup.md`** — the interactive setup
  wizard. Follow it for workstream 1 rather than inventing a setup sequence.

## DOCUMENTATION:

- Archon docs site: https://archon.diy/ — specifically
  - Getting started / AI assistants: https://archon.diy/getting-started/ai-assistants/
    (**settles the credential question** — check this first)
  - CLI reference: https://archon.diy/reference/cli/
  - Configuration reference: https://archon.diy/reference/configuration/
  - Archon directories: https://archon.diy/reference/archon-directories/
  - Workflow language constitution: https://archon.diy/reference/workflow-language-constitution/
- In-repo authority (more current than the site for a `dev` checkout):
  - `C:\Users\karam\Archon\CLAUDE.md` — architecture, config priority, node types, `--json` rules
  - `C:\Users\karam\Archon\.env.example` — full env surface
  - `C:\Users\karam\Archon\packages\docs-web\src\content\docs\reference\` — the docs source
  - `C:\Users\karam\Archon\.claude\skills\archon\references\workflow-dag.md` — workflow authoring
  - `C:\Users\karam\Archon\.claude\skills\archon\references\parameter-matrix.md` — which field
    works on which node type, plus a silent-failure catalog
- Telegram Bot API `getUpdates` (why two pollers cannot share a token):
  https://core.telegram.org/bots/api#getupdates
- Local context: `C:\Users\karam\.claude\plans\i-want-to-copy-gleaming-kernighan.md` (the
  roadmap this is M1 of), `claude-projects\sextant\CLAUDE.md` (target-repo constitution),
  `claude-projects\builder-loop\BASELINE.md` (the cost numbers to beat).

## OTHER CONSIDERATIONS:

**Verified environment (measured 2026-08-06, not assumed):** Bun 1.3.14, gh 2.97.0, Claude
Code 2.1.219, Node 24.13.0, git present. **No Docker** — SQLite is Archon's default, so this
is fine; do not reach for the `docker-compose` Postgres path. `bun run cli --version` from
`C:\Users\karam\Archon` returns `Archon CLI v0.8.0 · win32-x64 · source (bun) · sqlite ·
commit 41765d6a`. **Windows-native operation is confirmed empirically** — no WSL anywhere.

**⚠️ The credential/cost question is unresolved and must be answered first.** builder-loop's
`BASELINE.md` measured ~$0.022/build floor because `claude -p` rides the Claude Code
subscription. Archon's Claude provider uses `@anthropic-ai/claude-agent-sdk`; its CLAUDE.md
documents both subscription OAuth (`kind: 'oauth'`, Claude Pro/Max) and metered API keys
(`ANTHROPIC_API_KEY`). If the CLI path forces a metered key, **every build costs real API
dollars** and the M3 cost-routing milestone becomes urgent rather than optional. Determine
which applies before triggering a single build, and record the answer.

**⚠️ Do NOT enable Archon's Telegram adapter.** This is the finding that reshaped the plan.
`SextantTelegramAssistant` is live _right now_ — scheduled every 60 seconds, last run
succeeded (result 0). It is the sole `getUpdates` consumer on that bot token. Archon's
adapter (`packages/adapters/src/chat/telegram/adapter.ts`) would fight it:

- It starts with `drop_pending_updates: true`, **silently discarding** queued messages.
- It retries 409 Conflict only `MAX_ATTEMPTS = 3` at `RETRY_DELAY_MS = 60_000`, then throws.
- It has **zero forum-topic support** — `grep` for `message_thread_id|messageThreadId|is_topic_message|forum`
  across that directory returns nothing, and `sendMessage` does a bare `parseInt(chatId)`.
  It physically cannot reply into topic 110 or any successor topic.

Hence the subprocess-dispatch design. It also preserves the stateless scheduled-task
architecture — running Archon's adapter needs a persistent daemon, which is the same
objection that got Discord rejected for builder-loop.

**The `project_builder_loop` memory is stale.** It claims builder-loop was "never deployed"
with a "placeholder topic 7". Reality: `settings/topics.md` routes `110 | builder-loop`,
`builder-loop/settings/topic_id.txt` contains `110`, and sextant has a real bot token. The
Telegram gateway _is_ live; only `BuilderLoopPass` (the 30-min build loop) was never
registered in Task Scheduler — confirmed, the only scheduled tasks are `SextantMorning`,
`SextantEvening`, `SextantTelegramAssistant`, `SextantWebSync`, `SextantYouTubeSync`, and an
unrelated `Mcbuilder`. Correct the memory in workstream 5.

**`validation_cmd` must not use bare `python`.** The archived PRD says
`validation_cmd: python -m unittest discover tests`, but a hook on this machine **rejects
bare `python`** — it must be `uv run python -m unittest discover tests`. This bites the
moment the acceptance build runs its validation node.

**sextant is stdlib-only.** Its CLAUDE.md is a hard constraint: Python 3 standard library,
no third-party deps, no `requirements.txt`, no `pyproject.toml`. `handlers/archon.py` must
respect this — `subprocess` + `html` + `pathlib` only, exactly as `builder_loop.py` does.

**sextant has uncommitted work in ~15 files right now** (dashboard tests, template changes,
PRP `0-`/`1-` renames pending). Do not disturb it, do not stash it, and do not fold it into
any commit this PRP makes. A worktree cut from `main` will not see it, which is correct.

**`C:\Users\karam\Archon\.archon\config.yaml` is upstream's own dogfooding config**
(`baseBranch: dev`, docs path into `packages/docs-web`, an `@mini` alias to
`pi/minimax/MiniMax-M3`). It is **not** user configuration and must not be edited as such.
User config belongs in `~/.archon/config.yaml` (global) and per-target-repo `.archon/`.

**The CLI invocation form is an open decision.** There is no `archon` binary on PATH; the
source form is `bun run cli`, which resolves as `bun --cwd packages/cli src/cli.ts`. But
Archon resolves the target repo from the **process cwd**, and workflow commands must run
inside a git repo. So the handler cannot simply `cd` to Archon. Two candidates: invoke
`bun <abs-path-to-cli.ts>` with `cwd` set to the target repo, or run `bun run build:binaries`
to get a real `archon` on PATH. **The binary is the better outcome** — the bundled `archon`
skill literally shells out to `archon workflow list` — but the roadmap warns the compiled
binary needs **AVX2**, so verify the CPU supports it before committing to that path, and
fall back to the source invocation if not. Whichever is chosen, verify it end-to-end from
`claude-projects\sextant` before writing the handler against it.

**`--json` semantics have a trap.** Per Archon's CLAUDE.md, on `approve`/`reject`/`resume`
the `--json` form records the decision and returns an ack **without** the inline auto-resume,
leaving the run resumable — continuation must be driven separately. A handler that approves
via `--json` and assumes the build continues will hang forever.

**Archon writes outside the repo.** Artifacts, logs, and state live under
`~/.archon/workspaces/<project>/`, never in the repo — `$ARTIFACTS_DIR` and `$STATE_DIR`.
Do not expect build output in the worktree, and never commit it.

**Never run `git clean -fd`** in any Archon-adjacent flow — Archon's own CLAUDE.md flags it
as permanently destroying untracked files. Given sextant's uncommitted state above, this
would be genuinely costly here.

**Acceptance-build ground truth:** branch `builder/sextant-offset-backup` at `68c83c3`,
worktree `C:\Users\karam\builds\sextant-offset-backup`, feature absent from `main`. sextant's
suite is **204 tests, currently green** (`uv run python -m unittest discover tests`) — that
is the number the validation node must still produce, plus whatever the PRD adds.

**Follow sextant's PRP lifecycle for anything landed there:** files are born `0-`, flip to
`1-` via `git mv` _in the implementation commit_, and renaming breaks inbound references
that live in source files (`handlers/builder_loop.py` cites `PRPs/1-telegram-gateway.md`),
not just docs. Grep before renaming.
