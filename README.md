# Remember Extension

A Gemini CLI extension that provides the `remember` skill to automate session logging and project history tracking.

## Overview

The **Remember** extension allows the Gemini CLI to maintain a persistent, technical record of your work across sessions. It helps with context recovery, daily activity summaries, and maintains a clean history of project accomplishments.

## Installation

```bash
gemini extension install https://github.com/imraytiong/remember-extension
```

## How to Use

### Natural Language Prompts

You can use the following types of prompts to trigger the `remember` skill:

- **Checkpointing:**
  - "Log this session"
  - "Save our work"
  - "Create a checkpoint"
  - "Summarize what we've done and log it"
- **Context Recovery:**
  - "Where did we leave off?"
  - "What did we do last time?"
  - "Read the latest session log"
  - "Summarize today's activity"

### Automation

When you ask to "log this session," the agent will:
1.  **Synthesize** a technical summary of the current session's accomplishments.
2.  **Generate** actionable next steps for the future.
3.  **Update** the workspace files (`session_log/session-history.md` and `session_log/latest-session.md`).
4.  **Commit** the log changes to your local Git repository.

## File Structure

- `session_log/session-history.md`: A persistent, reverse-chronological history of all logged sessions.
- `session_log/latest-session.md`: A consolidated 'Day View' that is overwritten with the latest summary for quick context recovery.

## Skill Details

- **Skill Name:** `remember`
- **Capability:** Automated logging via `scripts/log_session.cjs`
