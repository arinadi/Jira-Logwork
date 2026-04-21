# PRD: Jira Worklog CSV Uploader (Elite Blueprint)

## Phase 0: Project Context

* **Project Type**: Greenfield
* **Project Mode**: `web-app` (Vite + React)
* **Existing Assets**: `swagger-jira-worklog.json` (Jira REST API Reference)
* **Constraints**: 
    - Full static (no backend).
    - Hosted locally or on static hosting (GitHub Pages/Vite).
    - Must handle CORS limitations.
* **Target Users**: Consultants, developers, and team leads at Gameloft using `gameloft.atlassian.net` who track time in Excel/CSV and find the native Jira bulk import too clunky.

---

## The Story (The Pain)
Logging work shouldn't feel like work. Jira's native "External System Import" is high-friction: it requires admin rights, has a convoluted mapping wizard, and fails silently on many formatting errors. Users spend more time debugging CSVs than actual work. 

The **Jira Worklog CSV Uploader** eliminates this anxiety by providing a fast, transparent, and interactive environment to preview and fix data before it ever touches Jira.

---

## Competitive Edge
- **A little bit different > a little bit better**: Unlike other tools that just "upload," this tool is a **Worklog IDE**. It provides a real-time, spreadsheet-like interface for fixing errors (missing keys, overlapping times) in the browser.
- **Zero-Trust Privacy**: No backend, no server-side storage. Your Jira API tokens and worklogs stay in your browser.

---

## Core Features (Elite & Simple)
1. **[UPDATED] Unified Validation Grid**: A single powerful spreadsheet interface where you edit data, see real-time 8h/day capacity alerts, and trigger syncs.
2. **Smart Header Mapper**: Drag & drop any CSV; headers like `Issue ID` and `Time` are detected automatically.
3. **[UPDATED] Multi-Mode Sync Controller**: Individual "Sync" buttons per row + "Sync All" bulk action with error-retry capabilities.
4. **[UPDATED] Daily Capacity Panel**: A clean sidebar or overlay showing total hours per day (8h target) to ensure your timesheet is complete before syncing.

---

## Base Features (CRUD)
- **C** (Create): Bulk create worklogs on Jira Issues.
- **R** (Read): Parse and display CSV data.
- **U** (Update): Edit parsed CSV data in the browser.
- **D** (Delete): Remove rows from the upload queue.

---

## User Flow
1. **Connect**: User enters Jira Domain and Auth details (OAuth or Token). App verifies connectivity.
2. **Import**: User drops a CSV file.
3. **Map**: App auto-maps columns; user confirms or adjusts.
4. **Refine**: User edits any highlighted errors in the interactive grid.
5. **Sync**: User clicks "Upload". App processes rows and displays success/error badges.
6. **Summary**: User views a final report and downloads a log of any failures.

---

## Non-Functional Requirements
- **Performance**: Instant parsing of up to 5,000 rows.
- **Security**: OAuth 2.0 (3LO) support. All secrets stored in `localStorage` with encryption (at-rest browser level).
- **Accessibility**: WCAG 2.1 AA compliant UI.
- **Reliability**: Fail-safe batching (one failure does not stop the queue).

---

## Success Criteria
- **90%** auto-detection rate for standard CSV headers.
- **< 2 seconds** from CSV drop to data display.
- **Zero** data sent to external servers other than Atlassian.
