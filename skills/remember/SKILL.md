---
name: remember
description: Automates session logging to the project workspace and Git. Use this to summarize the current state and maintain a detailed, reverse-chronological history in 'session-history.md'. The 'latest-session.md' file is automatically updated with a consolidated 'Day View' aggregating all activities from the current date for rapid context recovery.
---

# Session Logger

This skill provides a structured way to maintain a persistent record of your work in the project workspace and Git history.

## Workflow

When the user asks to "log this session," "save our work," or "checkpoint," follow these steps:

1.  **Synthesize:** Create a clear, technical summary of what was accomplished in the current session and a concise list of **Suggested Next Steps**.
2.  **Execute Logger:** Use the `scripts/log_session.cjs` script to update the project workspace.
    - **Command:** `node <path-to-skill>/scripts/log_session.cjs "<Title>" "<Summary>" "<NextSteps>" ["<Plan>"] ["<Outcome>"]`
    - **Title:** A concise name for the current work block.
    - **Summary:** A bulleted list or paragraph of technical accomplishments.
    - **NextSteps:** Actionable items for the immediate future (Turn-based, not aggregated).
    - **Plan (Optional):** The proposed strategy for the session.
    - **Outcome (Optional):** The execution and validation details.
3.  **Confirm:** Tell the user the workspace has been updated and the changes committed to Git.

## Context Recovery

When starting a new session or if the user asks "where did we leave off?", you MUST:

1.  **Read Global Recall:** First, read the global `latest-session.md` at `~/.gemini/session_log/` to identify the absolute last turn across all projects.
2.  **Verify Project Local Context:** Check if the current directory is a Git repository. If it is, read the project-local `session_log/latest-session.md`.
3.  **Read Back Next Steps:**
    - Provide a technical summary of the day's activity across all projects.
    - **Read back the absolute last Suggested Next Steps from the global context.**
    - If the global turn was in a different project, **also read back the Suggested Next Steps from the project-local context** to ensure continuity for the current workspace.
4.  Acknowledge the daily progress and offer to start on the latest suggested next step.

## File Locations

- **Long-running Log:** `session_log/session-history.md` (Reverse-chronological history)
- **Daily Capture:** `session_log/latest-session.md` (Aggregated 'Day View' - Overwritten each time)
- **Skill Path:** `skills/remember/`
