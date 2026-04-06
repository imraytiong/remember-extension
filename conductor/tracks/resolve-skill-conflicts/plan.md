# Implementation Plan: Resolve Skill Conflicts

- [x] Remove conflicting symlinks from `~/.gemini/skills/`:
  - `remember`
  - `conductor-roadmap`
- [x] Remove static extension folders from `~/.gemini/extensions/`:
  - `remember`
  - `conductor-roadmap`
- [x] Symlink local dev projects to `~/.gemini/extensions/`:
  - `~/projects/remember-extension` -> `~/.gemini/extensions/remember`
  - `~/projects/conductor-roadmap-extension` -> `~/.gemini/extensions/conductor-roadmap`