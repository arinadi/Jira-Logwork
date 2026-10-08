🚀 **Jira Logwork** — Stop doing double work. Focus on your tickets — comment, update status, move things forward — and let the tool turn that activity into worklogs automatically. Runs as a Chrome extension — no server, no Node.js needed to use it.

**The Problem:** You already work hard on your Jira tickets. But at the end of the day, you still have to manually log hours — re-typing what you already did. That's double work. That's wasted time.

**The Solution:** This tool scans your *actual Jira activity* — status changes, comments, worklogs — and generates time entries for you. The more active you are on your tickets, the better your worklogs become. **Zero extra effort.**

### ✨ Key Features

- 🧠 **Smart Fetch Engine** — Scans your Jira issue history (status changes, comments, existing worklogs) and auto-generates time entries. Detects activity across all three data sources per issue.
- 🔁 **Intelligent Duplicate Prevention** — Cross-references existing Jira worklogs before generating new ones. Already-logged entries are marked as "synced" and locked from re-upload.
- ⏱️ **Auto Time Distribution** — Splits the hours still free in your daily target (default 8h, minus what you already logged that day) across the new tickets with activity on that day. 3 new tickets on an empty Monday? 2h 40m each, summing to exactly 8h.
- 💬 **Comment-First Logging** — Uses your own Jira comment from that day as the worklog description. Falls back to your status transitions that day, then the issue summary. Never uses someone else's comment.
- 📅 **Day-Grouped Workspace** — Rows are grouped per calendar day, from the first to the last row date (empty working days included). Each day header shows `logged / target` and its state:
  - ✅ **Met** — exactly the daily target. ⚠️ **Under** — shows the minutes missing. 🔴 **Over** — more than the target.
  - 🏛 **Off** — weekend or public holiday; any work logged there counts as overtime. Indonesia uses [libur.deno.dev](https://libur.deno.dev) (Idul Fitri, Nyepi, Imlek, Idul Adha, …), other countries [Nager.at](https://date.nager.at).
  - 🟢 **Today** — today's group is marked.
  - A summary bar on top shows logged vs. target × working days for the whole range.
- 🧩 **Allowed Components** — In Settings, list the Jira components you may log on (e.g. `DES-Systems, Anoman`; empty = all, case-insensitive). The scan makes new rows only for issues with one of them and lists the others as "outside allowed components"; Sync reads the issue's components first and refuses a row on any other issue, so nothing wrong reaches Jira. Time already logged elsewhere still counts toward the day.
- 🕳️ **Empty Days Filled as Suggestions** — A working day with no ticket activity gets *Suggested* rows: first the tickets that were assigned to you and in a working status that day, else the tickets of the nearest earlier active day (up to 5 working days). Suggested rows are never part of a batch sync until you accept them.
- 🏖️ **Leave from HRMS** — Each scan reads your approved, not-cancelled leave from Gameloft HRMS (`hrms.gameloft.org`, with your HRMS login; toggle in Settings). A full leave day gets no rows and is not "missing"; a partial day lowers that day's target (8h − 4h half day). Only dates, times, type and status are used — nothing else from HRMS is kept. If HRMS cannot be read, the scan continues and warns you.
- 🎯 **Daily Target Setting** — One target (default `8h`) in Settings, used by the scan, the day headers and the summary.
- 📋 **Copy Row to Days** — Copy a row to several chosen days; days where that issue already has a row are skipped.
- 💾 **Nothing Lost on Reload** — The workspace is saved in this browser on every change and restored on open. A row that was mid-sync at reload comes back as failed with "check Jira before retry", because it may already be posted.
- 📦 **CSV Bulk Upload** — Import from any spreadsheet with intelligent fuzzy column mapping.
- 🔒 **Zero-Trust Security** — No API token at all: the extension uses the Jira login you already have in Chrome. Calls go straight from your browser to your `*.atlassian.net` site; there is no proxy. A token saved by an older version is deleted on start.
- 🌗 **Dark Mode** — Compact Atlassian-style light/dark theme; your choice is remembered (default: system setting).
- ♿ **Accessible** — Every icon button is labelled, everything works by keyboard, focus is always visible, zoom is allowed, and reduced motion is respected.

### 🔄 How It Works

1. **Connect** — Log in to Jira in Chrome, then enter your Jira domain (`<site>.atlassian.net`). Only the domain is stored.
2. **Fetch** — Pick a preset (This week / Last week / This month, weeks start Monday) or dates; the JQL is under *Advanced*. The Smart Fetch engine scans changelog, comments, and existing worklogs for each issue.
3. **Review** — Edit rows inside their day group and watch each day header move to its target.
4. **Sync** — Hit "Batch Sync". The engine uploads sequentially with rate-limit protection.

### 🧠 Smart Fetch: How Activity Becomes Worklogs

```
Who is "you": your accountId from /rest/api/3/myself (not your display name).

Find issues:
  ├── Your JQL, paged with nextPageToken until isLast
  │     default: worklogAuthor = currentUser() AND worklogDate >= start AND worklogDate <= end
  │              OR status CHANGED BY currentUser() DURING (start, end + 1 day)
  │              OR watcher = currentUser() AND updated >= start
  │     (commenting makes you a watcher by default; Jira Cloud has no "commented by" clause)
  ├── Plus every issue where you logged work in the range (so the day total sees all your worklogs)
  └── With allowed components set, the activity part of the default JQL adds `AND component in (...)`;
      the code still drops new rows on any issue without an allowed component (also for an edited JQL)

Status changes of ALL found issues in one go:
  └── POST /changelog/bulkfetch (up to 1000 issues per call, status field only) → your transitions in the range
        (its dates may come as ISO text or as epoch milliseconds; both are read)

For each issue, 5 issues at a time (every page of comments and worklogs is read):
  ├── Comments  → your own comment per day in the range
  ├── Worklogs  → your worklogs in the range (startedAfter/startedBefore)
  └── One entry per issue per active day

Rate limits: no fixed waiting between calls. When Jira answers 429, the call waits Retry-After
seconds (2s, 4s, 8s, 16s if Jira gives none) and retries up to 4 times; then the issue is listed as failed.

Then, per day:
  ├── Issue already has your worklog → "synced" row with the REAL logged time (locked)
  ├── Free time = daily target − all your logged time that day (on any issue)
  ├── Free time split over the new tickets in minutes; the parts sum exactly to the free time
  └── No free time left → no new rows; the day is listed as "full" in the scan result

Leave (HRMS, Settings "Read leave from HRMS", default on):
  ├── POST https://hrms.gameloft.org/ID/leave-record/ajax-get-my-requests (all pages), your HRMS login
  ├── Counts records with status Approved and no cancellation date, any leave type
  ├── Each weekday from from_date to to_date: first day from from_time, last day until to_time, others
  │   08:00–17:00; minus the 12:00–13:00 lunch when covered; at most 8h
  └── That day's target = daily target − leave; full leave → no rows, no suggestions, shown as "Leave"

Empty working days (inside the range, not weekend/holiday/full leave, no row at all):
  ├── 1. In progress: tickets that at some moment that day were assigned to you AND in a working status
  │      (Settings "Working statuses"; empty = Jira's In Progress category, so "Pending Customer
  │      Confirmation", "QUEUED", "On Hold" do not count). Found with
  │      `assignee WAS currentUser() DURING (start, end + 1 day)` + bulk status/assignee history.
  │      → target split over them, "Suggested · in progress", text "In progress: <summary>"
  ├── 2. Else carry-over: the tickets of the nearest earlier day in the range that has rows, for at most
  │      5 working days after it → "Suggested · carried over", text "Continued: <that day's text>"
  └── 3. Else the day stays empty
  Allowed components apply to suggestions too. Batch Sync skips Suggested rows; "Accept suggestions"
  on the day (or editing a row) turns them into normal rows.

Text of a new row: your comment that day → your transitions that day → issue summary.
Issues that fail to load are listed in the scan result; the rest is still returned.
Date range defaults use your local date when the dialog opens.
Fetching again replaces unsynced rows with the same issue + day instead of adding duplicates.
```

**The motivation is simple:** Be active on your Jira tickets — comment on blockers, move status, discuss with your team — and the IDE will handle the logwork for you. No more double work.

---

# Technical Documentation

### 🛠️ Architecture & Tech Stack
This application is a Chrome extension (Manifest V3) built as a static web app using:
- **Core**: React 19 (TypeScript) + Vite
- **Styling**: Tailwind CSS 4.0 (Custom Atlassian Color Tokens)
- **Data Engine**: PapaParse (Streaming CSV processing)
- **State Management**: React Context API for Zero-Trust credentials
- **Icons**: Lucide React for consistent visual language
- **Holiday APIs**: [libur.deno.dev](https://libur.deno.dev) (Indonesia) + [Nager.at](https://date.nager.at) (100+ countries) with localStorage cache (24h TTL)

### ⚙️ Core Logic Modules
- **`jiraService`**: Calls Jira REST API v3 directly at `https://<domain>` with the browser's Jira session (`credentials: 'include'` + `X-Atlassian-Token: no-check`), no Authorization header. Accepts only `*.atlassian.net` domains, the sites the extension has host permission for. Includes ADF (Atlassian Document Format) payload transformation.
- **`useSync`**: Orchestrates sequential batch uploads with a mandatory **1-second cooldown** between requests to prevent Jira API rate limiting (429 errors).
- **`jiraFetcher`**: The Smart Fetch engine. Paginates through JQL results, changelogs, comments, and existing worklogs per issue. Reads all status changes with one bulk changelog call, comments and worklogs for 5 issues at a time (429 → Retry-After retry, no fixed delays), performs unified activity detection across all three data sources, then splits each day's free time (target minus already logged) over the new tickets.
- **`holidayService`**: Dual-source holiday provider. Routes Indonesia (ID) to libur.deno.dev for complete data (Idul Fitri, Nyepi, Imlek, etc.). All other countries use Nager.at API. Both cached in localStorage for 24h.
- **`validationEngine`**: Performs real-time regex and date-math checks to ensure 100% Jira compatibility before any API call.

### 🚀 Getting Started
**Use it (no Node.js):**
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose the `extension/` folder of this repo.
3. Log in to your Jira site in the same Chrome profile, click the extension icon, and enter your domain.

Jira Cloud sends no CORS headers, so a plain web page or a local `index.html` cannot call it; the extension's host permission for `https://*.atlassian.net/*` is what makes the calls possible.

**Change it (needs Node.js):**
```bash
npm install
npm test                    # Vitest
npm run build -- --watch    # rebuilds extension/; then click "Reload" on the extension in chrome://extensions
```
`npm run build` writes the ready-to-load extension to `extension/`, which is committed so users need no build step.

---
*Note: This tool is a "Bridge" between your local data and the Jira Cloud API. It stores no credentials: only your Jira domain and preferences, in the extension's localStorage.*
