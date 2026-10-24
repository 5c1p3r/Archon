name: "M1.5 — Archon as the system-wide build engine"
description: |
Make Archon dispatchable at any registered project on this machine, with each project's
isolation guarantee declared in a registry file and ENFORCED at dispatch — rather than
discovered three nodes into a build that is worktreeing the wrong directory.

## Purpose

Milestone 1.5 of `C:\Users\karam\.claude\plans\i-want-to-copy-gleaming-kernighan.md`, sitting
between M1 (applied 2026-08-09, `PRPs/1-archon-m1-migration.md`) and M2. M1 proved Archon
against exactly one repo. This closes the gap between "Archon builds sextant" and "Archon is
the build engine for my whole system," and is a hard prerequisite for M6 — whose two
designated safe targets (`fpv-aim-trainer`, `close-read`) are precisely the ones Archon
cannot isolate today.

## Core Principles

1. **Context is King**: every fact below was **re-measured on 2026-08-10**, not inherited from
   the INITIAL. Seven of the INITIAL's claims changed — see § _Corrections to the INITIAL_.
2. **Validation Loops**: `validate workflows`, sextant's 226-test suite, and one real build.
3. **Information Dense**: real paths, real exit codes, real error strings, real source lines.
4. **Progressive Success**: preflight → registry → guard → handler → workflow → build → retire.
   The dispatch surface must be complete and green **before** a single build is triggered.
5. **Global rules**: follow `C:\Users\karam\.claude\CLAUDE.md` and `C:\Users\karam\sextant\CLAUDE.md`.

---

## Goal

`/projects` from the phone lists every build target on this machine with its isolation class.
`/run <project> <workflow> <message>` dispatches to any **registered, dispatchable** project in
its own git worktree, validated by that repo's own declared validation contract. A `/run` at an
unsafe path is refused **before any AI cost** with a message naming the reason. `/runs` with no
project shows work across every project at once.

Concretely, when this is done:

- `C:\Users\karam\.archon\projects.md` exists and is the single source of truth for
  "what can Archon build," with one row per project carrying name, path, class, base, status.
- `C:\Users\karam\sextant\archon_registry.py` parses it and **enforces** the declared class by
  re-deriving `git rev-parse --show-toplevel` at dispatch — a lying registry row cannot slip through.
- `handlers/archon.py` is no longer hardwired to sextant; every project-scoped command takes an
  explicit project argument resolved through the registry.
- `~/.archon/workflows/repo-build.yaml` exists — a home-scoped, repo-agnostic build workflow that
  calls each repo's `.archon/validate.sh` and **fails at a preflight node** when that file is absent.
- `fpv-aim-trainer` — and only it — is promoted to its own git repo with a remote, given a
  validation contract, and proves the engine works on a repo it was not built against.
- The dangling `~/.archon/workspaces/5c1p3r/Sextant/source` symlink is repaired and the **write**
  path (worktree creation) is proven, not assumed.

## Why

- **The naive framing is wrong and expensive.** "Add a repo argument to the handler" is ~20% of
  this and not the part that matters. Most of this machine is not shaped as independently
  buildable repos: six projects under `claude-projects/` have no `.git` of their own and resolve
  to `C:\Users\karam\.claude`. Dispatching a build at `fpv-aim-trainer` today hands an autonomous
  agent a worktree containing every skill, hook, memory file, and `settings.json` in `~/.claude` —
  and write access to the harness that governs it. **The CLI does not refuse this** (measured, see
  GOTCHA 4). The guard has to be ours.
- **M6 is blocked on this, not on M2–M5.** The roadmap says "start scoped: point it at
  `fpv-aim-trainer` or `close-read`, never at `sextant`." Both are Class C. That inverts the
  assumed dependency order and is worth stating plainly.
- **There is no registry anywhere today.** Archon's `remote_agent_codebases` table has exactly one
  row, there is **no `codebase` CLI subcommand** (`bun run cli codebase --help` falls through to
  general help), and registration exists only behind `POST /api/codebases`, which needs
  `archon serve` — a persistent daemon, the exact architecture M1 rejected (GOTCHA 0, unchanged).
- **A one-repo workflow is not a build engine.** The only workflow today is
  `sextant-prd-build.yaml`, whose own description reads _"NOT for: repos other than sextant"_ and
  whose validate node hardcodes `uv run python -m unittest discover tests`.

## What

**User-visible behavior.** In the Archon forum topic (`133`): `/projects` lists the registry.
`/list <project>`, `/run <project> <workflow> <message>`, `/status <project>` are project-scoped.
`/runs` with no argument spans every project. `/get`, `/approve`, `/reject` take globally-addressable
run ids and are unchanged. An unknown project name produces a usable error naming the valid choices.
A blocked project produces a refusal naming the reason. Neither ever silently falls back to sextant.

**Technical requirements.**

- The registry is a **file** parsed with stdlib, mirroring `settings/topics.md`'s `field | field`
  convention. No daemon, no DB, no `archon serve`.
- The safety property lives in **code in sextant's git repo** (tracked, tested, backed up), not in
  the registry file (untracked local config). Do not conflate the two: the guard is code, the
  mapping is config.
- The handler stays **stdlib-only** Python and crosses to Archon by **subprocess, never import**.
- Archon's own Telegram adapter stays **disabled** (GOTCHA 0, unchanged from M1).
- The human always merges. Archon never merges.

### Success Criteria

- [ ] `~/.archon/workspaces/5c1p3r/Sextant/source` resolves, and a real worktree has been created
      through it since the repair (write path proven, not inferred from a working read path).
- [ ] `C:\Users\karam\.archon\projects.md` exists with one row per project surveyed below.
- [ ] `archon_registry.parse_projects()` is pure and unit-tested; malformed rows are skipped, never raised.
- [ ] The guard refuses, with a distinct reason string for each: a Class C path (resolves to
      `~/.claude`), a Class B path (no remote), a Class D path (no push permission), an unknown
      name (error lists valid choices), and a **registry row whose declared path disagrees with
      its actual `git rev-parse --show-toplevel`**.
- [ ] `handlers/archon.py` contains no hardcoded sextant path; `--cwd` is always registry-resolved.
- [ ] `test_run_always_includes_detach_before_json` still passes (GOTCHA 3 has not changed).
- [ ] `uv run python -m unittest discover tests` in sextant: **226 existing tests plus the new
      registry/handler tests**, all green.
- [ ] `bun run cli validate workflows repo-build` passes from at least two different repos.
- [ ] `repo-build` fails at its **preflight** node — before the AI implement node — in a repo with
      no `.archon/validate.sh`, with a message saying so.
- [ ] `fpv-aim-trainer` is its own git repo with a remote, is untracked by `~/.claude`, has a
      `.archon/validate.sh` and real tests behind it.
- [ ] A `/run` against **fpv-aim-trainer** (non-sextant, Class A) completes in its own worktree and
      is validated by that repo's own declared command.
- [ ] A `/run` against a Class C project is refused with a message naming the reason.
- [ ] `/runs` with no project shows runs across every project.
- [ ] Build cost recorded against M1's measured **$1.6642** single-build reference.

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Include these in your context window

- file: C:\Users\karam\Archon\PRPs\1-archon-m1-migration.md
  why: The applied M1 pair. Its 15 gotchas were measured on THIS machine; most still bind.
       Read before anything else. Do not re-derive its findings.
  critical: |
    GOTCHA 0 (no Archon Telegram adapter), 1 (stray API key = metered billing), 3 (run --json
    needs --detach), 4 (approve/reject --json do not resume), 5 (never bare `python`), 6 (Git
    Bash for bash: nodes), 7 (sextant is stdlib-only), 9 (never edit Archon's .archon/config.yaml)
    all carry forward UNCHANGED into this PRP.

- file: C:\Users\karam\Archon\PRPs\initials\archon-m1-migration.md
  why: The retired M1 INITIAL, with its APPLIED banner recording where the shipped system
       diverged from spec. Shows the house convention for retiring an INITIAL.

- file: C:\Users\karam\Archon\INITIAL.md
  why: This PRP's own source. Its two sign-off decisions (registry location; fpv-only promotion)
       are SETTLED — implement them, do not revisit.

- file: C:\Users\karam\sextant\handlers\archon.py
  why: The file being generalized. 121 lines.
  critical: |
    PRESERVE EXACTLY: encoding="utf-8" + errors="replace" on subprocess.run, the stderr-tail on
    non-zero exit, TimeoutExpired -> message, OSError -> message, the silent bail when
    message_thread_id is None, html.escape before send, and the TELEGRAM_MAX_TEXT truncation
    (that exists because a real /list reply was 16,873 chars and Telegram 400'd).
    CHANGE ONLY: TARGET_REPO's derivation and the command parsing.
    Do NOT turn _archon() into an import — the subprocess boundary is load-bearing.

- file: C:\Users\karam\sextant\tests\test_handler_archon.py
  why: 196 lines, the structure to mirror. Patch send_text_message ON THE HANDLER MODULE.
  critical: |
    `test_cwd_flag_targets_sextant` asserts the hardcoded --cwd and MUST BE REWRITTEN, not
    deleted — its replacement asserts --cwd equals the REGISTRY-RESOLVED path.
    `test_run_always_includes_detach_before_json` stays (adjust only for the new arg order).
    Cite tests by NAME, not line number — the file has already drifted ~2 lines from the
    INITIAL's citations.

- file: C:\Users\karam\sextant\telegram_assistant.py
  why: `parse_topics()` is the EXACT house style for the registry parser — a PURE
       text -> list[Row] function, comments and blanks skipped, malformed rows skipped and
       logged, NEVER raised. Its own docstring says why: "Kept pure so it is trivially
       testable — sextant house style." Mirror it.
  critical: load_topic_handlers()'s `except Exception` is deliberately broad — one bad handler
           must never take down the poll. Do not narrow it.

- file: C:\Users\karam\sextant\settings\topics.md
  why: The registry FORMAT to copy — a `# comment` header then `field | field | field` rows.
       Currently one row: `133 | archon | handlers.archon | build`.

- file: C:\Users\karam\sextant\.archon\workflows\sextant-prd-build.yaml
  why: The shape for repo-build: implement -> validate (bash) -> mechanical-checks (bash) ->
       create-pr (LAST, so a gh failure never loses the validated branch).
  critical: |
    COPY the `mechanical-checks` forbidden-path gate almost verbatim — repo-agnostic already,
    and the deterministic half of builder-loop's evaluate.py.
    DO NOT COPY the `implement` prompt (sextant's stdlib-only constitution) or the `validate`
    body (hardcoded `uv run python`). Note its `"$ARTIFACTS_DIR"` usage — that is the proven
    env-var access pattern for bash nodes (GOTCHA 7 below).

- file: C:\Users\karam\Archon\.archon\workflows\defaults\archon-feature-development.yaml
  why: The bundled repo-agnostic analogue (38 lines). Read before authoring repo-build.
  critical: DO NOT model on archon-plan-to-pr.yaml — five parallel review agents, far more
           cost than this needs.

- file: C:\Users\karam\Archon\.claude\skills\archon\references\parameter-matrix.md
  why: Which field is valid on which node type + the silent-failure catalog (unknown keys
       WARN, they do not error). Read before writing any YAML.
  critical: |
    - `timeout` (total) works on bash/script ONLY. `idle_timeout` is the AI-node equivalent.
    - `maxBudgetUsd` is Claude-only, and works on command/prompt nodes only.
    - `retry` on bash/script needs an EXPLICIT block (no silent default retries).
    - AI fields on a bash node are silently ignored with a `_ignored` loader warning.

- file: C:\Users\karam\Archon\.claude\skills\archon\references\workflow-dag.md
  why: Authoring guide (832 lines). §worktree — `worktree: {enabled: true}` forces isolation
       and rejects --no-worktree. Other worktree config (baseBranch) lives in .archon/config.yaml.

- file: C:\Users\karam\Archon\.claude\skills\archon\references\variables.md
  why: THE critical read for bash nodes. See GOTCHA 7 below — $ARGUMENTS is NOT substituted
       into bash bodies; it arrives as an environment variable.

- file: C:\Users\karam\Archon\packages\isolation\src\providers\worktree.ts
  why: Lines 1153-1157 are the source-of-truth proof for the M1 "worktrees cut from
       origin/<base>" finding, and the reason Class B cannot work. Read `createNewBranch`.

- file: C:\Users\karam\Archon\packages\workflows\src\workflow-discovery.ts
  why: The docblock above `discoverWorkflows` (~line 310) states the three-scope precedence.
       The home-scope loader is ~line 463. Confirms ~/.archon/workflows/ is real and is
       classified `source: 'global'`.
  critical: Precedence is by FILENAME, not workflow name — and two surviving files sharing a
           `name:` is a HARD LOAD ERROR. See GOTCHA 6.

- file: C:\Users\karam\.claude\claude-projects\archive\builder-loop\README.md
  why: Records two patterns deliberately NOT ported. The `loop_pass.py` `taskkill /F /T`
       dead-man watchdog is directly relevant — more concurrent projects means more chances
       to orphan a headless child on Windows. NOTE IT; do not build it (scope discipline).

- file: C:\Users\karam\sextant\CLAUDE.md
  why: Target-repo constitution. Python 3 STDLIB ONLY, no requirements.txt, no pyproject.toml.
       Tests: tests/test_<module>.py, unittest.TestCase, repo root inserted into sys.path,
       ending with `if __name__ == "__main__": unittest.main()`. No conftest.py.

- file: C:\Users\karam\.claude\CLAUDE.md
  why: The 0-/1- binary-state convention governing THIS file, plus memory conventions.

- url: https://archon.diy/reference/cli/
  why: Authoritative flag reference. Confirmed present 2026-08-10: --cwd, --folder,
       --no-worktree, --base, --from, --detach, --json, --all, --status, --limit, --resume.

- url: https://archon.diy/reference/workflow-language-constitution/
  why: "YAML coordinates, code computes." Cite it for the validation-contract design — the
       workflow must not guess how to test an arbitrary repo; the repo declares it.

- url: https://archon.diy/reference/archon-directories/
  why: ~/.archon layout. Confirms projects.md belongs beside config.yaml and archon.db.
```

### Corrections to the INITIAL (re-measured 2026-08-10)

**Seven of the INITIAL's load-bearing facts changed. Trust this section over the INITIAL.**

```text
C1. agent-core is NOT at C:\Users\karam\agent-core — that path DOES NOT EXIST.
    Real path: C:\Users\karam\.claude\claude-projects\agent-core
    It HAS its own .git (9 commits, first 2026-07-18, branch main, 3 dirty, NO remote).
    `git rev-parse --show-toplevel` from inside returns agent-core ITSELF, not ~/.claude.
    => Filesystem nesting under ~/.claude is IRRELEVANT. Only the git toplevel matters.
       agent-core is genuinely Class B. But see C2.

C2. CLASS B IS PROVEN NON-DISPATCHABLE. The INITIAL called this "unverified" and asked to
    "test it before registering agent-core as Class B, and if it fails, say so rather than
    papering over it." IT FAILS. Two independent proofs:
      (a) SOURCE: packages/isolation/src/providers/worktree.ts:1153-1157 —
            const startPoint = request.workflowType === 'task' && request.fromBranch
              ? request.fromBranch
              : `${remote}/${baseBranch}`;      // remote defaults to 'origin'
          The remote prefix is unconditional for non-task workflows. There is no no-remote path.
      (b) EMPIRICAL: in agent-core, the exact command Archon issues —
            git worktree add --no-track <path> -b probe origin/main
          returns `fatal: invalid reference: origin/main`, exit 128. No worktree created.
    => agent-core is registered as class B with status blocked:no-remote. It is NOT dispatchable.
       Do NOT paper over this with --no-worktree; that removes the isolation property that made
       Archon worth adopting, which is the same reasoning that got Class C refused at sign-off.

C3. THE ARCHON CHECKOUT IS NOT A VALID BUILD TARGET. The INITIAL lists it as Class A. Measured:
      gh api repos/coleam00/Archon --jq .permissions
      -> {"admin":false,"maintain":false,"pull":true,"push":false,"triage":false}
    push is FALSE. The worktree branch cannot be pushed and create-pr cannot work. There is no
    5c1p3r fork (gh repo list 5c1p3r shows only Sextant and Kern).
    => Register archon as class D, status blocked:upstream-no-push. Reclassifying it is not a
       revisit of a sign-off decision — the sign-off settled registry LOCATION and PROMOTION
       SCOPE, not this classification, and the INITIAL's own table was explicitly "measured",
       so a re-measurement that disagrees supersedes it.

C4. KENT HAS 5 UNPUSHED COMMITS RIGHT NOW.
      git -C C:\Users\karam\Projects\Personal_AI_Assistant status -sb
      -> ## main...origin/main [ahead 5]
    Including ecc8a27 "refactor: run Kent's LLM layer on agent-core".
    Combined with the origin/<base> cut above, a build against Kent TODAY silently operates on
    a tree missing all five. This is not a hypothetical warning — it is live. Kern push
    permission IS true (admin), so Kent is otherwise dispatchable.
    => The handler's dispatch preflight MUST warn on unpushed commits. See Task 4.

C5. fpv-aim-trainer IS TRACKED BY THE ~/.claude REPO (3 files: .gitignore, requirements.txt,
    trainer.py). Promotion is therefore NOT `git init` — it is a five-step operation (Task 7).
    agent-core is the CAUTIONARY precedent, not a good one: it has its own .git AND ~/.claude
    still tracks 22 of its files. Double-tracked. Do it properly for fpv.

C6. fpv-aim-trainer HAS ZERO TESTS and a THIRD-PARTY DEP (requirements.txt: `pygame-ce>=2.5`).
    5 files total. The INITIAL's "Done when" requires a non-sextant build "validated by that
    repo's own declared command" — fpv has no such command and nothing to run one against.
    THIS IS REAL WORK THE INITIAL DID NOT SCOPE (Task 8).
    Good news, measured: `import pygame` is at module top but `pygame.init()` is inside main()
    under `if __name__ == "__main__"`, so trainer.py IS importable headlessly. The pure
    functions apply_curve, axis_to_screen, random_target, load_highscore, save_highscore are
    all directly testable.

C7. remote_agent_codebases IS NO LONGER EMPTY. One row:
      name=5c1p3r/Sextant  default_cwd=C:/Users/karam/sextant  default_branch=main
      ai_assistant_type=CODEX   kind=repo
    Two things follow: (a) the DB already knows sextant's NEW path even though the workspace
    `source` symlink still points at the old one — read path and write path disagree, exactly
    as the INITIAL warned; (b) ai_assistant_type says **codex**, which disagrees with
    ~/.archon/config.yaml's `defaultAssistant: claude`. M1 only worked because
    sextant-prd-build.yaml sets `provider: claude` EXPLICITLY. repo-build MUST do the same.

STILL TRUE, re-confirmed 2026-08-10 (do not re-verify, but do not assume either):
  - The symlink IS dangling: source -> /c/Users/karam/.claude/claude-projects/sextant, gone.
  - ~/.archon/workflows/ DOES NOT EXIST yet. ~/.archon/projects.md DOES NOT EXIST yet.
  - No `codebase` CLI subcommand (falls through to general help).
  - ANTHROPIC_API_KEY / CLAUDE_API_KEY / CLAUDE_CODE_OAUTH_TOKEN all unset; no Archon/.env.
    ~/.archon/config.yaml: defaultAssistant: claude, assistants.claude.model: claude-sonnet-5.
  - All six Class C projects have no own .git and resolve to C:/Users/karam/.claude, whose
    branch is `feat/builder-loop-cost-instrumentation` with 6 dirty files.
  - gh IS authenticated (account 5c1p3r, scopes: gist, read:org, repo) — M1's Task 0 blocker
    is closed, and `repo` scope means `gh repo create` works for the fpv promotion.
  - uv 0.12.2 · bun 1.3.14 · Git Bash at C:\Program Files\Git\bin\bash.exe.
  - sextant is 226 TESTS GREEN (not M1's 204, not the handoff's 220). That is the new baseline.
  - Dirty-file counts: sextant 45, Kent 46, Archon 4, ~/.claude 6, agent-core 3.
```

### The measured project survey (2026-08-10)

| Project                                                                           | Path (real casing)                                       | Own `.git` | Remote            | Push   | Class | Status                     |
| --------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- | ----------------- | ------ | ----- | -------------------------- |
| sextant                                                                           | `C:\Users\karam\sextant`                                 | yes        | `5c1p3r/Sextant`  | yes    | A     | `ok`                       |
| kent                                                                              | `C:\Users\karam\Projects\Personal_AI_Assistant`          | yes        | `5c1p3r/Kern`     | yes    | A     | `ok` (⚠ 5 unpushed)        |
| fpv-aim-trainer                                                                   | `C:\Users\karam\.claude\claude-projects\fpv-aim-trainer` | **no**     | —                 | —      | C→A   | promoted in Task 7         |
| agent-core                                                                        | `C:\Users\karam\.claude\claude-projects\agent-core`      | yes        | **none**          | —      | B     | `blocked:no-remote`        |
| archon                                                                            | `C:\Users\karam\Archon`                                  | yes        | `coleam00/Archon` | **no** | D     | `blocked:upstream-no-push` |
| close-read, fpv-stick-trace, invoice-extract, micrograd-from-scratch, mistake-log | `C:\Users\karam\.claude\claude-projects\<name>`          | **no**     | —                 | —      | C     | `blocked:nested-in-claude` |

Note the casing: PROJECTS.md records Kent as `C:\Users\karam\projects\...` (lowercase `p`), which
resolves only because Windows is case-insensitive. The real casing is `Projects`, verified with
`(Get-Item 'C:\Users\karam\Projects').FullName`. **The registry records the real casing.**

### Current Codebase tree

```bash
C:\Users\karam\
├── .archon\                                    # Archon's user-config home
│   ├── config.yaml                             # defaultAssistant: claude, model: claude-sonnet-5
│   ├── archon.db                                # 1 codebase row (5c1p3r/Sextant, assistant=codex)
│   ├── workspaces\5c1p3r\Sextant\
│   │   ├── source -> ...claude-projects\sextant  # ⚠ DANGLING — Task 0
│   │   ├── worktrees\ artifacts\ logs\ state\
│   ├── (NO projects.md)                        # Task 2 creates it
│   └── (NO workflows\)                         # Task 6 creates it
├── Archon\                                     # upstream coleam00/Archon, branch dev, push:false
│   ├── INITIAL.md · HANDOFF.md · PRPs\         # personal planning docs, DELIBERATELY UNTRACKED
│   └── packages\cli\src\cli.ts                 # the subprocess entry point
├── sextant\                                    # 226 tests green; 45 files dirty RIGHT NOW
│   ├── handlers\{__init__,archon}.py
│   ├── tests\test_handler_archon.py
│   ├── settings\topics.md                      # 133 | archon | handlers.archon | build
│   ├── telegram_assistant.py                   # parse_topics() — the parser house style
│   └── .archon\{config.yaml,workflows\,prds\}
├── Projects\Personal_AI_Assistant\             # Kent — 46 dirty, 5 UNPUSHED COMMITS
└── .claude\                                    # branch feat/builder-loop-cost-instrumentation
    ├── plans\i-want-to-copy-gleaming-kernighan.md
    └── claude-projects\
        ├── agent-core\        # own .git, NO REMOTE
        ├── fpv-aim-trainer\   # NO .git, tracked by ~/.claude, 0 tests, needs pygame-ce
        ├── close-read\ fpv-stick-trace\ invoice-extract\ micrograd-from-scratch\ mistake-log\
        └── archive\builder-loop\
```

### Desired Codebase tree

```bash
C:\Users\karam\.archon\
├── projects.md                                 CREATE  the registry (Task 2) — UNTRACKED, by design
└── workflows\repo-build.yaml                   CREATE  home-scoped generic build (Task 6)

C:\Users\karam\sextant\
├── archon_registry.py                          CREATE  pure parser + impure guard (Task 3)
├── tests\test_archon_registry.py               CREATE  parser + guard tests (Task 3)
├── handlers\archon.py                          MODIFY  registry-resolved dispatch (Task 4)
├── tests\test_handler_archon.py                MODIFY  rewrite the --cwd test, add project tests
├── .archon\validate.sh                          CREATE  sextant's validation contract (Task 5)
└── docs\archon-project-registry.md             CREATE  format + classes + how to add (Task 10)

C:\Users\karam\.claude\claude-projects\fpv-aim-trainer\   # PROMOTED to its own repo (Task 7)
├── .git\                                       CREATE  git init + remote 5c1p3r/fpv-aim-trainer
├── .archon\validate.sh                          CREATE  validation contract (Task 8)
└── tests\test_trainer.py                       CREATE  real tests for the pure functions (Task 8)

C:\Users\karam\.claude\
├── .gitignore                                  MODIFY  + claude-projects/fpv-aim-trainer/
└── claude-projects\PROJECTS.md                 MODIFY  fpv promoted; registry documented (Task 10)

# NO changes to C:\Users\karam\Archon\ except this PRP and INITIAL.md.
# NEVER edit C:\Users\karam\Archon\.archon\config.yaml — that is upstream's (M1 GOTCHA 9).
```

### Known Gotchas of our codebase & Library Quirks

```python
# ══════════════════════════════════════════════════════════════════════════════
# GOTCHA 0 — CARRIED FORWARD FROM M1, UNCHANGED. Do NOT enable Archon's Telegram
#   adapter. SextantTelegramAssistant is live every 60s and is the SOLE getUpdates
#   consumer. Archon's adapter starts with drop_pending_updates: true, retries 409
#   only 3x at 60s, and has ZERO forum-topic support. Never set TELEGRAM_BOT_TOKEN
#   for Archon. Dispatch stays a subprocess from sextant.
#   M1 GOTCHAS 1, 3, 4, 5, 6, 7, 9 also carry forward verbatim. Re-read them.
# ══════════════════════════════════════════════════════════════════════════════

# GOTCHA 1 — WORKTREES ARE CUT FROM origin/<base>, NEVER LOCAL HEAD. Hardest-won M1
#   finding, now proven in source at packages/isolation/src/providers/worktree.ts:1153-1157.
#   The `source` symlink pointing at the live checkout MISLEADS you into expecting otherwise.
#   Consequences, all of which bite in this milestone:
#     - Kent's 5 unpushed commits are INVISIBLE to any build today (C4).
#     - agent-core (no remote) cannot create a worktree at all (C2) — `fatal: invalid
#       reference: origin/main`, exit 128.
#     - Every repo-declared .archon/validate.sh must be COMMITTED AND PUSHED before the
#       workflow can see it. An uncommitted validate.sh fails the preflight node.

# GOTCHA 2 — THE ~/.claude BLAST RADIUS IS THE WHOLE POINT OF THIS MILESTONE.
#   All six nested projects return C:/Users/karam/.claude from `git rev-parse --show-toplevel`.
#   A build dispatched there worktrees every skill, hook, memory file and settings.json in the
#   AI layer — and grants an autonomous agent write access to the harness governing it.
#   ~/.claude is currently on branch feat/builder-loop-cost-instrumentation with 6 dirty files.

# GOTCHA 3 — THE CLI DOES NOT REFUSE CLASS C. MEASURED, not assumed:
#     cd claude-projects/fpv-aim-trainer && bun <cli> workflow list --json
#   returns the FULL workflow set, exit 0, with NO warning and NO "scopeFallback": true marker.
#   There is no engine-side protection. The guard MUST be ours, in sextant's handler.
#   Still watch for scopeFallback on other commands (M1 GOTCHA 11) — surface it, never present
#   a global result as project-scoped.

# GOTCHA 4 — DECLARED ≠ ENFORCED. A registry is only as trustworthy as its verification.
#   The guard must RE-DERIVE `git rev-parse --show-toplevel` at dispatch and compare it to the
#   declared path. A row that claims class A for a path that actually resolves to ~/.claude must
#   be refused on the DERIVED value, not the declared one. Otherwise the registry is a comment.

# GOTCHA 5 — REGISTRY LOCATION IS SETTLED, AND ITS UNTRACKEDNESS IS FINE.
#   C:\Users\karam\.archon\projects.md — beside config.yaml, archon.db, workspaces/.
#   NOT ~/.claude (Claude Code's config dir; Archon is a separate program — a category error
#   taken purely for free git backup). NOT the C:\Users\karam\Archon checkout (tracks upstream).
#   It is untracked exactly like config.yaml and archon.db already are. That is acceptable
#   because it is a five-line name->path mapping, trivially retyped; the part carrying the
#   SAFETY property is handler code in sextant's tracked, tested git repo.

# GOTCHA 6 — WORKFLOW OVERRIDE IS BY FILENAME, NOT WORKFLOW NAME.
#   workflow-discovery.ts docblock: bundled < home (`source: 'global'`) < repo (`source:
#   'project'`), "later overrides earlier BY FILENAME". So the INITIAL's claim that
#   "sextant-prd-build.yaml stays as the project-level override that beats the global one"
#   IS WRONG AS STATED — different filename means they COEXIST as two separate workflows.
#   Worse: two surviving files declaring the same `name:` is a HARD LOAD ERROR
#   ("Duplicate workflow name '<x>' — also declared in ..."), and it drops BOTH files.
#   => Give the global workflow filename repo-build.yaml and `name: repo-build`. Both distinct
#      from sextant-prd-build. Do NOT name it sextant-prd-build hoping for an override.

# GOTCHA 7 — IN bash: NODES, $ARGUMENTS IS NOT SUBSTITUTED. It is a SHELL-INJECTION GUARD.
#   User-controlled vars ($ARGUMENTS, $USER_MESSAGE, $LOOP_USER_INPUT, $LOOP_PREV_OUTPUT,
#   $REJECTION_REASON, $CONTEXT) arrive as ENVIRONMENT VARIABLES instead. Access them as
#   normal shell env: "$ARGUMENTS". Also injected: ARTIFACTS_DIR, LOG_DIR, BASE_BRANCH — and
#   STATE_DIR, which variables.md OMITS from that list but dag-executor.ts:2660 and :2931 DO
#   set (source is authority). $nodeId.output refs ARE substituted, auto shell-quoted.
#   sextant-prd-build.yaml's `"$ARTIFACTS_DIR"` usage is the proven pattern — copy it.

# GOTCHA 8 — THE VALIDATION CONTRACT MUST BE CHECKED BEFORE THE AI NODE, NOT AT VALIDATE TIME.
#   If the preflight lives after `implement`, you pay a full implementation (M1 measured
#   $1.6642 for one build) only to discover the repo can't be validated. Preflight is node #1,
#   it is a bash node, and it exits non-zero with a message naming the missing file.

# GOTCHA 9 — THE UNPUSHED-COMMIT CHECK CANNOT LIVE IN THE WORKFLOW.
#   Inside the worktree, HEAD *is* origin/<base> — there is nothing to compare. The check is
#   only meaningful against the LIVE checkout, so it belongs in the handler's dispatch
#   preflight (Python, `git -C <path> rev-list --count @{u}..HEAD`), before the subprocess.

# GOTCHA 10 — PIN THE PROVIDER EXPLICITLY IN THE WORKFLOW.
#   remote_agent_codebases says ai_assistant_type=CODEX for 5c1p3r/Sextant while
#   ~/.archon/config.yaml says defaultAssistant: claude (C7). M1 only worked because
#   sextant-prd-build.yaml sets `provider: claude` explicitly. repo-build must too.
#   For the MODEL, M1's "pin an explicit id" advice is SUPERSEDED. Tiers were configured
#   2026-08-10 (small=claude-haiku-4-5, medium=claude-sonnet-5, large=claude-opus-5;
#   verify with `archon ai tier list`), so a workflow says `model: medium` and the install
#   decides. This still satisfies M1 GOTCHA 10's real concern — BASELINE.md's opus->sonnet
#   drift — because the pin now lives in ONE deliberate place instead of being copy-pasted
#   into every YAML.
#   DO NOT "simplify" by remapping large -> sonnet. NINE bundled workflows reference
#   `model: large` (incl. archon-piv-loop.yaml, which M2 adopts); a dishonest tier
#   downgrades all nine SILENTLY — no load error, no warning.
#   sextant-prd-build.yaml still hardcodes claude-sonnet-5. LEAVE IT — it is M1's shipped,
#   verified artifact and converting it is not this milestone's job.
#   CAUTION: `archon ai tier set` rewrites ~/.archon/config.yaml in flow style and DROPS
#   ALL COMMENTS (observed 2026-08-10: 916 bytes -> 229). Values survive; the header does
#   not. Re-format by hand after using it.

# GOTCHA 11 — sextant IS STDLIB ONLY and has 45 DIRTY FILES RIGHT NOW.
#   archon_registry.py gets subprocess + pathlib + logging + typing. Nothing else. No
#   requirements.txt, no pyproject.toml, no conftest.py.
#   Commit ONLY this PRP's files, never `git add -A` (M1 GOTCHA 8). NEVER `git clean -fd`.

# GOTCHA 12 — PROMOTING fpv IS A FIVE-STEP OPERATION, NOT `git init`.
#   ~/.claude currently TRACKS 3 of its files (C5). Skipping the untrack step reproduces
#   agent-core's double-tracked mess. Order matters — see Task 7.

# GOTCHA 13 — mechanical-checks NEEDS AN ORIGIN. Its `git diff --name-only "origin/$BASE"...HEAD`
#   requires the remote ref to exist. Fine for every status:ok row (all Class A with a remote),
#   but it is a second, independent reason Class B can never work.

# GOTCHA 14 — RUN IDS ARE GLOBALLY ADDRESSABLE, PROJECT NAMES ARE NOT.
#   /get /approve /reject take run ids and need no project (M1 GOTCHA 12: full ids from --json
#   work anywhere; short 8-char prefixes resolve only from the project dir — so always pass the
#   full id from --json). /list /run /status DO need a project. /runs takes an OPTIONAL one.
```

## Implementation Blueprint

### Data models and structure

**The registry file** — `C:\Users\karam\.archon\projects.md`. Five pipe-delimited columns,
mirroring `settings/topics.md`. Comments and blanks skipped. Written verbatim in Task 2:

```text
# Archon project registry — what Archon is allowed to build on this machine.
# Read by sextant's archon_registry.py. Untracked local config; the GUARD is code in sextant.
#
# name | path | class | base | status
#
# class:  A = own git repo + pushable remote (dispatchable)
#         B = own git repo, NO remote          -> worktrees cut from origin/<base> cannot exist
#         C = nested inside the ~/.claude repo -> a build would worktree the whole AI layer
#         D = own repo, upstream read-only     -> no push permission, create-pr cannot work
# status: ok | blocked:<reason>   (only `ok` rows are dispatchable)

sextant         | C:\Users\karam\sextant                                 | A | main | ok
kent            | C:\Users\karam\Projects\Personal_AI_Assistant          | A | main | ok
fpv-aim-trainer | C:\Users\karam\.claude\claude-projects\fpv-aim-trainer | A | main | ok
agent-core      | C:\Users\karam\.claude\claude-projects\agent-core      | B | main | blocked:no-remote
archon          | C:\Users\karam\Archon                                  | D | dev  | blocked:upstream-no-push
close-read      | C:\Users\karam\.claude\claude-projects\close-read      | C | -    | blocked:nested-in-claude
fpv-stick-trace | C:\Users\karam\.claude\claude-projects\fpv-stick-trace | C | -    | blocked:nested-in-claude
invoice-extract | C:\Users\karam\.claude\claude-projects\invoice-extract | C | -    | blocked:nested-in-claude
micrograd-from-scratch | C:\Users\karam\.claude\claude-projects\micrograd-from-scratch | C | - | blocked:nested-in-claude
mistake-log     | C:\Users\karam\.claude\claude-projects\mistake-log     | C | -    | blocked:nested-in-claude
```

> **Note on listing blocked rows.** The INITIAL says the five non-promoted Class C projects
> "stay unregistered and unreachable." They ARE unreachable — `status` gates dispatch. Listing
> them as blocked rows rather than omitting them is an implementation refinement _beneath_ the
> sign-off decision (which settled promotion scope, not file contents), and it buys three things:
> `/projects` shows the true machine picture, the refusal names a _reason_ instead of "unknown
> project", and nobody re-derives six months from now why `fpv-stick-trace` isn't buildable.
> **Promotion scope is honored exactly: fpv-aim-trainer and only it.**

**The validation contract** — `.archon/validate.sh` in each target repo. Committed and pushed
(GOTCHA 1). Exit 0 = green. This is the "YAML coordinates, code computes" boundary: the workflow
never guesses how to test an arbitrary repo; the repo declares it.

```bash
# sextant/.archon/validate.sh
set -euo pipefail
uv run python -m unittest discover tests    # M1 GOTCHA 5: never bare `python`
```

### List of tasks to be completed, in order

```yaml
Task 0 — PREFLIGHT. Repair the dangling symlink and PROVE THE WRITE PATH. BLOCKS EVERYTHING.
  VERIFY the break first (do not assume it is still broken):
    readlink ~/.archon/workspaces/5c1p3r/Sextant/source
    test -e ~/.archon/workspaces/5c1p3r/Sextant/source && echo OK || echo DANGLING
  REPAIR — re-point at sextant's real location:
    rm ~/.archon/workspaces/5c1p3r/Sextant/source
    ln -s /c/Users/karam/sextant ~/.archon/workspaces/5c1p3r/Sextant/source
    (If the symlink cannot be created, a Windows junction via `cmd //c mklink /J` is the
     fallback. Verify `test -e` passes either way.)
  PROVE THE WRITE PATH — a read-path success does NOT generalize (M1 burned three builds on
  exactly this class of staleness). The cheapest honest proof is a REAL worktree creation:
    bun <cli> workflow run repo-build --cwd C:/Users/karam/sextant --detach --json "noop"
    ... is NOT available yet. So instead, at this stage, prove it with git directly, issuing
    the EXACT command Archon issues (worktree.ts:1153-1157):
      git -C ~/.archon/workspaces/5c1p3r/Sextant/source worktree add --no-track \
        <scratch>/probe -b archon-symlink-probe origin/main
      git -C ... worktree remove <scratch>/probe && git -C ... branch -D archon-symlink-probe
    EXPECT: worktree created, then cleanly removed. If it fails, STOP and diagnose before Task 1.
  RE-PROVE at Task 9 with a real build — that is the only end-to-end proof.
  DO NOT proceed to Task 1 until `test -e` passes AND the probe worktree succeeded.

Task 1 — Re-verify the environment baseline (no writes):
  RUN: printenv ANTHROPIC_API_KEY CLAUDE_API_KEY CLAUDE_CODE_OAUTH_TOKEN
    - CRITICAL: all three MUST be empty. If any is set, STOP and ask the user — it means
      metered billing (M1 GOTCHA 1). Cost matters more now: M1's one build was $1.6642 and
      this milestone multiplies the number of things that can trigger one.
  RUN: cat ~/.archon/config.yaml   -> expect defaultAssistant: claude, model: claude-sonnet-5,
       and a `tiers:` block. Confirm resolution with `bun run cli ai tier list`:
       small=claude/claude-haiku-4-5, medium=claude/claude-sonnet-5, large=claude/claude-opus-5.
       If `large` is missing or maps to anything but opus, STOP — nine bundled workflows
       (incl. archon-piv-loop, which M2 adopts) reference it and would silently downgrade.
  RUN: gh auth status              -> expect logged in as 5c1p3r
  RUN: cd C:/Users/karam/sextant && uv run python -m unittest discover tests
    - RECORD the baseline. Expect 226. If it is not 226, record the actual number and use THAT
      as the floor — do not assume 226 and do not "fix" unrelated failures.
  DO NOT create C:\Users\karam\Archon\.env.

Task 2 — CREATE C:\Users\karam\.archon\projects.md:
  - Write the file EXACTLY as in "Data models and structure" above.
  - Re-verify each row's facts before writing (paths, classes, push permission) — they were
    measured 2026-08-10 and a row that has drifted is worse than no row:
      git -C <path> rev-parse --show-toplevel      # must equal <path> for class A/B/D
      git -C <path> remote -v                      # empty => class B
      gh api repos/<owner>/<repo> --jq .permissions  # push:false => class D
  - fpv-aim-trainer's row is written NOW but only becomes true in Task 7. Until then its guard
    check will fail (toplevel resolves to ~/.claude) — that is CORRECT and is the fixture the
    Task 3 guard tests want. Do not "fix" it early.

Task 3 — CREATE sextant/archon_registry.py + tests/test_archon_registry.py (TDD — tests first):
  - MIRROR the parser house style from telegram_assistant.py's parse_topics():
      PURE function `parse_projects(text) -> list[ProjectRow]`, no I/O, no logging of import
      failures; comments and blanks skipped; malformed rows SKIPPED AND LOGGED, never raised.
  - ProjectRow: NamedTuple(name, path, cls, base, status). `status` defaults to "ok" when the
    column is absent, mirroring parse_topics' optional `trust` column.
  - `load_registry(path=REGISTRY_PATH) -> list[ProjectRow]` — impure wrapper; a MISSING file is
    NOT an exception, it returns [] and logs (mirrors load_topic_handlers' missing-topics.md
    behavior). A missing registry must degrade to "no projects", never a traceback in the poller.
  - `resolve(name, rows) -> ProjectRow | None` — exact match first, then case-insensitive.
  - `guard(row) -> str | None` — returns None when dispatchable, else a HUMAN-READABLE REASON:
      * status != "ok"                      -> the recorded reason, expanded to a sentence
      * path does not exist                 -> "path does not exist: <path>"
      * `git rev-parse --show-toplevel` != declared path -> the CLASS C / mismatch refusal,
        naming the DERIVED toplevel (GOTCHA 4 — enforce, never trust the declared class)
      * no remote                           -> the class B refusal
    Use subprocess with the SAME contract as handlers/archon.py: encoding="utf-8",
    errors="replace", a timeout, and never raise out of the guard.
  - `unpushed_count(row) -> int` — `git -C <path> rev-list --count @{u}..HEAD`; returns 0 on any
    error (no upstream, detached HEAD). Used for the warning in Task 4 (GOTCHA 9).
  - TESTS (tests/test_archon_registry.py — stdlib unittest, repo root into sys.path):
      parse: comment header skipped · blank lines skipped · whitespace stripped ·
             malformed (<4 cols) skipped not raised · missing status column defaults to ok ·
             a realistic multi-row fixture parses to the expected rows
      load:  missing file -> [] and no raise
      resolve: exact hit · case-insensitive hit · miss -> None
      guard: status blocked:* -> reason mentions it · toplevel mismatch -> refusal names the
             derived path · a path resolving to C:/Users/karam/.claude -> refusal says so ·
             no remote -> refusal says so · happy path -> None
      unpushed_count: parses the number · returns 0 when git fails
    Mock subprocess.run; do NOT shell out to real git in unit tests.

Task 4 — MODIFY sextant/handlers/archon.py + tests/test_handler_archon.py:
  - DELETE the `TARGET_REPO = Path(__file__).resolve().parents[1]` constant. It is the whole bug.
  - PRESERVE VERBATIM: _archon()'s entire subprocess contract (encoding/errors/timeout/
    stderr-tail/OSError), handle()'s silent bail on missing message_thread_id, html.escape,
    TELEGRAM_MAX_TEXT truncation. Only the --cwd VALUE and the command parsing change.
  - `_archon(*args, cwd)` — cwd becomes an explicit parameter; there is no default.
  - NEW COMMAND SURFACE:
      /projects                              -> render the registry (name, class, base, status)
      /list <project>                        -> workflow list --json --cwd <resolved>
      /run <project> <workflow> <message>    -> workflow run <wf> --detach --json <msg> --cwd <r>
      /status <project>                      -> workflow status --json --cwd <resolved>
      /runs [project]                        -> with project: --cwd <resolved>
                                                without:      --all --json --cwd <sextant row>
      /get|/approve|/reject <run-id> ...     -> UNCHANGED (globally addressable, GOTCHA 14)
      /help                                  -> updated text
  - DISPATCH PREFLIGHT, in this order, before any subprocess:
      1. resolve(name)   -> miss: "Unknown project '<x>'. Registered: a, b, c" (NEVER fall back
                            to sextant — a silent fallback is the failure this milestone exists
                            to prevent)
      2. guard(row)      -> refusal: return the reason verbatim, spend nothing
      3. unpushed_count  -> >0: PREPEND a warning to the reply, but STILL DISPATCH (GOTCHA 9 —
                            it is a warning, not a gate; the user may have pushed deliberately
                            nothing). Word it concretely: "⚠ kent has 5 unpushed commits; the
                            worktree is cut from origin/main and will not contain them."
  - TESTS: rewrite `test_cwd_flag_targets_sextant` -> `test_cwd_flag_uses_registry_resolved_path`
    (assert --cwd equals the ROW's path, via a patched registry). KEEP
    `test_run_always_includes_detach_before_json` (adjust for the new arg order only — the
    run < --detach < --json ordering assertion itself must survive unchanged).
    ADD: unknown project -> names valid choices, no subprocess · blocked project -> refusal, no
    subprocess · Class C project -> refusal mentions the reason · unpushed commits -> warning
    present AND subprocess still called · /runs with no project -> --all present · /projects
    renders without touching Archon · /get still needs no project.
  - RUN: uv run python -m unittest discover tests   -> 226 + new, ALL GREEN.

Task 5 — CREATE sextant/.archon/validate.sh, and COMMIT AND PUSH it:
  - Body: `set -euo pipefail` + `uv run python -m unittest discover tests` (M1 GOTCHA 5).
  - COMMIT + PUSH (GOTCHA 1 — a worktree cut from origin/main cannot see an unpushed file).
  - Commit ONLY this file and this PRP's other sextant files. sextant has 45 unrelated dirty
    files — never `git add -A`, never stash, never revert them (M1 GOTCHA 8).

Task 6 — CREATE ~/.archon/workflows/repo-build.yaml (the directory does not exist — mkdir it):
  - READ FIRST: parameter-matrix.md and workflow-dag.md. Shape is in "Per task pseudocode".
  - FILENAME repo-build.yaml, `name: repo-build` — both DISTINCT from sextant-prd-build (GOTCHA 6).
  - `provider: claude` is MANDATORY; `model:` must be a TIER KEYWORD, never an id (GOTCHA 10).
    Tiers are already configured — confirm with `bun run cli ai tier list` before authoring.
  - NODES: preflight (bash, FIRST — GOTCHA 8) -> implement (prompt) -> validate (bash) ->
    mechanical-checks (bash) -> create-pr (command, LAST so a gh failure never loses the
    validated branch, M1 GOTCHA 2).
  - VALIDATE from two different repos to prove it is genuinely repo-agnostic:
      bun <cli> validate workflows repo-build --cwd C:/Users/karam/sextant
      bun <cli> validate workflows repo-build --cwd C:/Users/karam/Projects/Personal_AI_Assistant
  - CONFIRM discovery classifies it correctly: `workflow list --json` shows repo-build with
    "source": "global", and sextant-prd-build still present with "source": "project".
  - WATCH the loader output for `_ignored` warnings — unknown keys WARN, they do not error.

Task 7 — Promote fpv-aim-trainer. FIVE STEPS, IN THIS ORDER (GOTCHA 12):
  1. git init in claude-projects/fpv-aim-trainer; commit the 5 existing files on `main`.
  2. gh repo create 5c1p3r/fpv-aim-trainer --private --source . --remote origin --push
     (gh has `repo` scope — verified. If it prompts, hand it to the user with `!`.)
  3. Untrack from the parent: git -C ~/.claude rm -r --cached claude-projects/fpv-aim-trainer
  4. Add `claude-projects/fpv-aim-trainer/` to ~/.claude/.gitignore, in the existing
     "nested repos with their own remotes, not tracked here" block (line ~11).
  5. Commit ~/.claude (steps 3+4 in ONE commit). ~/.claude has 6 unrelated dirty files —
     commit only these two changes.
  VERIFY: `git -C <fpv> rev-parse --show-toplevel` now returns fpv itself, and
          `git -C ~/.claude ls-files claude-projects/fpv-aim-trainer` returns EMPTY.
  Do NOT promote the other five (sign-off decision — YAGNI until a build is queued).

Task 8 — Give fpv-aim-trainer a validation contract (work the INITIAL did not scope — C6):
  - fpv has ZERO tests and needs pygame-ce. trainer.py IS importable headlessly (pygame.init()
    is inside main() under __main__), so its pure functions are directly testable.
  - CREATE tests/test_trainer.py covering apply_curve (expo curve, deadzone, sign symmetry,
    clamping at ±1), axis_to_screen (axis -> pixel mapping, bounds), random_target (stays in
    bounds), and load_highscore/save_highscore round-trip via a tmp path.
  - CREATE .archon/validate.sh:
      set -euo pipefail
      uv run --with 'pygame-ce>=2.5' python -m unittest discover tests
    (`uv run --with` supplies the dep without adding a resolver file — fpv is NOT stdlib-only,
     so this is a legitimate third-party dep, unlike sextant.)
  - Run it locally until green. COMMIT AND PUSH (GOTCHA 1).
  - fpv's registry row (already written in Task 2) now passes the guard. Re-run the Task 3
    guard tests — nothing should need changing, but the live check should now go green.

Task 9 — ACCEPTANCE: build a NON-SEXTANT project through the generic workflow.
  - Pick a small, genuinely useful fpv change from PROJECTS.md's own Phase 3 backlog
    ("difficulty curve over the round, sound, alt modes"). Keep it SMALL — this is a proof of
    the engine, not a feature sprint.
  - Dispatch THROUGH THE HANDLER, not by hand — the handler is the thing under test:
      uv run python -c "import handlers.archon as a; print(a.handle_command('/run fpv-aim-trainer repo-build <message>'))"
  - POLL: workflow get <full-run-id> --json until terminal.
  - EXPECT: its OWN worktree under ~/.archon/workspaces/.../worktrees/ (NOT ~/.claude), the
    preflight node green, validate green via fpv's own .archon/validate.sh, a branch, a PR.
  - RECORD the cost against M1's measured $1.6642.
  - ALSO PROVE THE REFUSAL: /run close-read repo-build "x" must be refused with a reason and
    spend nothing. And /runs with no project must span projects.
  - IF IT FAILS: read the actual `dag_node_failed` log line. Do NOT assume it is the same class
    of bug as M1's three failures, and do NOT raise node `timeout:` in response to a "Bash node
    timed out after 120000ms" message — that label was a red herring in M1 and cost real time.

Task 10 — HUMAN-GATED review + document + retire:
  - The USER reviews and merges the fpv PR. Archon NEVER merges.
  - Live phone check: /projects, then /run against a Class C name (expect the refusal in-topic),
    then /runs with no project. Confirm replies land in topic 133, not General.
  - CREATE sextant/docs/archon-project-registry.md — the format, the four classes, the measured
    reasons each blocked class is blocked, and how to add a project.
  - MODIFY claude-projects/PROJECTS.md — fpv-aim-trainer promoted (own repo + remote + tests),
    and a pointer to the registry as the source of truth for build targets.
  - MEMORY: update the `project_archon` memory with the registry location and the four classes;
    add a `reference` memory pointing at ~/.archon/projects.md. Follow ~/.claude/CLAUDE.md's
    memory conventions (rule -> **Why:** -> **How to apply:**).
  - RENAME this PRP 0- -> 1- (plain rename; it is an untracked personal planning doc in an
    upstream OSS checkout and must NEVER enter a commit to coleam00/Archon).
  - NOTE, do not build: the builder-loop `taskkill /F /T` dead-man watchdog (more concurrent
    projects = more chances to orphan a headless child on Windows) and the LLM-judge eval gate.
    Both are explicitly out of scope.
```

### Per task pseudocode

```python
# ─── Task 3: sextant/archon_registry.py ───────────────────────────────────────
"""Archon project registry — what Archon is allowed to build on this machine.

PURE parsing + an ENFORCING guard. Mirrors telegram_assistant.parse_topics()'s house style.
The registry FILE is untracked local config; THIS FILE is the safety property. See
PRPs/0-archon-m15-system-wide-engine.md GOTCHA 4 before weakening any check here.
"""
import logging, subprocess
from pathlib import Path
from typing import NamedTuple

logger = logging.getLogger(__name__)

REGISTRY_PATH = Path(r"C:\Users\karam\.archon\projects.md")
CLAUDE_REPO = Path(r"C:\Users\karam\.claude")     # the Class C blast radius (GOTCHA 2)
GIT_TIMEOUT_SEC = 15

class ProjectRow(NamedTuple):
    name: str; path: str; cls: str; base: str; status: str

def parse_projects(text: str) -> list[ProjectRow]:
    """PURE: text -> rows. No I/O. Malformed rows are skipped, never raised.
    Mirrors parse_topics() exactly — sextant house style."""
    rows = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):          # comments + blanks
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 4:                            # malformed -> skip, never raise
            logger.warning("Skipping malformed projects.md row: %r", raw)
            continue
        status = parts[4] if len(parts) > 4 else "ok" # status column is OPTIONAL, like `trust`
        rows.append(ProjectRow(parts[0], parts[1], parts[2], parts[3], status))
    return rows

def _git(path: str, *args: str) -> tuple[int, str]:
    # PATTERN: same subprocess contract as handlers/archon.py. Never raises.
    try:
        p = subprocess.run(["git", "-C", path, *args], capture_output=True, text=True,
                           encoding="utf-8", errors="replace", timeout=GIT_TIMEOUT_SEC)
    except (subprocess.TimeoutExpired, OSError) as e:
        return 1, str(e)
    return p.returncode, (p.stdout or "").strip()

def guard(row: ProjectRow) -> str | None:
    """None => dispatchable. Otherwise a human-readable refusal naming the reason.

    CRITICAL (GOTCHA 4): the declared class is NOT trusted. The toplevel is RE-DERIVED and
    compared, so a mistaken or stale row cannot smuggle a build into ~/.claude.
    """
    if row.status != "ok":
        return f"'{row.name}' is not dispatchable ({row.status}). " + _explain(row)
    if not Path(row.path).exists():
        return f"'{row.name}': path does not exist: {row.path}"
    code, toplevel = _git(row.path, "rev-parse", "--show-toplevel")
    if code != 0:
        return f"'{row.name}': not a git repository ({row.path})"
    if Path(toplevel).resolve() == CLAUDE_REPO.resolve():
        # The whole reason this milestone exists. Say it in full.
        return (f"Refusing '{row.name}': it has no git repo of its own — it resolves to "
                f"{toplevel}. A build there would worktree the entire ~/.claude AI layer "
                f"(every skill, hook, memory file and settings.json) and hand an agent write "
                f"access to its own harness. Promote it to its own repo first.")
    if Path(toplevel).resolve() != Path(row.path).resolve():
        return (f"Refusing '{row.name}': registry says {row.path} but git resolves to "
                f"{toplevel}. Fix the registry row before dispatching.")
    code, remotes = _git(row.path, "remote")
    if code != 0 or not remotes:
        return (f"Refusing '{row.name}': no git remote. Archon cuts worktrees from "
                f"origin/{row.base} (worktree.ts:1153-1157) — with no origin, worktree "
                f"creation fails with 'fatal: invalid reference: origin/{row.base}'.")
    return None

def unpushed_count(row: ProjectRow) -> int:
    # GOTCHA 9: only meaningful against the LIVE checkout, never inside a worktree.
    code, out = _git(row.path, "rev-list", "--count", "@{u}..HEAD")
    if code != 0:
        return 0                                   # no upstream / detached HEAD -> no warning
    try:
        return int(out)
    except ValueError:
        return 0
```

```python
# ─── Task 4: handlers/archon.py — the parts that change ───────────────────────
# UNCHANGED: _archon()'s whole subprocess body, handle()'s bail/escape/truncate. Only the
# --cwd VALUE and the parsing move.

import archon_registry as registry

def _archon(*args: str, cwd: str) -> str:          # cwd is now REQUIRED, no default
    ...  # body identical to today, with ["bun", str(ARCHON_CLI), *args, "--cwd", cwd]

def _resolve_or_refuse(name: str) -> tuple[ProjectRow | None, str]:
    rows = registry.load_registry()
    row = registry.resolve(name, rows)
    if row is None:
        # NEVER silently fall back to sextant — that is the failure this milestone prevents.
        choices = ", ".join(r.name for r in rows) or "(registry empty or unreadable)"
        return None, f"Unknown project '{name}'. Registered: {choices}"
    refusal = registry.guard(row)
    if refusal:
        return None, refusal                        # spend NOTHING — no subprocess, no AI
    return row, ""

def handle_command(text: str) -> str:
    verb, _, rest = text.strip().partition(" ")
    rest = rest.strip()

    if verb == "/projects":
        rows = registry.load_registry()             # pure render; never touches Archon
        return "\n".join(f"{r.name} [{r.cls}] base={r.base} {r.status}" for r in rows) \
               or "No projects registered."

    if verb in ("/list", "/status"):
        if not rest: return f"Usage: {verb} <project>"
        row, err = _resolve_or_refuse(rest)
        if row is None: return err
        sub = "list" if verb == "/list" else "status"
        return _archon("workflow", sub, "--json", cwd=row.path)

    if verb == "/run":
        project, _, tail = rest.partition(" ")
        workflow, _, msg = tail.strip().partition(" ")
        if not project or not workflow:
            return "Usage: /run <project> <workflow> <message>"
        row, err = _resolve_or_refuse(project)
        if row is None: return err
        # GOTCHA 3 (M1): --detach is MANDATORY and must precede --json.
        reply = _archon("workflow", "run", workflow, "--detach", "--json", msg, cwd=row.path)
        n = registry.unpushed_count(row)            # GOTCHA 9: warn, do not gate
        if n:
            reply = (f"WARNING: {row.name} has {n} unpushed commit(s). The worktree is cut "
                     f"from origin/{row.base} and will NOT contain them.\n\n") + reply
        return reply

    if verb == "/runs":
        if not rest:                                 # cross-project view — the whole point
            sextant_row = registry.resolve("sextant", registry.load_registry())
            return _archon("workflow", "runs", "--all", "--json",
                           cwd=sextant_row.path if sextant_row else str(Path.cwd()))
        row, err = _resolve_or_refuse(rest)
        if row is None: return err
        return _archon("workflow", "runs", "--json", cwd=row.path)

    # /get /approve /reject: run ids are globally addressable (GOTCHA 14) — unchanged from M1,
    # including /approve's "(ack only, does not resume …)" suffix (M1 GOTCHA 4). They still
    # need SOME cwd; use the sextant row's path.
    ...
```

```yaml
# ─── Task 6: ~/.archon/workflows/repo-build.yaml ──────────────────────────────
# Read parameter-matrix.md before changing any field. Unknown keys WARN, they do not error.
name: repo-build # DISTINCT from sextant-prd-build (GOTCHA 6 — filename + name)
description: |
  Use when: Building a change in ANY registered Archon project.
  Input: a plain-language description of the change, or a path to a spec file in the repo.
  Does: preflight (validation contract present?) -> implement -> validate via the repo's own
        .archon/validate.sh -> mechanical checks -> PR. The human always merges.
  NOT for: repos with no .archon/validate.sh — the preflight node fails loudly and early.

provider: claude # GOTCHA 10 — the DB row says codex; never rely on the default
model:
  medium # TIER, not a model id (GOTCHA 10). Resolves from ~/.archon/config.yaml
  # -> claude/claude-sonnet-5. "Sonnet for execution" — this is the
  # execution end of the loop; `large` belongs in planning workflows.

worktree:
  enabled: true # force isolation; reject --no-worktree

nodes:
  - id: preflight # FIRST — GOTCHA 8: never pay for implement you cannot validate
    bash: |
      set -uo pipefail
      if [ ! -f .archon/validate.sh ]; then
        echo "FAIL: this repo has not declared a validation contract." >&2
        echo "Expected an executable .archon/validate.sh (exit 0 = green), committed AND" >&2
        echo "pushed — the worktree is cut from origin/$BASE_BRANCH and cannot see local" >&2
        echo "-only files. Refusing to build something no one can validate." >&2
        exit 1
      fi
      echo "Validation contract present: .archon/validate.sh"

  - id: implement
    depends_on: [preflight]
    prompt: |
      Implement the following change in this repository:

      $ARGUMENTS

      Read this repo's CLAUDE.md (if present) and obey its constitution — dependency rules,
      test layout, and style are per-repo and are NOT assumed by this workflow.
      Add or update tests for what you change.
      Do NOT run the validation command yourself — a later node does that.
    maxBudgetUsd:
      3.00 # Claude-only, prompt/command nodes only. Circuit breaker, not an
      # estimate. NOTE: billing is SUBSCRIPTION (all API-key env vars
      # unset), so M1's "$1.6642" is the SDK's NOTIONAL API-equivalent
      # figure, not a charge — the real constraint is Pro/Max quota burn.

  - id: validate
    depends_on: [implement]
    bash: |
      set -uo pipefail
      # The repo computes; the YAML only coordinates.
      # (workflow-language-constitution: archon.diy/reference/workflow-language-constitution/)
      bash .archon/validate.sh 2>&1 | tee "$ARTIFACTS_DIR/validate.log"
      exit "${PIPESTATUS[0]}"
    timeout: 900000 # 15 min. `timeout` is bash/script ONLY (parameter-matrix).

  - id: mechanical-checks # COPIED near-verbatim from sextant-prd-build.yaml — repo-agnostic
    depends_on: [validate]
    bash: |
      set -uo pipefail
      BASE="${BASE_BRANCH:-main}"          # GOTCHA 7: env var, not text substitution
      CHANGED=$(git diff --name-only "origin/$BASE"...HEAD)   # GOTCHA 13: needs an origin
      echo "=== changed files vs origin/$BASE ==="; echo "$CHANGED"
      FORBIDDEN=$(echo "$CHANGED" | grep -iE '(^|/)\.env($|\.)|(^|/)settings/|secret|token' || true)
      if [ -n "$FORBIDDEN" ]; then
        echo "=== FAIL: forbidden paths in diff ==="; echo "$FORBIDDEN"; exit 1
      fi
      echo "No forbidden paths touched."

  - id: create-pr # LAST — a gh failure must never lose the validated branch
    command: archon-create-pr
    depends_on: [mechanical-checks]
    context: fresh
```

### Integration Points

```yaml
REGISTRY:
  - file: C:\Users\karam\.archon\projects.md          # UNTRACKED by design (GOTCHA 5)
  - consumer: sextant/archon_registry.py -> handlers/archon.py
  - contract: `name | path | class | base | status`; comments/blanks skipped; malformed skipped

HOME_WORKFLOWS:
  - dir:  C:\Users\karam\.archon\workflows\           # DOES NOT EXIST — mkdir in Task 6
  - file: repo-build.yaml  (`source: 'global'`, precedence bundled < global < project BY FILENAME)

TELEGRAM_REGISTRY:
  - file: C:\Users\karam\sextant\settings\topics.md   # UNCHANGED — still `133 | archon | ...`
  - contract: handlers.archon must keep exposing handle(update); loaded by dotted path each poll

VALIDATION_CONTRACT:
  - sextant: .archon/validate.sh -> `uv run python -m unittest discover tests`
  - fpv:     .archon/validate.sh -> `uv run --with 'pygame-ce>=2.5' python -m unittest discover tests`
  - BOTH must be committed AND PUSHED (GOTCHA 1)

PARENT_REPO:
  - file: C:\Users\karam\.claude\.gitignore          # + claude-projects/fpv-aim-trainer/
  - op:   git rm -r --cached claude-projects/fpv-aim-trainer   (Task 7, same commit)

SCHEDULER:
  - NO new scheduled task. SextantTelegramAssistant (every 60s) is the ONLY getUpdates
    consumer and already drives the poll (GOTCHA 0).

MEMORY:
  - update: project_archon      — registry location, the four classes, fpv promoted
  - add:    a `reference` memory pointing at ~/.archon/projects.md
  - index:  one line each in MEMORY.md
```

## Validation Loop

### Level 1: Preflight & Syntax

```bash
# 1a — the symlink must resolve (Task 0). A dangling source is a silent build-time failure.
test -e ~/.archon/workspaces/5c1p3r/Sextant/source && echo OK || echo DANGLING
# Expected: OK

# 1b — credential mode MUST stay subscription (M1 GOTCHA 1). A stray key = metered billing.
printenv ANTHROPIC_API_KEY CLAUDE_API_KEY CLAUDE_CODE_OAUTH_TOKEN
# Expected: three empty lines.

# 1c — the workflow is valid FROM MORE THAN ONE REPO (that is what "repo-agnostic" means)
bun C:/Users/karam/Archon/packages/cli/src/cli.ts validate workflows repo-build --cwd C:/Users/karam/sextant
bun C:/Users/karam/Archon/packages/cli/src/cli.ts validate workflows repo-build --cwd C:/Users/karam/Projects/Personal_AI_Assistant
# Expected: 0 errors both times. Watch stderr for `_ignored` loader warnings.

# 1d — discovery classifies the scopes correctly
bun C:/Users/karam/Archon/packages/cli/src/cli.ts workflow list --json --cwd C:/Users/karam/sextant \
  | grep -E '"name": "(repo-build|sextant-prd-build)"' -A2
# Expected: repo-build -> "source": "global"; sextant-prd-build -> "source": "project".
```

### Level 2: Unit Tests

```bash
cd C:/Users/karam/sextant && uv run python -m unittest discover tests
# Expected: 226 existing + the new archon_registry and handler tests, ALL GREEN.
# NOTE: bare `python` is rejected by a hook on this machine — `uv run python` is mandatory.
# If failing: read the error, fix the code, re-run. NEVER mock to pass.

cd C:/Users/karam/.claude/claude-projects/fpv-aim-trainer && bash .archon/validate.sh
# Expected: green (after Task 8).
```

### Level 3: Integration

```bash
# 3a — the guard refuses Class C WITHOUT touching Archon (no cost, no subprocess)
cd C:/Users/karam/sextant
uv run python -c "import handlers.archon as a; print(a.handle_command('/run close-read repo-build x'))"
# Expected: a refusal naming the ~/.claude blast radius. NOT a workflow run.

# 3b — an unknown project names the valid choices and never falls back to sextant
uv run python -c "import handlers.archon as a; print(a.handle_command('/run nope repo-build x'))"
# Expected: "Unknown project 'nope'. Registered: sextant, kent, fpv-aim-trainer, ..."

# 3c — the registry renders, and --cwd is registry-resolved
uv run python -c "import handlers.archon as a; print(a.handle_command('/projects'))"
uv run python -c "import handlers.archon as a; print(a.handle_command('/list kent')[:400])"
# Expected: the project table; then kent's workflows (NOT sextant's). Check for scopeFallback.

# 3d — cross-project view
uv run python -c "import handlers.archon as a; print(a.handle_command('/runs')[:600])"
# Expected: runs from more than one project.

# 3e — THE ACCEPTANCE BUILD (Task 9): a non-sextant Class A project, end to end
uv run python -c "import handlers.archon as a; print(a.handle_command('/run fpv-aim-trainer repo-build <small change>'))"
bun C:/Users/karam/Archon/packages/cli/src/cli.ts workflow get <full-run-id> --json \
  --cwd C:/Users/karam/.claude/claude-projects/fpv-aim-trainer
# Expected: worktree under ~/.archon/workspaces/... (NEVER ~/.claude), preflight green,
#           validate green via fpv's own .archon/validate.sh, branch + PR created.

# 3f — live phone test: /projects, a Class C /run, and /runs in topic 133.
# Expected: replies land IN TOPIC 133, not General; the refusal is legible on a phone.
```

## Final validation Checklist

- [ ] `~/.archon/workspaces/5c1p3r/Sextant/source` resolves AND a probe worktree was created
      and removed through it (write path proven, not inferred)
- [ ] All three Claude credential env vars empty (subscription billing confirmed)
- [ ] `~/.archon/projects.md` exists with every surveyed project and an accurate class/status
- [ ] `parse_projects()` is pure; malformed rows skipped not raised; missing file -> `[]`
- [ ] The guard refuses on the **derived** toplevel, not the declared class (GOTCHA 4)
- [ ] `handlers/archon.py` has no hardcoded sextant path; every `--cwd` is registry-resolved
- [ ] `test_run_always_includes_detach_before_json` still passes
- [ ] `uv run python -m unittest discover tests` — 226 + new, all green
- [ ] `validate workflows repo-build` passes from two different repos
- [ ] `repo-build` fails at **preflight** in a repo with no `.archon/validate.sh`
- [ ] fpv-aim-trainer: own repo + remote, untracked by `~/.claude`, real tests, validate.sh green
- [ ] A `/run` against fpv-aim-trainer completed in its own worktree via its own validate command
- [ ] A `/run` against a Class C project was refused, in-topic, naming the reason, at zero cost
- [ ] `/runs` with no project spans projects
- [ ] Build cost recorded vs M1's $1.6642
- [ ] Human merged the fpv PR (Archon never merges)
- [ ] `docs/archon-project-registry.md`, `PROJECTS.md`, and the memories updated
- [ ] This file renamed `0-` -> `1-` (plain rename; never committed to `coleam00/Archon`)

---

## Anti-Patterns to Avoid

- ❌ Do NOT let an unknown project name silently fall back to sextant. That is the exact failure
  this milestone exists to prevent.
- ❌ Do NOT trust the registry's declared class. Re-derive `git rev-parse --show-toplevel`.
- ❌ Do NOT "fix" Class B or Class C with `--no-worktree` or `--folder`. That removes the
  isolation property that made Archon worth adopting (settled at sign-off).
- ❌ Do NOT promote the other five nested projects. fpv-aim-trainer and ONLY it.
- ❌ Do NOT name the global workflow `sextant-prd-build` hoping for an override — override is by
  FILENAME, and a duplicate `name:` is a hard load error that drops BOTH files (GOTCHA 6).
- ❌ Do NOT put the validation-contract check after `implement` — you pay for a build you can
  never validate (GOTCHA 8).
- ❌ Do NOT put the unpushed-commit check inside the workflow — inside the worktree there is
  nothing to compare against (GOTCHA 9).
- ❌ Do NOT text-substitute `$ARGUMENTS` into a `bash:` body — it arrives as an env var (GOTCHA 7).
- ❌ Do NOT enable Archon's Telegram adapter or set `TELEGRAM_BOT_TOKEN` for Archon (GOTCHA 0).
- ❌ Do NOT create `C:\Users\karam\Archon\.env` with an API key — silent metered billing.
- ❌ Do NOT edit `C:\Users\karam\Archon\.archon\config.yaml` — that is upstream's dogfooding config.
- ❌ Do NOT commit `INITIAL.md`, `HANDOFF.md`, or `PRPs/` to `coleam00/Archon`.
- ❌ Do NOT `git add -A` in sextant (45 dirty files), `~/.claude` (6), or Kent (46). Never stash,
  never revert, and NEVER run `git clean -fd` anywhere in this flow.
- ❌ Do NOT raise a node `timeout:` in response to "Bash node timed out after 120000ms" — that
  label was a red herring in M1. Read `stderrTail` for the real cause first.
- ❌ Do NOT build the dead-man watchdog or the LLM-judge eval gate. Note them; they are M6+.
- ❌ Do NOT let Archon merge. The human merges.

---

## Confidence Score: 7/10

**Why 7 and not M1's 8.** The engineering is _more_ certain than M1's was — every environmental
unknown the INITIAL flagged is now closed by measurement rather than left open. Class B was
explicitly "unverified" in the INITIAL and is now settled by two independent proofs; the Archon
checkout's unbuildability, Kent's five unpushed commits, fpv's tracked-by-parent status, and the
filename-vs-name override rule were all discovered here rather than at execution time. The
handler and registry work is near-mechanical against files that already exist and are already
tested, and sextant's 226-test suite is a real regression net.

**The 3 points off, and where a one-pass run can still stall:**

1. **Task 8 is genuinely unscoped work the INITIAL did not anticipate.** fpv-aim-trainer has zero
   tests and a pygame dependency. Writing its first real test suite is not mechanical, and the
   milestone's headline acceptance criterion depends on it. If `apply_curve`/`axis_to_screen`
   turn out to be entangled with pygame state in ways the module-level read didn't reveal, this
   task grows.
2. **Task 7 touches the `~/.claude` git repo**, which is the highest-blast-radius operation in the
   milestone — it currently has 6 dirty files and sits on a non-main branch. The `git rm --cached`
   - `.gitignore` + commit sequence must not sweep up unrelated work.
3. **Task 0's write path is proven by proxy, not by a real build.** The probe worktree issues the
   same git command Archon issues, but Archon's own path resolution (`getProjectSourcePath`,
   symlink traversal, workspace bookkeeping) is only truly exercised by Task 9. M1 burned three
   builds on exactly this gap between a working read path and a broken write path.

**Also uncertain, and worth measuring rather than predicting:** the acceptance build's cost. M1's
single measured build was $1.6642 against a repo whose constitution the prompt spelled out
explicitly. `repo-build` deliberately does _not_ spell out any repo's constitution — it tells the
agent to go read the repo's own CLAUDE.md — which is the right design for a generic engine but
adds discovery turns. `maxBudgetUsd: 3.00` is a circuit breaker, not an estimate.

---

## APPLIED — 2026-08-10

All 10 tasks executed. Full validation suite green: 256 sextant tests (226 baseline + 19
registry + 11 net new handler), 16 local fpv-aim-trainer tests, 22 tests via the acceptance
build. Acceptance build cost **$1.2049938** vs M1's $1.6642 reference. Outstanding items are
human-only and listed at the bottom — everything the engine itself needed to do is done.

**Where execution diverged from spec:**

1. **Task 0 — `ln -s` is not safe on this machine; use `mklink /J` directly, don't treat it as
   a fallback.** Git Bash's `ln -s` on the dangling `Sextant/source` symlink, lacking symlink
   privilege, did **not** fail loudly — it silently created a full recursive **copy** of
   sextant (538 files) as a real directory. `test -e` passed, `ls` showed correct content, and
   nothing about the shell output indicated a problem; only `dir` (native cmd) revealed it was
   a plain `<DIR>`, not a `<JUNCTION>`. Had this gone undetected, Archon would have worktreed a
   stale, ever-diverging copy instead of the live repo — silently, indefinitely. The PRP framed
   `mklink /J` as a fallback "if the symlink cannot be created"; in practice `ln -s` "succeeds"
   (exit 0, no error) while doing the wrong thing, so the fallback path never triggers on its
   own. **Recommendation for next time:** skip `ln -s` on Windows entirely and use
   `cmd /c mklink /J` directly, then verify with `fsutil reparsepoint query` or `dir` (not
   `test -e` alone — it can't distinguish a junction from a copy).

2. **Task 7 — promoted fpv-aim-trainer by moving it out of `~/.claude` entirely, not via the
   PRP's in-place `git init` + `git rm --cached` + `.gitignore` recipe.** User-directed
   mid-execution. Moved to `C:\Users\karam\fpv-aim-trainer` (matching sextant/kent's
   top-level-under-home convention) before `git init`, so there was never a repo nested inside
   another repo's working tree to untrack — the old path simply stopped existing, and
   `~/.claude` saw the three previously-tracked files as deletions to commit. No `.gitignore`
   edit was needed (the PRP's step 4): once the directory doesn't exist under `~/.claude`, there
   is nothing for a future `git add -A` there to accidentally re-pick-up. This is a cleaner
   result than the PRP's literal recipe would have produced and avoids the exact
   double-tracking risk the PRP calls out `agent-core` as a cautionary example of — but it means
   `fpv-aim-trainer`'s final path differs from what Task 2's registry table originally specified
   (`C:\Users\karam\.claude\claude-projects\fpv-aim-trainer`); the registry row was corrected to
   `C:\Users\karam\fpv-aim-trainer` after the move, and the guard was re-verified live (`None`
   — dispatchable) against the new path.

3. **Task 9 — first dispatch attempt failed at worktree creation, not at any AI/implementation
   step.** `git -C C:/Users/karam/fpv-aim-trainer fetch origin main` failed once
   (`Sync fetch from origin/main failed`) immediately after `gh repo create --push` — most
   likely a transient timing/network blip right after the push, since the identical command
   succeeded on manual retry seconds later, both directly and through the junction path Archon
   actually uses. No run row was created by the failed attempt (confirmed via `workflow runs
--json` returning empty) and no stale worktree was left behind, so the retry was clean. Per
   the PRP's own instruction not to assume failures match M1's failure classes: this one didn't
   — it was pre-implementation infrastructure, not a workflow bug, and needed no code change.

4. **Level 1 check 1d doesn't apply to this CLI version as written.** `workflow list --json`'s
   CLI output carries no per-workflow `"source"` field (only the HTTP `GET /api/workflows`
   endpoint does, per the root CLAUDE.md). Verified the same substance — that `repo-build` is
   correctly classified as home/global scope, distinct from `sextant-prd-build`'s project scope
   — via the discovery log lines instead (`home_workflows_loaded count:1`, `bundled count:21`,
   totals of 23 from sextant vs 22 from Kent, the delta being Kent's lack of a project workflow).

5. **`workflow run --detach --json`'s output has no `runId` field.** Only `conversationId` and
   `logPath` are returned synchronously (the run row is created by the detached child, not the
   parent process). The actual run id was recovered from the detached child's log
   (`workflow_starting` event's `workflowRunId` field) rather than from the initial dispatch
   response the PRP's pseudocode implied would carry it.

6. **Unrelated concurrent activity on this machine, twice.** While Task 9's build was running,
   something else (almost certainly another live session) created and committed to a new
   sextant branch (`feat/roadmap-now-block`, `feat(brief): surface the roadmap Now block...`,
   itself an Archon-built PRP) and separately began installing a Claude Code plugin
   (`understand-anything`) inside `~/.claude`. A docs commit of mine landed on top of the
   former by accident (branch had been silently switched from under a same-repo `git commit`);
   recovered by `git cherry-pick`-ing it onto `main` and resetting the other branch back to its
   pre-existing tip, so neither the unrelated feature branch nor the in-progress plugin install
   was disturbed. Every commit in this PRP's execution staged an explicit file list, never
   `git add -A` — this is the reason that discipline mattered in practice, not just in theory.

**Outstanding (human-only, per the PRP's own "Archon never merges" rule):**

- [ ] Review and merge [PR #1](https://github.com/5c1p3r/fpv-aim-trainer/pull/1) (difficulty
      curve over the round) against `5c1p3r/fpv-aim-trainer`.
- [ ] Live phone check in Telegram topic 133: `/projects`, a Class C `/run` refusal, `/runs`
      with no project. (The free/no-cost half of this — the same calls through the real handler
      in-process — was verified during execution; only the actual Telegram round-trip is
      unverified.)
