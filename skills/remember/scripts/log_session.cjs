const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Finds the nearest directory containing a .git folder, starting from the current working directory.
 * @returns {string|null} The path to the Git root or null if not found.
 */
function findGitRoot(startDir = process.cwd()) {
    let current = path.resolve(startDir);
    while (current !== path.parse(current).root) {
        if (fs.existsSync(path.join(current, '.git'))) {
            return current;
        }
        current = path.dirname(current);
    }
    return null;
}

/**
 * Executes a shell command with a retry mechanism.
 * @param {string} command The command to execute.
 * @param {number} maxRetries Maximum number of attempts.
 */
function execWithRetry(command, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return execSync(command, { stdio: 'pipe' });
        } catch (error) {
            attempt++;
            if (attempt === maxRetries) throw error;
            console.log(`Command failed: "${command}". Retrying (${attempt}/${maxRetries})...`);
            // Exponential backoff or simple sleep
            execSync(`sleep ${attempt}`);
        }
    }
}

// Configuration
const GIT_ROOT = findGitRoot();
const DEFAULT_GLOBAL_LOG_ROOT = path.resolve(__dirname, '../../../'); // ~/.gemini/
const GLOBAL_LOG_ROOT = process.env.GEMINI_GLOBAL_LOG_ROOT || DEFAULT_GLOBAL_LOG_ROOT;

// Determine the active log roots
const PROJECT_LOG_ROOT = GIT_ROOT;
const PROJECT_LOG_DIR = PROJECT_LOG_ROOT ? path.join(PROJECT_LOG_ROOT, 'session_log') : null;
const PROJECT_LOG_FILE = PROJECT_LOG_DIR ? path.join(PROJECT_LOG_DIR, 'session-history.md') : null;
const PROJECT_LATEST_FILE = PROJECT_LOG_DIR ? path.join(PROJECT_LOG_DIR, 'latest-session.md') : null;

const GLOBAL_LOG_DIR = path.join(GLOBAL_LOG_ROOT, 'session_log');
const MASTER_LOG_FILE = path.join(GLOBAL_LOG_DIR, 'master-history.md');
const GLOBAL_LATEST_FILE = path.join(GLOBAL_LOG_DIR, 'latest-session.md');

function getTimestamp() {
    const now = new Date();
    const iso = now.toISOString();
    return iso.split('.')[0].slice(0, 16).replace('T', ' ');
}

function getDailySummaryAggregation(logFilePath, dateStr) {
    if (!fs.existsSync(logFilePath)) return null;
    const content = fs.readFileSync(logFilePath, 'utf8');
    
    // Split by Turn headers
    const sections = content.split('\n## ');
    
    const todayEntriesRaw = sections.filter(s => s.trim().startsWith(`[${dateStr}]`));
    
    if (todayEntriesRaw.length === 0) return null;

    let combinedSummary = "";

    // Oldest to newest
    const chronologicalEntries = [...todayEntriesRaw].reverse();

    chronologicalEntries.forEach((entry) => {
        const titleLine = entry.split('\n')[0];
        const title = titleLine.replace(/\[.*?\] /, '').trim();
        
        const summaryPart = entry.split('### 📝 Summary')[1];
        
        if (summaryPart) {
            const summaryText = summaryPart.split('###')[0].trim();
            combinedSummary += `### ${title}\n`;
            combinedSummary += `#### 📝 Summary\n${summaryText}\n\n`;
        }
    });

    return combinedSummary.trim();
}

function logToHistory(filePath, entry) {
    const header = '# Gemini Session History\n\n';
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, header + entry);
    } else {
        const currentContent = fs.readFileSync(filePath, 'utf8');
        const contentWithoutHeader = currentContent.startsWith(header) 
            ? currentContent.slice(header.length) 
            : currentContent;
        
        const updatedContent = header + entry + contentWithoutHeader;
        fs.writeFileSync(filePath, updatedContent);
    }
}

/**
 * Simple file-based lock.
 */
function acquireLock(lockPath, maxRetries = 1000) {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            // 'wx' flag: open for writing, fails if file exists
            const fd = fs.openSync(lockPath, 'wx');
            fs.closeSync(fd);
            return true;
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
            attempts++;
            // Random delay between 50ms and 150ms to reduce thundering herd
            const waitMs = 50 + Math.floor(Math.random() * 100);
            try {
                // Use python3 for sub-second sleep as it's more portable than 'sleep 0.x'
                execSync(`python3 -c "import time; time.sleep(${waitMs / 1000})"`);
            } catch (e) {
                // Fallback to integer sleep if python fails
                execSync(`sleep 1`);
            }
        }
    }
    throw new Error(`Could not acquire lock on ${lockPath} after ${maxRetries} attempts`);
}

function releaseLock(lockPath) {
    try {
        if (fs.existsSync(lockPath)) {
            fs.unlinkSync(lockPath);
        }
    } catch (err) {
        // Ignore errors during release
    }
}

function logSession(title, summary, nextSteps, plan = "", outcome = "") {
    const timestamp = getTimestamp();
    const dateStr = new Date().toLocaleDateString();
    const projectName = GIT_ROOT ? path.basename(GIT_ROOT) : "Global";

    // Ensure directories exist
    if (PROJECT_LOG_DIR && !fs.existsSync(PROJECT_LOG_DIR)) fs.mkdirSync(PROJECT_LOG_DIR, { recursive: true });
    if (!fs.existsSync(GLOBAL_LOG_DIR)) fs.mkdirSync(GLOBAL_LOG_DIR, { recursive: true });

    const lockPath = path.join(GLOBAL_LOG_DIR, '.lock');

    let historyEntry = `
## [${dateStr}] [${projectName}] ${title}
**Timestamp:** \`${timestamp}\`
**Project:** \`${projectName}\`
`;

    if (plan) historyEntry += `\n### 📋 Proposed Plan\n${plan}\n`;
    if (outcome) historyEntry += `\n### ✅ Execution & Validation\n${outcome}\n`;
    historyEntry += `\n### 📝 Summary\n${summary}\n\n### 🚀 Suggested Next Steps\n${nextSteps}\n\n---\n`;

    try {
        acquireLock(lockPath);

        // 2. Log to PROJECT file (if in project)
        if (PROJECT_LOG_FILE) {
            logToHistory(PROJECT_LOG_FILE, historyEntry);
            const dailySummary = getDailySummaryAggregation(PROJECT_LOG_FILE, dateStr);
            const projectLatest = `---
type: daily-session-capture
date: ${dateStr}
last_update: ${timestamp}
---
# Project Summary: ${projectName} (${dateStr})

## Daily Activity Log
${dailySummary || summary}

## 🚀 Suggested Next Steps
${nextSteps}

---
*Generated by Gemini CLI - Session Logger*
`;
            fs.writeFileSync(PROJECT_LATEST_FILE, projectLatest);
        }

        // 3. Log to GLOBAL Master History
        logToHistory(MASTER_LOG_FILE, historyEntry);
        
        // 4. Update GLOBAL Latest Session (Unified Recall)
        const dailyGlobalSummary = getDailySummaryAggregation(MASTER_LOG_FILE, dateStr);
        const globalLatest = `---
type: global-daily-session-capture
date: ${dateStr}
last_update: ${timestamp}
---
# Global Session Recall: ${dateStr}

## Unified Activity Log (All Projects)
${dailyGlobalSummary || summary}

## 🚀 Suggested Next Steps (Current)
[${projectName}] ${nextSteps}

---
*Generated by Gemini CLI - Session Logger*
`;
        fs.writeFileSync(GLOBAL_LATEST_FILE, globalLatest);

        // 5. Git Sync (Project Repo)
        if (GIT_ROOT) {
            process.chdir(GIT_ROOT);
            try {
                const projectLogRelative = path.relative(GIT_ROOT, PROJECT_LOG_FILE);
                const projectLatestRelative = path.relative(GIT_ROOT, PROJECT_LATEST_FILE);

                console.log("Syncing session logs to Git...");
                
                // Add files
                execWithRetry(`git add "${projectLogRelative}" "${projectLatestRelative}"`);
                
                // Check for changes
                const status = execSync('git status --porcelain').toString().trim();
                if (status.includes(projectLogRelative) || status.includes(projectLatestRelative)) {
                    // Pull to avoid conflicts
                    try {
                        execWithRetry('git pull origin main --rebase');
                    } catch (e) {
                        // Ignore pull errors in local-only or clean repos, but rebase helps if remote changed
                    }

                    // Commit
                    execWithRetry(`git commit -m "docs: session log - ${title}"`);
                    
                    // Push
                    try {
                        execWithRetry('git push origin main');
                        console.log("Project logs committed and pushed to Git.");
                    } catch (e) {
                        console.warn("Git push failed. Changes remain committed locally.");
                    }
                } else {
                    console.log("No changes in session logs to commit.");
                }
            } catch (gitError) {
                console.error(`Error during Git sync: ${gitError.message}`);
            }
        }

        console.log(`Success: Logged "${title}" with simplified next steps.`);
    } catch (error) {
        console.error(`Error logging session: ${error.message}`);
        process.exit(1);
    } finally {
        releaseLock(lockPath);
    }
}

const args = process.argv.slice(2);
if (args.length < 3) {
    console.log('Usage: node log_session.cjs "<title>" "<summary>" "<nextSteps>" ["<plan>"] ["<outcome>"]');
    process.exit(1);
}

logSession(args[0], args[1], args[2], args[3], args[4]);
