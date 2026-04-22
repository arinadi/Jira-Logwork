🚀 **Zero-Trust Jira Worklog IDE** — The ultimate productivity companion for high-performance teams using Atlassian Jira. Stop wasting hours on manual time tracking and start syncing in seconds.

**Experience the Future of Jira Logging.**
Say goodbye to the clunky native Jira worklog interface. Our **Worklog IDE** provides a premium, spreadsheet-like experience that turns hours of data entry into a few clicks. Whether you're importing a CSV from a local tracker or auto-generating logs from your issue history, this is the tool you've been waiting for.

- 📦 **Jira Bulk Worklog Upload**: Import thousands of rows from any CSV file with our intelligent fuzzy-mapping engine.
- 🕵️ **Jira History Scrapper**: Automatically generate worklogs by scanning issue status changes. No more manual memory recalls!
- 🔒 **Zero-Trust Security**: Your Jira API Tokens and credentials stay 100% in your browser's local storage. We never see your data.
- ⛽ **High-Performance Grid**: Edit your worklogs in a lightning-fast spreadsheet interface with real-time Jira validation.
- 🔋 **Daily Capacity Tracker**: Visual indicators ensure you reach your 8.0-hour daily target with precision.
- 🌙 **Elite Aesthetics**: Atlassian-inspired design with full Dark Mode support for late-night coding sessions.

**How to Scale Your Productivity:**
1. **Connect**: Enter your Jira domain and Personal Access Token (PAT) securely.
2. **Import**: Drag & Drop your CSV or use the **"Fetch From Jira"** scrapper to auto-populate.
3. **Refine**: Edit your logs directly in the grid. Watch the **Capacity Tracker** update in real-time.
4. **Sync**: Click "Sync All Valid" and watch the **Batch Engine** handle the API heavy lifting for you.

---

# Technical Documentation

### 🛠️ Architecture & Tech Stack
This application is built as a high-performance, stateless static web app using:
- **Core**: React 19 (TypeScript) + Vite
- **Styling**: Tailwind CSS 4.0 (Custom Atlassian Color Tokens)
- **Data Engine**: PapaParse (Streaming CSV processing)
- **State Management**: React Context API for Zero-Trust credentials
- **Icons**: Lucide React for consistent visual language

### ⚙️ Core Logic Modules
- **`jiraService`**: Handles paginated REST API v3 calls, including ADF (Atlassian Document Format) payload transformation.
- **`useSync`**: Orchestrates sequential batch uploads with a mandatory **5-second cooldown** between requests to prevent Jira API rate limiting (429 errors).
- **`jiraFetcher`**: A recursive history scrapper that paginates through JQL search results and issue changelogs to detect status events.
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
