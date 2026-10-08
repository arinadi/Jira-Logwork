🚀 **Jira Logwork** — Stop doing double work. Focus on your tickets — comment, update status, move things forward — and let the tool turn that activity into worklogs automatically. [**jira-logwork.vercel.app**](https://jira-logwork.vercel.app)

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
- 🔒 **Zero-Trust Security** — Credentials stored 100% in browser localStorage. Nothing leaves your machine.
- 🌗 **Dark Mode** — Full Atlassian-inspired design with seamless light/dark transitions.

### 🔄 How It Works

1. **Connect** — Enter your Jira domain + Personal Access Token (PAT). Stored locally.
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
This application is built as a high-performance, stateless static web app using:
- **Core**: React 19 (TypeScript) + Vite
- **Styling**: Tailwind CSS 4.0 (Custom Atlassian Color Tokens)
- **Data Engine**: PapaParse (Streaming CSV processing)
- **State Management**: React Context API for Zero-Trust credentials
- **Icons**: Lucide React for consistent visual language
- **Holiday APIs**: [libur.deno.dev](https://libur.deno.dev) (Indonesia) + [Nager.at](https://date.nager.at) (100+ countries) with localStorage cache (24h TTL)

### ⚙️ Core Logic Modules
- **`jiraService`**: Handles paginated REST API v3 calls, including ADF (Atlassian Document Format) payload transformation.
- **`useSync`**: Orchestrates sequential batch uploads with a mandatory **1-second cooldown** between requests to prevent Jira API rate limiting (429 errors).
- **`jiraFetcher`**: The Smart Fetch engine. Paginates through JQL results, changelogs, comments, and existing worklogs per issue. Performs unified activity detection across all three data sources, then splits each day's free time (target minus already logged) over the new tickets.
- **`holidayService`**: Dual-source holiday provider. Routes Indonesia (ID) to libur.deno.dev for complete data (Idul Fitri, Nyepi, Imlek, etc.). All other countries use Nager.at API. Both cached in localStorage for 24h.
- **`validationEngine`**: Performs real-time regex and date-math checks to ensure 100% Jira compatibility before any API call.

### 🚀 Getting Started
```bash
# Install dependencies
npm install

# Start the development server (with Vite Proxy for CORS)
npm run dev

# Build for production (optimized chunks)
npm run build
```

---
*Note: This tool is designed to work as a "Bridge" interface between your local data and the Jira Cloud API. All credential persistence is handled via standard Browser LocalStorage.*
