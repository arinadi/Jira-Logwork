🚀 **Jira Logwork** — Stop doing double work. Focus on your tickets — comment, update status, move things forward — and let the tool turn that activity into worklogs automatically. Runs as a Chrome extension — no server, no Node.js needed to use it.

**The Problem:** You already work hard on your Jira tickets. But at the end of the day, you still have to manually log hours — re-typing what you already did. That's double work. That's wasted time.

**The Solution:** This tool scans your *actual Jira activity* — status changes, comments, worklogs — and generates time entries for you. The more active you are on your tickets, the better your worklogs become. **Zero extra effort.**

### ✨ Key Features

- 🧠 **Smart Fetch Engine** — Scans your Jira issue history (status changes, comments, existing worklogs) and auto-generates time entries. Detects activity across all three data sources per issue.
- 🔁 **Intelligent Duplicate Prevention** — Cross-references existing Jira worklogs before generating new ones. Already-logged entries are marked as "synced" and locked from re-upload.
- ⏱️ **Auto Time Distribution** — Splits the hours still free in your daily target (default 8h, minus what you already logged that day) across the new tickets with activity on that day. 3 new tickets on an empty Monday? 2h 40m each, summing to exactly 8h.
- 💬 **Comment-First Logging** — Uses your own Jira comment from that day as the worklog description. Falls back to your status transitions that day, then the issue summary. Never uses someone else's comment.
- 📅 **Calendar-Aware Performance Tracker** — Shows all dates in your work range with:
  - 🏛 **Public holiday detection** — Indonesia uses [libur.deno.dev](https://libur.deno.dev) (24 entries including Idul Fitri, Nyepi, Imlek, Idul Adha). Other countries use [Nager.at](https://date.nager.at) API.
  - 📆 **Weekend highlighting** — Saturday/Sunday are dimmed with badges.
  - 🟢 **Today indicator** — Current date highlighted with animated chip.
  - 💜 **Overtime detection** — Work logged on holidays/weekends shown with violet bar.
  - ⚠️ **Gap detection** — Hover over empty working days to see "No worklogs" hints.
- 📦 **CSV Bulk Upload** — Import from any spreadsheet with intelligent fuzzy column mapping.
- 🔒 **Zero-Trust Security** — No API token at all: the extension uses the Jira login you already have in Chrome. Calls go straight from your browser to your `*.atlassian.net` site; there is no proxy. A token saved by an older version is deleted on start.
- 🌗 **Dark Mode** — Full Atlassian-inspired design with seamless light/dark transitions.

### 🔄 How It Works

1. **Connect** — Log in to Jira in Chrome, then enter your Jira domain (`<site>.atlassian.net`). Only the domain is stored.
2. **Fetch** — Write a JQL query, pick a date range. The Smart Fetch engine scans changelog, comments, and existing worklogs for each issue.
3. **Review** — Edit generated entries in the spreadsheet grid. Watch the Performance tracker fill in real-time.
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
  └── Plus every issue where you logged work in the range (so the day total sees all your worklogs)

For each issue (every page of changelog, comments and worklogs is read):
  ├── Changelog → your status transitions in the range
  ├── Comments  → your own comment per day in the range
  ├── Worklogs  → your worklogs in the range (startedAfter/startedBefore)
  └── One entry per issue per active day

Then, per day:
  ├── Issue already has your worklog → "synced" row with the REAL logged time (locked)
  ├── Free time = daily target − all your logged time that day (on any issue)
  ├── Free time split over the new tickets in minutes; the parts sum exactly to the free time
  └── No free time left → no new rows; the day is listed as "full" in the scan result

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
- **`jiraFetcher`**: The Smart Fetch engine. Paginates through JQL results, changelogs, comments, and existing worklogs per issue. Performs unified activity detection across all three data sources, then splits each day's free time (target minus already logged) over the new tickets.
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
