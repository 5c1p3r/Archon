# Handoff: Social-posting tools triage + Obsidian-alternative trial

**Date:** 2026-10-16
**Branch:** dev (Archon repo, but none of this is Archon code. The cwd was incidental. All edits are under `~/.claude`.)
**Last Commit:** 879c99fe4 (unrelated). Nothing committed this session.

## Goal

Karam asked what to think of adding composio, upstash, zernio and 2Slides to the Claude config. The thread then moved to Blotato (forgotten, installed but never set up), cheaper posting backends, and an Obsidian-alternative trial on a second, empty laptop.

## Completed

- [x] Verdict on the four tools: add none now. Composio is already connected, Upstash is only worth it for Context7, Zernio only if it replaces Blotato, 2Slides overlaps `pptx`.
- [x] Blotato status checked: skills installed, **MCP server not configured**, no `BLOTATO_API_KEY`, no `brand-brief.md`.
- [x] Pricing checked (third-party sources, unverified): Blotato has no free API/MCP path ($29/mo Starter); Zernio is free for the first 1-2 accounts, then ~$6/account/mo; ClawPost is free at 25 posts/mo.
- [x] `claude-projects/ROADMAP.md` `## Parked`: added **Zernio** and **ClawPost** entries (2026-10-15). Both still present after the on-disk change noticed at handoff time.
- [x] Located the earlier Obsidian-alternatives chat: Kent session `~/.claude/projects/C--Users-karam-kent/14a3f9ce-31c0-46c4-9a4d-7ed51d78e338.jsonl` (Oct 11).

## In Progress / Next Steps

- [ ] **Obsidian trial on the empty laptop.** Karam has not yet said which app (Joplin recommended, Logseq runner-up) or whether that laptop is on the campus network. Ask both, then set up. Do **not** point any app at the live vault `C:\Users\karam\Obsidian Vault`, because Logseq can rewrite files and the edits would sync back to PC and phone. Use a copy or a receive-only Syncthing share.
- [ ] Zernio eval (Parked): confirm the free tier includes API/MCP and its post limit, and port `post-scheduler` (hard-wired to `mcp__blotato__*`) only after an account is connected.
- [ ] Optional: run `brand-brief` so `post-writer` has voice context. No account needed.

## Key Decisions

- **Zernio over Blotato for a first test**: free tier vs $29/mo, with no free trial of the API on Blotato.
- **ClawPost is last resort**: it automates the browser session (ban risk, vendor holds session access), and no scheduling was seen.
- **No `PROJECTS.md` entry**: Zernio/ClawPost are unevaluated tools, and the precedent (Odysseus, REA) has none either. Add one at toolshed verdict or when the port starts.
- **Queue = ROADMAP `## Parked`**, by explicit request. Memory notes say Karam rarely checks that list, so surface these if they ask again.

## Dead Ends (Don't Repeat These)

- `grep -r` over all of `~/.claude` times out. Scope to specific dirs.
- Raw keyword search for "obsidian" returns ~40 irrelevant knowledge-base files. Searching session transcripts in `projects/*/*.jsonl` found the right chat.
- Python on this box defaults to cp1252. Use `PYTHONIOENCODING=utf-8` when printing transcript text.

## Files Changed

- `~/.claude/claude-projects/ROADMAP.md`: added Zernio and ClawPost under `## Parked`.
- `HANDOFF-2026-10-16-social-tools.md`: NEW, this file. Written under a new name because an untracked, unrelated `HANDOFF.md` (Hermes setup, 2026-08-29, 28 KB) already exists in this directory and was not overwritten.

## Current State

- **Tests / type-check / lint / build:** not applicable (config and docs only).
- **Repo:** pre-existing dirty state untouched (`.archon/direction.md`, `README.md`, untracked `PRPs/`, `INITIAL.md`, etc.).

## Context for Next Session

Nothing here is blocking. Karam's pending choice is which Obsidian alternative to trial on the second laptop. The earlier Syncthing setup hit campus-network filtering (Cisco Umbrella blocks discovery), which is why Joplin with WebDAV/OneDrive sync was favoured. All pricing claims came from web searches and third-party pages.

**Recommended first action:** ask Karam which app (Joplin or Logseq) and whether the second laptop is on campus Wi-Fi.
