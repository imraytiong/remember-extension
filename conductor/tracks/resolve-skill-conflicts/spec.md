# Specification: Resolve Skill Conflicts

## Problem
The Gemini CLI is reporting skill conflicts on startup:
- `remember` skill is present in both `~/.gemini/skills/` and `~/.gemini/extensions/remember/skills/`.
- `conductor-roadmap` skill is present in both `~/.gemini/skills/` and `~/.gemini/extensions/conductor-roadmap/skills/`.

## Goal
Resolve these conflicts while supporting a live development workflow by removing the standalone skills and symlinking the local development project directories directly to `~/.gemini/extensions/`.