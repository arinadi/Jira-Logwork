# Module 4: Sync Controller

- **Estimated Complexity**: M (~5 files)
- **Estimated Files**: `src/hooks/useSync.ts`, `src/utils/adfConverter.ts`, `src/components/SyncProgress.tsx`
- **Key Risks**: Jira API rate limits, large batches failing halfway.

## Requirements
The engine that pushes the refined data to the Jira REST API.

## Technical Implementation
- **ADF Converter**: Transform plain comments into Atlassian Document Format JSON.
- **[UPDATED] Dual-Mode Sync Engine**:
    - **Single-Row Mode**: Sends a direct request for a specific row ID when the "Sync Row" button is clicked.
    - **Batch Mode**: Sequentially processes all pending rows with group batching (e.g., 5 at a time).
    - Handle 429 (Too Many Requests) with exponential backoff.
- **State Updates**: Update the `status` of each row in the Grid UI (`pending` -> `syncing` -> `success` / `error`).

## Testing
- [ ] Clicking "Sync" starts the API sequence.
- [ ] Progress bar updates correctly.
- [ ] Failed rows show the specific error message from Jira.
- [ ] Successfully synced rows cannot be synced again (disabled).
