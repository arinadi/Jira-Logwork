# Module 3: Interactive Worklog Grid

- **Estimated Complexity**: M (~8 files)
- **Estimated Files**: `src/components/DataGrid/DataGrid.tsx`, `src/components/DataGrid/Cell.tsx`, `src/components/DataGrid/Row.tsx`
- **Key Risks**: UI lag with 1000+ rows, complexity of double-click editing.

## Requirements
A high-performance spreadsheet UI for reviewing and editing worklog rows.

## UI Structure
- Tabular layout with sticky headers.
- **Visual Feedback**:
    - Red outline for rows with missing Issue Keys.
    - Orange outline for invalid date formats.
- **[UPDATED] Row Actions**:
    - "Sync Row" button (individual request).
    - "Delete Row" button.
    - "Clear All" button.

## Technical Implementation
- Managed state for the parsed data array.
- **[UPDATED] Daily Capacity Monitor**: An internal logic that computes the total hours per day in real-time. Highlights days in the grid that do not meet or exceed the 8-hour target.
- Implement cell-level editing with Focus/Blur management.
- Real-time validation using regex (for Key) and `date-fns` (for Date).

## Testing
- [ ] User can edit any cell.
- [ ] Edits persist in local state.
- [ ] Validation errors update instantly when cell content changes.
